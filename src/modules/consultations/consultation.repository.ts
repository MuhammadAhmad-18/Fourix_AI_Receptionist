// ONLY file in the consultations module allowed to import PrismaClient.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const consultationRepository = {
  findById(clinicId: string, id: string) {
    return prisma.consultation.findFirst({ where: { id, clinicId } });
  },
  listForPatient(clinicId: string, patientId: string) {
    return prisma.consultation.findMany({ where: { clinicId, patientId }, orderBy: { createdAt: "desc" } });
  },
  create(data: Prisma.ConsultationUncheckedCreateInput) {
    return prisma.consultation.create({ data });
  },
};
