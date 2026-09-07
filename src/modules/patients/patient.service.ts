import { prisma } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { ActorContext } from "@/lib/auth/types";
import { normalizePhone } from "@/lib/phone";
import { writeAuditLog } from "@/lib/audit";
import { eventBus } from "@/lib/events/bus";
import { withIdempotency } from "@/lib/idempotency";
import { patientRepository } from "@/modules/patients/patient.repository";
import {
  CreatePatientInput,
  PatientOutput,
  SearchPatientInput,
  UpdatePatientInput,
  toPatientOutput,
} from "@/modules/patients/patient.schema";

/**
 * Every method here is callable with no request object present — the caller
 * (dashboard route, Server Component, seed script, or a Phase 2 AI tool)
 * passes an explicit ActorContext instead of us reading headers/cookies.
 */
export const patientService = {
  async searchPatient(ctx: ActorContext, input: SearchPatientInput) {
    const normalizedPhone = input.phone ? normalizePhone(input.phone) ?? input.phone : undefined;
    return patientRepository.search(ctx.clinicId, { ...input, phone: normalizedPhone });
  },

  async getPatient(ctx: ActorContext, id: string) {
    const patient = await patientRepository.findById(ctx.clinicId, id);
    if (!patient) throw new AppError(ErrorCode.PATIENT_NOT_FOUND, `Patient ${id} not found`);
    return patient;
  },

  async createPatient(ctx: ActorContext, input: CreatePatientInput): Promise<PatientOutput> {
    return withIdempotency(input.idempotencyKey, "createPatient", input, async () => {
      const phoneE164 = input.phone ? normalizePhone(input.phone) : null;

      const patient = await prisma.$transaction(async (tx) => {
        const created = await tx.patient.create({
          data: {
            clinicId: ctx.clinicId,
            firstName: input.firstName,
            lastName: input.lastName,
            gender: input.gender,
            dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
            phoneRaw: input.phone ?? null,
            phoneE164,
            email: input.email ?? null,
            addressLine1: input.addressLine1 ?? null,
            city: input.city ?? null,
            source: input.source,
            referredBy: input.referredBy ?? null,
            notes: input.notes ?? null,
          },
        });
        await writeAuditLog(tx, ctx, "patient.create", "Patient", created.id, { source: input.source });
        return created;
      });

      eventBus.publish("PatientCreated", ctx.clinicId, { patientId: patient.id });
      return toPatientOutput(patient);
    });
  },

  async updatePatient(ctx: ActorContext, id: string, input: UpdatePatientInput) {
    const phoneE164 = input.phone !== undefined ? normalizePhone(input.phone) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.patient.findFirst({ where: { id, clinicId: ctx.clinicId } });
      if (!existing) throw new AppError(ErrorCode.PATIENT_NOT_FOUND, `Patient ${id} not found`);

      const patient = await tx.patient.update({
        where: { id },
        data: {
          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.gender !== undefined ? { gender: input.gender } : {}),
          ...(input.dateOfBirth !== undefined ? { dateOfBirth: new Date(input.dateOfBirth) } : {}),
          ...(input.phone !== undefined ? { phoneRaw: input.phone, phoneE164 } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.source !== undefined ? { source: input.source } : {}),
          ...(input.referredBy !== undefined ? { referredBy: input.referredBy } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      });
      await writeAuditLog(tx, ctx, "patient.update", "Patient", patient.id);
      return patient;
    });

    return updated;
  },
};
