import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const serviceRepository = {
  findById(clinicId: string, id: string) {
    return prisma.service.findFirst({ where: { id, clinicId } });
  },

  list(clinicId: string, opts: { activeOnly?: boolean } = {}) {
    return prisma.service.findMany({
      where: { clinicId, ...(opts.activeOnly ? { active: true } : {}) },
      orderBy: { name: "asc" },
    });
  },

  create(clinicId: string, data: Prisma.ServiceUncheckedCreateInput) {
    return prisma.service.create({ data: { ...data, clinicId } });
  },

  async update(clinicId: string, id: string, data: Prisma.ServiceUncheckedUpdateInput) {
    const existing = await prisma.service.findFirst({ where: { id, clinicId } });
    if (!existing) return null;
    return prisma.service.update({ where: { id }, data });
  },
};
