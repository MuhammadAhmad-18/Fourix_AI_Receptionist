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
