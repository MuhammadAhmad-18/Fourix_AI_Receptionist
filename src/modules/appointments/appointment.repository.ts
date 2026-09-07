// ONLY file in the appointments module allowed to import PrismaClient.
import { Prisma, PrismaClient, AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

type TxClient = Prisma.TransactionClient | PrismaClient;

const ACTIVE_STATUSES: AppointmentStatus[] = [
  "REQUESTED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
];

export const appointmentRepository = {
  findById(clinicId: string, id: string) {
    return prisma.appointment.findFirst({ where: { id, clinicId } });
  },

  listForPatient(clinicId: string, patientId: string) {
    return prisma.appointment.findMany({
      where: { clinicId, patientId },
      orderBy: { startTime: "desc" },
    });
  },

  /** Busy intervals for a practitioner overlapping [from, to), excluding cancelled/no-show. */
  busyIntervals(practitionerId: string, from: Date, to: Date) {
    return prisma.appointment.findMany({
      where: {
        practitionerId,
        status: { in: ACTIVE_STATUSES },
        startTime: { lt: to },
        endTime: { gt: from },
      },
      select: { startTime: true, endTime: true },
    });
  },

  /** Takes a transaction-scoped advisory lock, serializing all mutations for one practitioner-day. */
  async lockPractitionerDay(tx: TxClient, practitionerId: string, localDate: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${practitionerId + ":" + localDate}))`;
  },

  async create(tx: TxClient, data: Prisma.AppointmentUncheckedCreateInput) {
    return tx.appointment.create({ data });
  },

  async updateStatus(
    tx: TxClient,
    clinicId: string,
    id: string,
    data: Prisma.AppointmentUncheckedUpdateInput,
  ) {
    const existing = await tx.appointment.findFirst({ where: { id, clinicId } });
    if (!existing) return null;
    return tx.appointment.update({ where: { id }, data });
  },

  async updateTimes(
    tx: TxClient,
    clinicId: string,
    id: string,
    startTime: Date,
    endTime: Date,
  ) {
    const existing = await tx.appointment.findFirst({ where: { id, clinicId } });
    if (!existing) return null;
    return tx.appointment.update({ where: { id }, data: { startTime, endTime } });
  },

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(fn);
  },
};
