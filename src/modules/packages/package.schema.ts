import { z } from "zod";

export const createPackageSchema = z.object({
  patientId: z.string(),
  serviceId: z.string(),
  totalSessions: z.coerce.number().int().positive(),
  expiresAt: z.string().optional(),
});
export interface CreatePackageInput {
  patientId: string;
  serviceId: string;
  totalSessions: number;
  expiresAt?: string;
}

export const useSessionSchema = z.object({
  appointmentId: z.string().optional(),
});

export const createMembershipSchema = z.object({
  patientId: z.string(),
  planName: z.string().min(1),
  expiresAt: z.string().optional(),
  benefits: z.record(z.string(), z.unknown()).optional(),
});
export interface CreateMembershipInput {
  patientId: string;
  planName: string;
  expiresAt?: string;
  benefits?: Record<string, unknown>;
}
