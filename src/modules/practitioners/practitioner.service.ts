import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { writeAuditLog } from "@/lib/audit";
import { normalizePhone } from "@/lib/phone";
import { practitionerRepository } from "@/modules/practitioners/practitioner.repository";
import {
  CreatePractitionerInput,
  ScheduleEntryInput,
  UpdatePractitionerInput,
} from "@/modules/practitioners/practitioner.schema";

export const practitionerService = {
  async listPractitioners(ctx: ActorContext, opts: { activeOnly?: boolean; serviceId?: string } = {}) {
    return practitionerRepository.list(ctx.clinicId, opts);
  },

  async getPractitioner(ctx: ActorContext, id: string) {
    const practitioner = await practitionerRepository.findById(ctx.clinicId, id);
    if (!practitioner) throw new AppError(ErrorCode.PRACTITIONER_NOT_FOUND, `Practitioner ${id} not found`);
    return practitioner;
  },

  async createPractitioner(ctx: ActorContext, input: CreatePractitionerInput) {
    return prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          clinicId: ctx.clinicId,
          firstName: input.firstName,
          lastName: input.lastName,
          role: "PRACTITIONER",
          phoneRaw: input.phone ?? null,
          phoneE164: input.phone ? normalizePhone(input.phone) : null,
          email: input.email ?? null,
        },
      });
      const practitioner = await tx.practitioner.create({
        data: {
          clinicId: ctx.clinicId,
          employeeId: employee.id,
          title: input.title ?? null,
          specialties: input.specialties,
          bio: input.bio ?? null,
          commissionRate: input.commissionRate ?? null,
        },
        include: { employee: true },
      });
      await writeAuditLog(tx, ctx, "practitioner.create", "Practitioner", practitioner.id);
      return practitioner;
    });
  },

  async updatePractitioner(ctx: ActorContext, id: string, input: UpdatePractitionerInput) {
    const existing = await this.getPractitioner(ctx, id);

    // The form is one object; the storage is two rows. Split it here so the
    // caller never has to know a Practitioner is backed by an Employee.
    const employeeData: Prisma.EmployeeUncheckedUpdateInput = {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.phone !== undefined
        ? { phoneRaw: input.phone || null, phoneE164: input.phone ? normalizePhone(input.phone) : null }
        : {}),
    };
    const practitionerData: Prisma.PractitionerUncheckedUpdateInput = {
      ...(input.title !== undefined ? { title: input.title || null } : {}),
      ...(input.specialties !== undefined ? { specialties: input.specialties } : {}),
      ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
      ...(input.commissionRate !== undefined ? { commissionRate: input.commissionRate ?? null } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    };

    const updated = await practitionerRepository.update(
      ctx.clinicId,
      id,
      practitionerData,
      employeeData,
    );
    if (!updated) throw new AppError(ErrorCode.PRACTITIONER_NOT_FOUND, `Practitioner ${id} not found`);

    await prisma.$transaction((tx) =>
      writeAuditLog(tx, ctx, "practitioner.update", "Practitioner", id, {
        employeeId: existing.employeeId,
      })
    );
    return updated;
  },

  /**
   * Permanent delete, allowed only while nothing references the practitioner.
   * Once they have appointments, consultations, treatments or commissions,
   * they are part of the clinic's record — callers deactivate instead.
   */
  async deletePractitioner(ctx: ActorContext, id: string) {
    const practitioner = await this.getPractitioner(ctx, id);
    const refs = await practitionerRepository.countReferences(id, practitioner.employeeId);
    const total = refs.appointments + refs.consultations + refs.treatments + refs.commissions;
    const name = `${practitioner.employee.firstName} ${practitioner.employee.lastName}`;

    if (total > 0) {
      const parts = [
        refs.appointments && `${refs.appointments} appointment(s)`,
        refs.consultations && `${refs.consultations} consultation(s)`,
        refs.treatments && `${refs.treatments} treatment(s)`,
        refs.commissions && `${refs.commissions} commission record(s)`,
      ].filter(Boolean);
      throw new AppError(
        ErrorCode.PRACTITIONER_IN_USE,
        `${name} is linked to ${parts.join(", ")} and cannot be deleted. Deactivate them instead to remove them from booking.`,
        refs
      );
    }

    await practitionerRepository.delete(id, practitioner.employeeId);
    await prisma.$transaction((tx) =>
      writeAuditLog(tx, ctx, "practitioner.delete", "Practitioner", id, { name })
    );
    return { id };
  },

  async setSchedules(ctx: ActorContext, practitionerId: string, schedules: ScheduleEntryInput[]) {
    await this.getPractitioner(ctx, practitionerId); // ownership check
    await practitionerRepository.setSchedules(practitionerId, schedules);
    return practitionerRepository.schedules(practitionerId);
  },
};
