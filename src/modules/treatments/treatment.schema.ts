import { z } from "zod";
import { Treatment } from "@prisma/client";

export const createTreatmentSchema = z.object({
  patientId: z.string(),
  practitionerId: z.string(),
  serviceId: z.string(),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateTreatmentInput = z.infer<typeof createTreatmentSchema>;

export const recordProductUsageSchema = z.object({
  productId: z.string(),
  batchId: z.string().optional(),
  quantity: z.coerce.number().positive(),
});
export type RecordProductUsageInput = z.infer<typeof recordProductUsageSchema>;

export const treatmentOutputSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  practitionerId: z.string(),
  serviceId: z.string(),
  appointmentId: z.string().nullable(),
  notes: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type TreatmentOutput = z.infer<typeof treatmentOutputSchema>;

export function toTreatmentOutput(t: Treatment): TreatmentOutput {
  return {
    id: t.id,
    patientId: t.patientId,
    practitionerId: t.practitionerId,
    serviceId: t.serviceId,
    appointmentId: t.appointmentId,
    notes: t.notes,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  };
}
