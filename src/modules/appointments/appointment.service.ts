import { Prisma, AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { writeAuditLog } from "@/lib/audit";
import { writeOutboxEvent } from "@/lib/events/outbox";
import { eventBus } from "@/lib/events/bus";
import { withIdempotency } from "@/lib/idempotency";
import { parseStrictIso } from "@/lib/tz";
import { clinicRepository } from "@/modules/clinic/clinic.repository";
import { patientRepository } from "@/modules/patients/patient.repository";
import { practitionerRepository } from "@/modules/practitioners/practitioner.repository";
import { serviceRepository } from "@/modules/services/service.repository";
import { appointmentRepository } from "@/modules/appointments/appointment.repository";
import {
  computeFreeWindows,
  isSlotAvailable,
  localDateFromUtc,
  sliceSlots,
} from "@/modules/appointments/availability";
import {
  AppointmentOutput,
  CheckAvailabilityInput,
  CreateAppointmentInput,
  GetAvailableSlotsInput,
  toAppointmentOutput,
} from "@/modules/appointments/appointment.schema";

function isExclusionViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const raw = JSON.stringify(err.meta ?? {});
    return err.message.includes("23P01") || raw.includes("23P01") || err.message.includes("no_overlap");
  }
  if (err instanceof Error) {
    return err.message.includes("23P01") || err.message.includes("no_overlap") || err.message.includes("ExclusionViolation");
  }
  return false;
}

async function assertActiveEntities(clinicId: string, patientId: string, serviceId: string, practitionerId: string) {
  const [patient, service, practitioner] = await Promise.all([
    patientRepository.findById(clinicId, patientId),
    serviceRepository.findById(clinicId, serviceId),
    practitionerRepository.findById(clinicId, practitionerId),
  ]);
  if (!patient) throw new AppError(ErrorCode.PATIENT_NOT_FOUND, `Patient ${patientId} not found`);
  if (!service || !service.active) throw new AppError(ErrorCode.SERVICE_NOT_FOUND, `Service ${serviceId} not found or inactive`);
  if (!practitioner || !practitioner.active) throw new AppError(ErrorCode.PRACTITIONER_NOT_FOUND, `Practitioner ${practitionerId} not found or inactive`);
  return { patient, service, practitioner };
}

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

function assertTransition(from: AppointmentStatus, to: AppointmentStatus) {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Cannot transition appointment from ${from} to ${to}`,
    );
  }
}

export const appointmentService = {
  async checkAvailability(ctx: ActorContext, input: CheckAvailabilityInput): Promise<boolean> {
    const [service, practitioner] = await Promise.all([
      serviceRepository.findById(ctx.clinicId, input.serviceId),
      practitionerRepository.findById(ctx.clinicId, input.practitionerId),
    ]);
    if (!service) throw new AppError(ErrorCode.SERVICE_NOT_FOUND, "Service not found");
    if (!practitioner) throw new AppError(ErrorCode.PRACTITIONER_NOT_FOUND, "Practitioner not found");

    const clinic = await clinicRepository.getById(ctx.clinicId);
    const start = parseStrictIso(input.startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);
    const localDate = localDateFromUtc(start, clinic.timezone);

    return isSlotAvailable(ctx.clinicId, input.practitionerId, localDate, start, end);
  },

  async getAvailableSlots(ctx: ActorContext, input: GetAvailableSlotsInput) {
    const service = await serviceRepository.findById(ctx.clinicId, input.serviceId);
    if (!service) throw new AppError(ErrorCode.SERVICE_NOT_FOUND, "Service not found");
    const practitioner = await practitionerRepository.findById(ctx.clinicId, input.practitionerId);
    if (!practitioner) throw new AppError(ErrorCode.PRACTITIONER_NOT_FOUND, "Practitioner not found");

    const windows = await computeFreeWindows(ctx.clinicId, input.practitionerId, input.date);
    return sliceSlots(windows, service.durationMinutes).map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
    }));
  },

  async getAppointment(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    const appointment = await appointmentRepository.findById(ctx.clinicId, id);
    if (!appointment) throw new AppError(ErrorCode.APPOINTMENT_NOT_FOUND, `Appointment ${id} not found`);
    return toAppointmentOutput(appointment);
  },

  async getPatientAppointments(ctx: ActorContext, patientId: string): Promise<AppointmentOutput[]> {
    const appointments = await appointmentRepository.listForPatient(ctx.clinicId, patientId);
    return appointments.map(toAppointmentOutput);
  },

  async createAppointment(ctx: ActorContext, input: CreateAppointmentInput): Promise<AppointmentOutput> {
    return withIdempotency(input.idempotencyKey, "createAppointment", input, async () => {
      const { service } = await assertActiveEntities(
        ctx.clinicId,
        input.patientId,
        input.serviceId,
        input.practitionerId,
      );
      const clinic = await clinicRepository.getById(ctx.clinicId);
      const startTime = parseStrictIso(input.startTime);
      const endTime = new Date(startTime.getTime() + service.durationMinutes * 60_000);
      if (endTime <= startTime) {
        throw new AppError(ErrorCode.INVALID_APPOINTMENT_TIME, "Computed end time is not after start time");
      }
      const localDate = localDateFromUtc(startTime, clinic.timezone);

      try {
        const appointment = await appointmentRepository.runInTransaction(async (tx) => {
          // Serializes all mutations for this practitioner-day so two
          // concurrent requests can't both pass the availability check
          // before either has inserted (READ COMMITTED would otherwise
          // allow exactly that race).
          await appointmentRepository.lockPractitionerDay(tx, input.practitionerId, localDate);

          const available = await isSlotAvailable(ctx.clinicId, input.practitionerId, localDate, startTime, endTime);
          if (!available) {
            throw new AppError(ErrorCode.APPOINTMENT_CONFLICT, "The selected appointment slot is no longer available");
          }

          const created = await appointmentRepository.create(tx, {
            clinicId: ctx.clinicId,
            patientId: input.patientId,
            practitionerId: input.practitionerId,
            serviceId: input.serviceId,
            roomId: input.roomId ?? null,
            startTime,
            endTime,
            status: "REQUESTED",
            source: input.source,
            notes: input.notes ?? null,
          });

          await writeAuditLog(tx, ctx, "appointment.create", "Appointment", created.id, { source: input.source });
          await writeOutboxEvent(tx, ctx.clinicId, "AppointmentCreated", { appointmentId: created.id });
          return created;
        });

        eventBus.publish("AppointmentCreated", ctx.clinicId, { appointmentId: appointment.id });
        return toAppointmentOutput(appointment);
      } catch (err) {
        // Belt-and-suspenders: even if the advisory lock were somehow
        // bypassed, the DB exclusion constraint makes a true double-booking
        // impossible — this just translates that into our error envelope.
        if (isExclusionViolation(err)) {
          throw new AppError(ErrorCode.APPOINTMENT_CONFLICT, "The selected appointment slot is no longer available");
        }
        throw err;
      }
    });
  },

  async rescheduleAppointment(ctx: ActorContext, id: string, newStartTimeIso: string): Promise<AppointmentOutput> {
    const existing = await appointmentRepository.findById(ctx.clinicId, id);
    if (!existing) throw new AppError(ErrorCode.APPOINTMENT_NOT_FOUND, `Appointment ${id} not found`);
    if (!["REQUESTED", "CONFIRMED"].includes(existing.status)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Cannot reschedule an appointment in status ${existing.status}`);
    }

    const service = await serviceRepository.findById(ctx.clinicId, existing.serviceId);
    if (!service) throw new AppError(ErrorCode.SERVICE_NOT_FOUND, "Service not found");
    const clinic = await clinicRepository.getById(ctx.clinicId);
    const startTime = parseStrictIso(newStartTimeIso);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60_000);
    const localDate = localDateFromUtc(startTime, clinic.timezone);

    try {
      const appointment = await appointmentRepository.runInTransaction(async (tx) => {
        await appointmentRepository.lockPractitionerDay(tx, existing.practitionerId, localDate);

        const windows = await computeFreeWindows(ctx.clinicId, existing.practitionerId, localDate);
        // The appointment being moved currently occupies its own old slot;
        // free windows already exclude it only if it's still ACTIVE, so we
        // must also allow the slot that overlaps only with itself.
        const available =
          windows.some((w) => startTime >= w.start && endTime <= w.end) ||
          (startTime.getTime() === existing.startTime.getTime() && endTime.getTime() === existing.endTime.getTime());
        if (!available) {
          throw new AppError(ErrorCode.APPOINTMENT_CONFLICT, "The selected appointment slot is no longer available");
        }

        const updated = await appointmentRepository.updateTimes(tx, ctx.clinicId, id, startTime, endTime);
        if (!updated) throw new AppError(ErrorCode.APPOINTMENT_NOT_FOUND, `Appointment ${id} not found`);
        await writeAuditLog(tx, ctx, "appointment.reschedule", "Appointment", id);
        return updated;
      });
      return toAppointmentOutput(appointment);
    } catch (err) {
      if (isExclusionViolation(err)) {
        throw new AppError(ErrorCode.APPOINTMENT_CONFLICT, "The selected appointment slot is no longer available");
      }
      throw err;
    }
  },

  async cancelAppointment(ctx: ActorContext, id: string, reason?: string): Promise<AppointmentOutput> {
    const appointment = await appointmentRepository.runInTransaction(async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id, clinicId: ctx.clinicId } });
      if (!existing) throw new AppError(ErrorCode.APPOINTMENT_NOT_FOUND, `Appointment ${id} not found`);
      assertTransition(existing.status, "CANCELLED");

      const updated = await appointmentRepository.updateStatus(tx, ctx.clinicId, id, {
        status: "CANCELLED",
        cancelReason: reason ?? null,
      });
      await writeAuditLog(tx, ctx, "appointment.cancel", "Appointment", id, { reason });
      await writeOutboxEvent(tx, ctx.clinicId, "AppointmentCancelled", { appointmentId: id, reason });
      return updated!;
    });
    eventBus.publish("AppointmentCancelled", ctx.clinicId, { appointmentId: id });
    return toAppointmentOutput(appointment);
  },

  async confirmAppointment(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    return this.transitionStatus(ctx, id, "CONFIRMED", "appointment.confirm", "AppointmentConfirmed");
  },
  async checkInAppointment(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    return this.transitionStatus(ctx, id, "CHECKED_IN", "appointment.check_in");
  },
  async startTreatment(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    return this.transitionStatus(ctx, id, "IN_PROGRESS", "appointment.start");
  },
  async completeAppointment(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    return this.transitionStatus(ctx, id, "COMPLETED", "appointment.complete", "AppointmentCompleted");
  },
  async markNoShow(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    return this.transitionStatus(ctx, id, "NO_SHOW", "appointment.no_show");
  },

  async transitionStatus(
    ctx: ActorContext,
    id: string,
    to: AppointmentStatus,
    auditAction: string,
    domainEvent?: "AppointmentConfirmed" | "AppointmentCompleted",
  ): Promise<AppointmentOutput> {
    const appointment = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id, clinicId: ctx.clinicId } });
      if (!existing) throw new AppError(ErrorCode.APPOINTMENT_NOT_FOUND, `Appointment ${id} not found`);
      assertTransition(existing.status, to);

      const updated = await appointmentRepository.updateStatus(tx, ctx.clinicId, id, { status: to });
      await writeAuditLog(tx, ctx, auditAction, "Appointment", id);
      if (domainEvent) await writeOutboxEvent(tx, ctx.clinicId, domainEvent, { appointmentId: id });
      return updated!;
    });
    if (domainEvent) eventBus.publish(domainEvent, ctx.clinicId, { appointmentId: id });
    return toAppointmentOutput(appointment);
  },
};
