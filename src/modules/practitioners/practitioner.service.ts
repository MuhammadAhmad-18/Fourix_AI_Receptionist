import { prisma } from "@/lib/db";
import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { writeAuditLog } from "@/lib/audit";
import { practitionerRepository } from "@/modules/practitioners/practitioner.repository";
import { CreatePractitionerInput, ScheduleEntryInput } from "@/modules/practitioners/practitioner.schema";

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

  async setSchedules(ctx: ActorContext, practitionerId: string, schedules: ScheduleEntryInput[]) {
    await this.getPractitioner(ctx, practitionerId); // ownership check
    await practitionerRepository.setSchedules(practitionerId, schedules);
    return practitionerRepository.schedules(practitionerId);
  },
};
