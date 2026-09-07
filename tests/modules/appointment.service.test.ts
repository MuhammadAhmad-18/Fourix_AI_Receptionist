import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/reset-db";
import { appointmentService } from "@/modules/appointments/appointment.service";
import { ActorContext } from "@/lib/auth/types";
import { Channel } from "@prisma/client";

let ctx: ActorContext;
let practitionerId: string;
let serviceId: string;
let patientAId: string;
let patientBId: string;

// A Wednesday (2026-09-09 is a Wednesday). Clinic open Mon-Sat 09:00-18:00,
// practitioner scheduled the same hours, so this slot is free before booking.
const SLOT_START = "2026-09-09T10:00:00+05:00";

beforeEach(async () => {
  await resetDb();

  const clinic = await prisma.clinic.create({ data: { name: "Test Clinic", timezone: "Asia/Karachi" } });
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    await prisma.businessHours.create({
      data: { clinicId: clinic.id, dayOfWeek, openTime: "09:00", closeTime: "18:00", isClosed: dayOfWeek === 0 },
    });
  }

  const employee = await prisma.employee.create({
    data: { clinicId: clinic.id, firstName: "Dr", lastName: "Smith", role: "PRACTITIONER" },
  });
  const practitioner = await prisma.practitioner.create({
    data: { clinicId: clinic.id, employeeId: employee.id },
  });
  practitionerId = practitioner.id;
  for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
    await prisma.practitionerSchedule.create({
      data: { practitionerId: practitioner.id, dayOfWeek, startTime: "09:00", endTime: "18:00" },
    });
  }

  const service = await prisma.service.create({
    data: { clinicId: clinic.id, name: "Hydrafacial", durationMinutes: 60, price: 5000 },
  });
  serviceId = service.id;

  const patientA = await prisma.patient.create({ data: { clinicId: clinic.id, firstName: "A", lastName: "One" } });
  const patientB = await prisma.patient.create({ data: { clinicId: clinic.id, firstName: "B", lastName: "Two" } });
  patientAId = patientA.id;
  patientBId = patientB.id;

  ctx = { actorId: null, actorType: "SYSTEM", clinicId: clinic.id, source: Channel.DASHBOARD, permissions: ["*"] };
});

describe("appointmentService concurrency", () => {
  it("two concurrent createAppointment calls for the same slot: exactly one succeeds", async () => {
    const results = await Promise.allSettled([
      appointmentService.createAppointment(ctx, {
        patientId: patientAId,
        serviceId,
        practitionerId,
        startTime: SLOT_START,
        source: "DASHBOARD",
      }),
      appointmentService.createAppointment(ctx, {
        patientId: patientBId,
        serviceId,
        practitionerId,
        startTime: SLOT_START,
        source: "DASHBOARD",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ code: "APPOINTMENT_CONFLICT" });

    const count = await prisma.appointment.count({ where: { practitionerId } });
    expect(count).toBe(1);
  });
});

describe("appointmentService idempotency", () => {
  it("repeated createAppointment with the same Idempotency-Key creates one row", async () => {
    const input = {
      patientId: patientAId,
      serviceId,
      practitionerId,
      startTime: SLOT_START,
      source: "DASHBOARD" as const,
      idempotencyKey: "appt-key-1",
    };

    const first = await appointmentService.createAppointment(ctx, input);
    const second = await appointmentService.createAppointment(ctx, input);

    expect(second.id).toBe(first.id);
    const count = await prisma.appointment.count({ where: { practitionerId } });
    expect(count).toBe(1);
  });
});

describe("appointmentService availability", () => {
  it("reports the slot unavailable after booking, and available slots exclude it", async () => {
    await appointmentService.createAppointment(ctx, {
      patientId: patientAId,
      serviceId,
      practitionerId,
      startTime: SLOT_START,
      source: "DASHBOARD",
    });

    const available = await appointmentService.checkAvailability(ctx, {
      practitionerId,
      serviceId,
      startTime: SLOT_START,
    });
    expect(available).toBe(false);

    const { available: nextHourAvailable } = {
      available: await appointmentService.checkAvailability(ctx, {
        practitionerId,
        serviceId,
        startTime: "2026-09-09T11:00:00+05:00",
      }),
    };
    expect(nextHourAvailable).toBe(true);

    const slots = await appointmentService.getAvailableSlots(ctx, {
      practitionerId,
      serviceId,
      date: "2026-09-09",
    });
    expect(slots.some((s) => s.start === new Date(SLOT_START).toISOString())).toBe(false);
  });

  it("rejects a naive datetime with no UTC offset", async () => {
    await expect(
      appointmentService.checkAvailability(ctx, {
        practitionerId,
        serviceId,
        startTime: "2026-09-09T10:00:00",
      }),
    ).rejects.toMatchObject({ code: "INVALID_APPOINTMENT_TIME" });
  });
});

describe("appointmentService status lifecycle", () => {
  it("enforces the allowed status transition graph", async () => {
    const appt = await appointmentService.createAppointment(ctx, {
      patientId: patientAId,
      serviceId,
      practitionerId,
      startTime: SLOT_START,
      source: "DASHBOARD",
    });

    await expect(appointmentService.completeAppointment(ctx, appt.id)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    await appointmentService.confirmAppointment(ctx, appt.id);
    await appointmentService.checkInAppointment(ctx, appt.id);
    await appointmentService.startTreatment(ctx, appt.id);
    const completed = await appointmentService.completeAppointment(ctx, appt.id);
    expect(completed.status).toBe("COMPLETED");
  });
});
