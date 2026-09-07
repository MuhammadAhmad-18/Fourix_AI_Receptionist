import { z } from "zod";
import { Consultation } from "@prisma/client";

export const createConsultationSchema = z.object({
  patientId: z.string(),
  practitionerId: z.string(),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
  diagnosis: z.string().optional(),
  recommendations: z.string().optional(),
});
export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;

export const consultationOutputSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  practitionerId: z.string(),
  appointmentId: z.string().nullable(),
  notes: z.string().nullable(),
  diagnosis: z.string().nullable(),
  recommendations: z.string().nullable(),
  createdAt: z.string(),
});
export type ConsultationOutput = z.infer<typeof consultationOutputSchema>;

export function toConsultationOutput(c: Consultation): ConsultationOutput {
  return {
    id: c.id,
    patientId: c.patientId,
    practitionerId: c.practitionerId,
    appointmentId: c.appointmentId,
    notes: c.notes,
    diagnosis: c.diagnosis,
    recommendations: c.recommendations,
    createdAt: c.createdAt.toISOString(),
  };
}
