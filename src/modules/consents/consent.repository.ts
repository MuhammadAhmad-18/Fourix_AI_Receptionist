// ONLY file in the consents module allowed to import PrismaClient.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const consentRepository = {
  findById(clinicId: string, id: string) {
    return prisma.consentRecord.findFirst({ where: { id, clinicId } });
  },
  listForPatient(clinicId: string, patientId: string) {
    return prisma.consentRecord.findMany({ where: { clinicId, patientId }, orderBy: { createdAt: "desc" } });
  },
  create(data: Prisma.ConsentRecordUncheckedCreateInput) {
    return prisma.consentRecord.create({ data });
  },
};
