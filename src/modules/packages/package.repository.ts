// ONLY file in the packages module allowed to import PrismaClient.
import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

type TxClient = Prisma.TransactionClient | PrismaClient;

export const packageRepository = {
  findById(clinicId: string, id: string) {
    return prisma.package.findFirst({ where: { id, clinicId } });
  },
  listForPatient(clinicId: string, patientId: string) {
    return prisma.package.findMany({ where: { clinicId, patientId }, orderBy: { purchasedAt: "desc" } });
  },
  create(clinicId: string, data: Omit<Prisma.PackageUncheckedCreateInput, "clinicId">) {
    return prisma.package.create({ data: { ...data, clinicId } });
  },
  async useSession(tx: TxClient, clinicId: string, packageId: string, appointmentId?: string) {
    const pkg = await tx.package.findFirst({ where: { id: packageId, clinicId } });
    if (!pkg) return null;
    const updated = await tx.package.update({
      where: { id: packageId },
      data: {
        usedSessions: { increment: 1 },
        ...(pkg.usedSessions + 1 >= pkg.totalSessions ? { status: "COMPLETED" } : {}),
      },
    });
    await tx.packageSession.create({ data: { packageId, appointmentId: appointmentId ?? null } });
    return updated;
  },

  findMembershipForPatient(clinicId: string, patientId: string) {
    return prisma.membership.findFirst({
      where: { clinicId, patientId, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });
  },
  createMembership(clinicId: string, data: Omit<Prisma.MembershipUncheckedCreateInput, "clinicId">) {
    return prisma.membership.create({ data: { ...data, clinicId } });
  },

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(fn);
  },
};
