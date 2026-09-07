import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { patientRepository } from "@/modules/patients/patient.repository";
import { practitionerRepository } from "@/modules/practitioners/practitioner.repository";
import { consultationRepository } from "@/modules/consultations/consultation.repository";
import { CreateConsultationInput } from "@/modules/consultations/consultation.schema";

export const consultationService = {
  async listForPatient(ctx: ActorContext, patientId: string) {
    return consultationRepository.listForPatient(ctx.clinicId, patientId);
  },

  async getConsultation(ctx: ActorContext, id: string) {
    const consultation = await consultationRepository.findById(ctx.clinicId, id);
    if (!consultation) throw new AppError(ErrorCode.NOT_FOUND, `Consultation ${id} not found`);
    return consultation;
  },

  async createConsultation(ctx: ActorContext, input: CreateConsultationInput) {
    const [patient, practitioner] = await Promise.all([
      patientRepository.findById(ctx.clinicId, input.patientId),
      practitionerRepository.findById(ctx.clinicId, input.practitionerId),
    ]);
    if (!patient) throw new AppError(ErrorCode.PATIENT_NOT_FOUND, "Patient not found");
    if (!practitioner) throw new AppError(ErrorCode.PRACTITIONER_NOT_FOUND, "Practitioner not found");

    return prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.create({
        data: {
          clinicId: ctx.clinicId,
          patientId: input.patientId,
          practitionerId: input.practitionerId,
          appointmentId: input.appointmentId ?? null,
          notes: input.notes ?? null,
          diagnosis: input.diagnosis ?? null,
          recommendations: input.recommendations ?? null,
        },
      });
      await writeAuditLog(tx, ctx, "consultation.create", "Consultation", consultation.id);
      return consultation;
    });
  },
};
