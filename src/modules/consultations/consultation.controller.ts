import { ActorContext } from "@/lib/auth/types";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { consultationService } from "@/modules/consultations/consultation.service";
import { CreateConsultationInput, toConsultationOutput } from "@/modules/consultations/consultation.schema";

export const consultationController = {
  async listForPatient(ctx: ActorContext, patientId: string) {
    requirePermission(ctx, Permission.PATIENT_READ);
    const consultations = await consultationService.listForPatient(ctx, patientId);
    return consultations.map(toConsultationOutput);
  },
  async get(ctx: ActorContext, id: string) {
    requirePermission(ctx, Permission.PATIENT_READ);
    return toConsultationOutput(await consultationService.getConsultation(ctx, id));
  },
  async create(ctx: ActorContext, input: CreateConsultationInput) {
    requirePermission(ctx, Permission.APPOINTMENT_MANAGE);
    return toConsultationOutput(await consultationService.createConsultation(ctx, input));
  },
};
