import { prisma } from "@/lib/db";
import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { writeAuditLog } from "@/lib/audit";
import { writeOutboxEvent } from "@/lib/events/outbox";
import { eventBus } from "@/lib/events/bus";
import { patientRepository } from "@/modules/patients/patient.repository";
import { practitionerRepository } from "@/modules/practitioners/practitioner.repository";
import { serviceRepository } from "@/modules/services/service.repository";
import { treatmentRepository } from "@/modules/treatments/treatment.repository";
import { CreateTreatmentInput } from "@/modules/treatments/treatment.schema";

export const treatmentService = {
  async listForPatient(ctx: ActorContext, patientId: string) {
    return treatmentRepository.listForPatient(ctx.clinicId, patientId);
  },

  async getTreatment(ctx: ActorContext, id: string) {
    const treatment = await treatmentRepository.findById(ctx.clinicId, id);
    if (!treatment) throw new AppError(ErrorCode.NOT_FOUND, `Treatment ${id} not found`);
    return treatment;
  },

  async createTreatment(ctx: ActorContext, input: CreateTreatmentInput) {
    const [patient, practitioner, service] = await Promise.all([
      patientRepository.findById(ctx.clinicId, input.patientId),
      practitionerRepository.findById(ctx.clinicId, input.practitionerId),
      serviceRepository.findById(ctx.clinicId, input.serviceId),
    ]);
    if (!patient) throw new AppError(ErrorCode.PATIENT_NOT_FOUND, "Patient not found");
    if (!practitioner) throw new AppError(ErrorCode.PRACTITIONER_NOT_FOUND, "Practitioner not found");
    if (!service) throw new AppError(ErrorCode.SERVICE_NOT_FOUND, "Service not found");

    return prisma.$transaction(async (tx) => {
      const treatment = await treatmentRepository.create(tx, {
        clinicId: ctx.clinicId,
        patientId: input.patientId,
        practitionerId: input.practitionerId,
        serviceId: input.serviceId,
        appointmentId: input.appointmentId ?? null,
        notes: input.notes ?? null,
      });
      await writeAuditLog(tx, ctx, "treatment.create", "Treatment", treatment.id);
      return treatment;
    });
  },

  async completeTreatment(ctx: ActorContext, id: string) {
    const treatment = await prisma.$transaction(async (tx) => {
      const updated = await treatmentRepository.complete(tx, ctx.clinicId, id);
      if (!updated) throw new AppError(ErrorCode.NOT_FOUND, `Treatment ${id} not found`);
      await writeAuditLog(tx, ctx, "treatment.complete", "Treatment", id);
      await writeOutboxEvent(tx, ctx.clinicId, "TreatmentCompleted", { treatmentId: id });
      return updated;
    });
    eventBus.publish("TreatmentCompleted", ctx.clinicId, { treatmentId: id });
    return treatment;
  },
};
