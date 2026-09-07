import { z } from "zod";
import { Service } from "@prisma/client";

export const createServiceSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  price: z.coerce.number().min(0),
  requiresConsultation: z.boolean().default(false),
  requiresConsent: z.boolean().default(false),
  requiresPractitioner: z.boolean().default(true),
  preparationInstructions: z.string().optional(),
  aftercareInstructions: z.string().optional(),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const serviceOutputSchema = z.object({
  id: z.string(),
  categoryId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number(),
  price: z.number(),
  active: z.boolean(),
  requiresConsultation: z.boolean(),
  requiresConsent: z.boolean(),
  requiresPractitioner: z.boolean(),
  preparationInstructions: z.string().nullable(),
  aftercareInstructions: z.string().nullable(),
});
export type ServiceOutput = z.infer<typeof serviceOutputSchema>;

export function toServiceOutput(s: Service): ServiceOutput {
  return {
    id: s.id,
    categoryId: s.categoryId,
    name: s.name,
    description: s.description,
    durationMinutes: s.durationMinutes,
    price: Number(s.price),
    active: s.active,
    requiresConsultation: s.requiresConsultation,
    requiresConsent: s.requiresConsent,
    requiresPractitioner: s.requiresPractitioner,
    preparationInstructions: s.preparationInstructions,
    aftercareInstructions: s.aftercareInstructions,
  };
}
