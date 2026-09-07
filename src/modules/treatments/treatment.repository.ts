// ONLY file in the treatments module allowed to import PrismaClient.
import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

type TxClient = Prisma.TransactionClient | PrismaClient;

export const treatmentRepository = {
  findById(clinicId: string, id: string) {
    return prisma.treatment.findFirst({ where: { id, clinicId }, include: { products: true } });
  },
  listForPatient(clinicId: string, patientId: string) {
    return prisma.treatment.findMany({ where: { clinicId, patientId }, orderBy: { createdAt: "desc" } });
  },
  create(tx: TxClient, data: Prisma.TreatmentUncheckedCreateInput) {
    return tx.treatment.create({ data });
  },
  async complete(tx: TxClient, clinicId: string, id: string) {
    const existing = await tx.treatment.findFirst({ where: { id, clinicId } });
    if (!existing) return null;
    return tx.treatment.update({ where: { id }, data: { completedAt: new Date() } });
  },
  addProductUsage(tx: TxClient, data: Prisma.TreatmentProductUncheckedCreateInput) {
    return tx.treatmentProduct.create({ data });
  },
};
