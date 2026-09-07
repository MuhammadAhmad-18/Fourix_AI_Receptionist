import { z } from "zod";
import { extendZodWithOpenApi, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ── Shared envelope ─────────────────────────────────────────────────────
const ErrorSchema = registry.register(
  "Error",
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string().openapi({ example: "APPOINTMENT_CONFLICT" }),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  }),
);

function envelope<T extends z.ZodTypeAny>(name: string, data: T) {
  return registry.register(
    name,
    z.object({ success: z.literal(true), data, meta: z.record(z.string(), z.unknown()).optional() }),
  );
}

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  description:
    "API key for machine clients (the Phase 2 AI receptionist). Present as `Authorization: Bearer <key>`. Human dashboard sessions instead authenticate via an HTTP-only session cookie set by /api/auth.",
});

// ── Domain schemas (wire contract — a hand-maintained mirror of each\n// module's Zod schema, kept simple for OpenAPI generation) ───────────────
const Patient = registry.register(
  "Patient",
  z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]),
    dateOfBirth: z.string().nullable(),
    phoneRaw: z.string().nullable(),
    phoneE164: z.string().nullable().openapi({ example: "+923001234567" }),
    email: z.string().nullable(),
    addressLine1: z.string().nullable(),
    city: z.string().nullable(),
    source: z.enum(["REFERRAL", "WALK_IN", "WEBSITE", "WHATSAPP", "INSTAGRAM", "MESSENGER", "PHONE", "AI_AGENT", "OTHER"]),
    referredBy: z.string().nullable(),
    notes: z.string().nullable(),
    active: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);

const CreatePatientBody = z.object({
  firstName: z.string(),
  lastName: z.string(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]).optional(),
  phone: z.string().optional().openapi({ example: "03001234567", description: "Any format; normalized to E.164 server-side" }),
  email: z.string().optional(),
  source: z.enum(["REFERRAL", "WALK_IN", "WEBSITE", "WHATSAPP", "INSTAGRAM", "MESSENGER", "PHONE", "AI_AGENT", "OTHER"]).optional(),
});

const Service = registry.register(
  "Service",
  z.object({
    id: z.string(),
    name: z.string(),
    durationMinutes: z.number(),
    price: z.number(),
    active: z.boolean(),
    requiresConsultation: z.boolean(),
    requiresConsent: z.boolean(),
  }),
);

const Practitioner = registry.register(
  "Practitioner",
  z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    title: z.string().nullable(),
    specialties: z.array(z.string()),
    active: z.boolean(),
  }),
);

const Appointment = registry.register(
  "Appointment",
  z.object({
    id: z.string(),
    patientId: z.string(),
    practitionerId: z.string(),
    serviceId: z.string(),
    startTime: z.string().openapi({ example: "2026-09-09T10:00:00+05:00", description: "ISO-8601 with explicit UTC offset" }),
    endTime: z.string(),
    status: z.enum(["REQUESTED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]),
    source: z.enum(["DASHBOARD", "PHONE", "WALK_IN", "WEBSITE", "WHATSAPP", "INSTAGRAM", "MESSENGER", "AI_AGENT"]),
  }),
);

const CreateAppointmentBody = z.object({
  patientId: z.string(),
  serviceId: z.string(),
  practitionerId: z.string(),
  startTime: z.string().openapi({ example: "2026-09-09T10:00:00+05:00" }),
  source: z.enum(["DASHBOARD", "PHONE", "WALK_IN", "WEBSITE", "WHATSAPP", "INSTAGRAM", "MESSENGER", "AI_AGENT"]).optional(),
});

const AvailabilitySlot = z.object({ start: z.string(), end: z.string() });

const idempotencyHeader = z.object({
  "Idempotency-Key": z
    .string()
    .optional()
    .openapi({ description: "Same key + same payload replays the stored result instead of creating a duplicate." }),
});

// ── Paths ────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/v1/patients",
  summary: "Search patients",
  tags: ["Patients"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({ q: z.string().optional(), phone: z.string().optional(), email: z.string().optional() }),
  },
  responses: {
    200: { description: "Matching patients", content: { "application/json": { schema: envelope("PatientList", z.array(Patient)) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/patients",
  summary: "Create a patient",
  tags: ["Patients"],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { "application/json": { schema: CreatePatientBody } } }, headers: idempotencyHeader },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: envelope("PatientCreated", Patient) } } },
    409: { description: "Patient/idempotency conflict", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/patients/{id}",
  summary: "Get a patient",
  tags: ["Patients"],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Patient", content: { "application/json": { schema: envelope("PatientGet", Patient) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/services",
  summary: "List services",
  tags: ["Services"],
  security: [{ [bearerAuth.name]: [] }],
  request: { query: z.object({ activeOnly: z.enum(["true", "false"]).optional() }) },
  responses: {
    200: { description: "Services", content: { "application/json": { schema: envelope("ServiceList", z.array(Service)) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/practitioners",
  summary: "List practitioners",
  tags: ["Practitioners"],
  security: [{ [bearerAuth.name]: [] }],
  request: { query: z.object({ serviceId: z.string().optional() }) },
  responses: {
    200: { description: "Practitioners", content: { "application/json": { schema: envelope("PractitionerList", z.array(Practitioner)) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/appointments/availability",
  summary: "Check whether a specific slot is available",
  tags: ["Appointments"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({ practitionerId: z.string(), serviceId: z.string(), startTime: z.string() }),
  },
  responses: {
    200: {
      description: "Availability result",
      content: { "application/json": { schema: envelope("Availability", z.object({ available: z.boolean() })) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/appointments/slots",
  summary: "Get bookable slots for a practitioner/service/date",
  tags: ["Appointments"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({ practitionerId: z.string(), serviceId: z.string(), date: z.string().openapi({ example: "2026-09-09" }) }),
  },
  responses: {
    200: {
      description: "Available slots",
      content: { "application/json": { schema: envelope("Slots", z.object({ slots: z.array(AvailabilitySlot) })) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/appointments",
  summary: "Book an appointment",
  description:
    "The backend is the sole authority for booking: availability is re-checked inside a transaction guarded by a per-practitioner-day advisory lock, and a database exclusion constraint makes a true double-booking structurally impossible even if this check is bypassed.",
  tags: ["Appointments"],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { "application/json": { schema: CreateAppointmentBody } } }, headers: idempotencyHeader },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: envelope("AppointmentCreated", Appointment) } } },
    409: { description: "Slot no longer available", content: { "application/json": { schema: ErrorSchema } } },
    422: { description: "Invalid appointment time", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/appointments/{id}",
  summary: "Get an appointment",
  tags: ["Appointments"],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Appointment", content: { "application/json": { schema: envelope("AppointmentGet", Appointment) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/appointments/{id}/reschedule",
  summary: "Reschedule an appointment",
  tags: ["Appointments"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.object({ startTime: z.string() }) } } },
  },
  responses: {
    200: { description: "Rescheduled", content: { "application/json": { schema: envelope("AppointmentRescheduled", Appointment) } } },
    409: { description: "New slot unavailable", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/appointments/{id}/cancel",
  summary: "Cancel an appointment",
  tags: ["Appointments"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.object({ reason: z.string().optional() }) } } },
  },
  responses: {
    200: { description: "Cancelled", content: { "application/json": { schema: envelope("AppointmentCancelled", Appointment) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/patients/{id}/balance",
  summary: "Get a patient's outstanding balance across all invoices",
  tags: ["Finance"],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Balance",
      content: { "application/json": { schema: envelope("PatientBalance", z.object({ patientId: z.string(), balance: z.number() })) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/packages/{id}/balance",
  summary: "Get remaining sessions on a package",
  tags: ["Packages"],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Balance",
      content: {
        "application/json": {
          schema: envelope("PackageBalance", z.object({ packageId: z.string(), remainingSessions: z.number() })),
        },
      },
    },
  },
});
