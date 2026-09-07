// ONLY file in the patients module allowed to import PrismaClient.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type PatientRecord = Awaited<ReturnType<typeof patientRepository.findById>>;

export const patientRepository = {
  findById(clinicId: string, id: string) {
    return prisma.patient.findFirst({ where: { id, clinicId } });
  },

  findByPhoneE164(clinicId: string, phoneE164: string) {
    return prisma.patient.findFirst({ where: { clinicId, phoneE164 } });
  },

  search(clinicId: string, opts: { q?: string; phone?: string; email?: string; limit: number; cursor?: string }) {
    const where: Prisma.PatientWhereInput = { clinicId };
    if (opts.q) {
      where.OR = [
        { firstName: { contains: opts.q, mode: "insensitive" } },
        { lastName: { contains: opts.q, mode: "insensitive" } },
      ];
    }
    if (opts.phone) where.phoneE164 = { contains: opts.phone };
    if (opts.email) where.email = { equals: opts.email, mode: "insensitive" };

    return prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.limit,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
  },

  create(clinicId: string, data: Prisma.PatientUncheckedCreateInput) {
    return prisma.patient.create({ data: { ...data, clinicId } });
  },

  async update(clinicId: string, id: string, data: Prisma.PatientUncheckedUpdateInput) {
    const existing = await prisma.patient.findFirst({ where: { id, clinicId } });
    if (!existing) return null;
    return prisma.patient.update({ where: { id }, data });
  },
};
