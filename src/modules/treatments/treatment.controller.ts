import { ActorContext } from "@/lib/auth/types";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { treatmentService } from "@/modules/treatments/treatment.service";
import { CreateTreatmentInput, toTreatmentOutput } from "@/modules/treatments/treatment.schema";

export const treatmentController = {
  async listForPatient(ctx: ActorContext, patientId: string) {
    requirePermission(ctx, Permission.PATIENT_READ);
    const treatments = await treatmentService.listForPatient(ctx, patientId);
    return treatments.map(toTreatmentOutput);
  },
  async get(ctx: ActorContext, id: string) {
    requirePermission(ctx, Permission.PATIENT_READ);
    return toTreatmentOutput(await treatmentService.getTreatment(ctx, id));
  },
  async create(ctx: ActorContext, input: CreateTreatmentInput) {
    requirePermission(ctx, Permission.APPOINTMENT_MANAGE);
    return toTreatmentOutput(await treatmentService.createTreatment(ctx, input));
  },
  async complete(ctx: ActorContext, id: string) {
    requirePermission(ctx, Permission.APPOINTMENT_MANAGE);
    return toTreatmentOutput(await treatmentService.completeTreatment(ctx, id));
  },
};
