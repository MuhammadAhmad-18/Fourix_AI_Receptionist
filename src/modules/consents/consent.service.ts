import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { patientRepository } from "@/modules/patients/patient.repository";
import { consentRepository } from "@/modules/consents/consent.repository";
import { CreateConsentInput } from "@/modules/consents/consent.schema";

export const consentService = {
  async listForPatient(ctx: ActorContext, patientId: string) {
    return consentRepository.listForPatient(ctx.clinicId, patientId);
  },

  async createConsent(ctx: ActorContext, input: CreateConsentInput) {
    const patient = await patientRepository.findById(ctx.clinicId, input.patientId);
    if (!patient) throw new AppError(ErrorCode.PATIENT_NOT_FOUND, "Patient not found");

    return consentRepository.create({
      clinicId: ctx.clinicId,
      patientId: input.patientId,
      treatmentId: input.treatmentId ?? null,
      type: input.type,
      fileId: input.fileId ?? null,
      signedAt: input.signedAt ? new Date(input.signedAt) : new Date(),
    });
  },
};
