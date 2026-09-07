// ONLY file in the reports module allowed to import PrismaClient.
import { prisma } from "@/lib/db";

export const reportRepository = {
  countAppointmentsInRange(clinicId: string, from: Date, to: Date, excludeCancelled = true) {
    return prisma.appointment.count({
      where: { clinicId, startTime: { gte: from, lt: to }, ...(excludeCancelled ? { status: { notIn: ["CANCELLED"] } } : {}) },
    });
  },
  countUpcomingAppointments(clinicId: string, after: Date) {
    return prisma.appointment.count({ where: { clinicId, startTime: { gt: after }, status: { in: ["REQUESTED", "CONFIRMED"] } } });
  },
  countNewPatientsSince(clinicId: string, since: Date) {
    return prisma.patient.count({ where: { clinicId, createdAt: { gte: since } } });
  },
  sumPaymentsInRange(clinicId: string, from: Date, to?: Date) {
    return prisma.payment.aggregate({
      where: { clinicId, status: "COMPLETED", createdAt: to ? { gte: from, lt: to } : { gte: from } },
      _sum: { amount: true },
    });
  },
  outstandingTotals(clinicId: string) {
    return prisma.invoice.aggregate({
      where: { clinicId, status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      _sum: { total: true, amountPaid: true },
    });
  },
  productsWithBatches(clinicId: string) {
    return prisma.product.findMany({ where: { clinicId, active: true }, include: { batches: true } });
  },
  expiringBatchCount(clinicId: string, withinDays: number) {
    return prisma.productBatch.count({
      where: {
        product: { clinicId },
        expiryDate: { lte: new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000) },
      },
    });
  },

  findPractitionersByIds(ids: string[]) {
    return prisma.practitioner.findMany({ where: { id: { in: ids } }, include: { employee: true } });
  },
  findServicesByIds(ids: string[]) {
    return prisma.service.findMany({ where: { id: { in: ids } } });
  },

  practitionerPerformance(clinicId: string, from: Date) {
    return prisma.treatment.groupBy({
      by: ["practitionerId"],
      where: { clinicId, completedAt: { gte: from, not: null } },
      _count: { _all: true },
    });
  },
  popularServices(clinicId: string, from: Date) {
    return prisma.appointment.groupBy({
      by: ["serviceId"],
      where: { clinicId, startTime: { gte: from }, status: { notIn: ["CANCELLED"] } },
      _count: { _all: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 10,
    });
  },

  listAllAppointments(clinicId: string, take = 100) {
    return prisma.appointment.findMany({
      where: { clinicId },
      include: { patient: true, practitioner: { include: { employee: true } }, service: true },
      orderBy: { startTime: "desc" },
      take,
    });
  },
  listAllInvoices(clinicId: string, take = 100) {
    return prisma.invoice.findMany({ where: { clinicId }, include: { patient: true }, orderBy: { createdAt: "desc" }, take });
  },
  listAllPackages(clinicId: string) {
    return prisma.package.findMany({ where: { clinicId }, include: { patient: true, service: true }, orderBy: { purchasedAt: "desc" } });
  },
  listAllMemberships(clinicId: string) {
    return prisma.membership.findMany({ where: { clinicId }, include: { patient: true }, orderBy: { startedAt: "desc" } });
  },
  listAllEmployees(clinicId: string) {
    return prisma.employee.findMany({ where: { clinicId }, orderBy: { firstName: "asc" } });
  },
};
