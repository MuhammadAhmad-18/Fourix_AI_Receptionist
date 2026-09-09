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

  /** Everything that would be orphaned by a hard delete. */
  async countReferences(id: string) {
    const [appointments, treatments, packages, invoiceItems] = await Promise.all([
      prisma.appointment.count({ where: { serviceId: id } }),
      prisma.treatment.count({ where: { serviceId: id } }),
      prisma.package.count({ where: { serviceId: id } }),
      prisma.invoiceItem.count({ where: { serviceId: id } }),
    ]);
    return { appointments, treatments, packages, invoiceItems };
  },

  /** Clears the practitioner join rows first — they carry no history of their own. */
  async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.practitionerService.deleteMany({ where: { serviceId: id } });
      await tx.service.delete({ where: { id } });
    });
  },
};
