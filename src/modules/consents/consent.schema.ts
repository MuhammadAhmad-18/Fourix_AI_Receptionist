import { z } from "zod";
import { ConsentRecord, ConsentType } from "@prisma/client";

export const createConsentSchema = z.object({
  patientId: z.string(),
  treatmentId: z.string().optional(),
  type: z.nativeEnum(ConsentType),
  fileId: z.string().optional(),
  signedAt: z.string().optional(),
});
export type CreateConsentInput = z.infer<typeof createConsentSchema>;

export const consentOutputSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  treatmentId: z.string().nullable(),
  type: z.nativeEnum(ConsentType),
  fileId: z.string().nullable(),
  signedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type ConsentOutput = z.infer<typeof consentOutputSchema>;

export function toConsentOutput(c: ConsentRecord): ConsentOutput {
  return {
    id: c.id,
    patientId: c.patientId,
    treatmentId: c.treatmentId,
    type: c.type,
    fileId: c.fileId,
    signedAt: c.signedAt ? c.signedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  };
}
