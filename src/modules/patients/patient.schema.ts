import { z } from "zod";
import { Gender, Patient, PatientSource } from "@prisma/client";

export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  gender: z.nativeEnum(Gender).default(Gender.UNSPECIFIED),
  dateOfBirth: z.string().date().optional(),
  phone: z.string().min(3).optional(),
  email: z.string().email().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  source: z.nativeEnum(PatientSource).default(PatientSource.OTHER),
  referredBy: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial().omit({ idempotencyKey: true });
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export const searchPatientSchema = z.object({
  q: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type SearchPatientInput = z.infer<typeof searchPatientSchema>;

export const patientOutputSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  gender: z.nativeEnum(Gender),
  dateOfBirth: z.string().nullable(),
  phoneRaw: z.string().nullable(),
  phoneE164: z.string().nullable(),
  email: z.string().nullable(),
  addressLine1: z.string().nullable(),
  city: z.string().nullable(),
  source: z.nativeEnum(PatientSource),
  referredBy: z.string().nullable(),
  notes: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PatientOutput = z.infer<typeof patientOutputSchema>;

/**
 * Single serialization path so a fresh create and an idempotency-cache-hit
 * replay (which round-trips through JSON storage) produce identical shapes.
 */
export function toPatientOutput(p: Patient): PatientOutput {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    gender: p.gender,
    dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : null,
    phoneRaw: p.phoneRaw,
    phoneE164: p.phoneE164,
    email: p.email,
    addressLine1: p.addressLine1,
    city: p.city,
    source: p.source,
    referredBy: p.referredBy,
    notes: p.notes,
    active: p.active,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
