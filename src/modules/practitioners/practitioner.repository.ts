// ONLY file in the practitioners module allowed to import PrismaClient.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const practitionerRepository = {
  findById(clinicId: string, id: string) {
    return prisma.practitioner.findFirst({ where: { id, clinicId }, include: { employee: true } });
  },

  list(clinicId: string, opts: { activeOnly?: boolean; serviceId?: string } = {}) {
    return prisma.practitioner.findMany({
      where: {
        clinicId,
        ...(opts.activeOnly ? { active: true } : {}),
        ...(opts.serviceId ? { services: { some: { serviceId: opts.serviceId } } } : {}),
      },
      include: { employee: true },
      orderBy: { employee: { firstName: "asc" } },
    });
  },

  schedules(practitionerId: string) {
    return prisma.practitionerSchedule.findMany({ where: { practitionerId } });
  },

  leavesInRange(practitionerId: string, from: Date, to: Date) {
    return prisma.practitionerLeave.findMany({
      where: { practitionerId, startAt: { lt: to }, endAt: { gt: from } },
    });
  },

  /** A practitioner spans two rows: the Practitioner and its backing Employee. */
  async update(
    clinicId: string,
    id: string,
    practitionerData: Prisma.PractitionerUncheckedUpdateInput,
    employeeData: Prisma.EmployeeUncheckedUpdateInput,
  ) {
    const existing = await prisma.practitioner.findFirst({ where: { id, clinicId } });
    if (!existing) return null;

    return prisma.$transaction(async (tx) => {
      if (Object.keys(employeeData).length > 0) {
        await tx.employee.update({ where: { id: existing.employeeId }, data: employeeData });
      }
      return tx.practitioner.update({
        where: { id },
        data: practitionerData,
        include: { employee: true },
      });
    });
  },

  /** Everything that would be orphaned by a hard delete. */
  async countReferences(id: string, employeeId: string) {
    const [appointments, consultations, treatments, commissions] = await Promise.all([
      prisma.appointment.count({ where: { practitionerId: id } }),
      prisma.consultation.count({ where: { practitionerId: id } }),
      prisma.treatment.count({ where: { practitionerId: id } }),
      prisma.commission.count({ where: { employeeId } }),
    ]);
    return { appointments, consultations, treatments, commissions };
  },

  /** Removes the practitioner, its own schedule/leave/service rows, and the
   *  Employee record created alongside it. */
  async delete(id: string, employeeId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.practitionerSchedule.deleteMany({ where: { practitionerId: id } });
      await tx.practitionerLeave.deleteMany({ where: { practitionerId: id } });
      await tx.practitionerService.deleteMany({ where: { practitionerId: id } });
      await tx.practitioner.delete({ where: { id } });
      await tx.employee.delete({ where: { id: employeeId } });
    });
  },

  async setSchedules(practitionerId: string, schedules: { dayOfWeek: number; startTime: string; endTime: string }[]) {
    return prisma.$transaction(async (tx) => {
      await tx.practitionerSchedule.deleteMany({ where: { practitionerId } });
      if (schedules.length > 0) {
        await tx.practitionerSchedule.createMany({
          data: schedules.map((s) => ({ practitionerId, ...s })),
        });
      }
    });
  },
};
