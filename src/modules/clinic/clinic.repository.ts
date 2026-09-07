// ONLY file in the clinic module allowed to import PrismaClient.
import { prisma } from "@/lib/db";

export const clinicRepository = {
  getById(clinicId: string) {
    return prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  },

  businessHours(clinicId: string) {
    return prisma.businessHours.findMany({ where: { clinicId } });
  },

  holidaysInRange(clinicId: string, from: Date, to: Date) {
    return prisma.clinicHoliday.findMany({ where: { clinicId, date: { gte: from, lt: to } } });
  },

  faqs(clinicId: string) {
    return prisma.clinicFaq.findMany({ where: { clinicId, active: true }, orderBy: { sortOrder: "asc" } });
  },
};
