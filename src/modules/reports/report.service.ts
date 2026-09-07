import { ActorContext } from "@/lib/auth/types";
import { reportRepository } from "@/modules/reports/report.repository";

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function startOfMonthUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export const reportService = {
  async getDashboardStats(ctx: ActorContext) {
    const todayStart = startOfTodayUtc();
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = startOfMonthUtc();

    const [
      todaysAppointments,
      upcomingAppointments,
      newPatientsThisMonth,
      todaysPayments,
      monthlyPayments,
      outstanding,
      products,
      expiringCount,
    ] = await Promise.all([
      reportRepository.countAppointmentsInRange(ctx.clinicId, todayStart, todayEnd),
      reportRepository.countUpcomingAppointments(ctx.clinicId, todayEnd),
      reportRepository.countNewPatientsSince(ctx.clinicId, monthStart),
      reportRepository.sumPaymentsInRange(ctx.clinicId, todayStart, todayEnd),
      reportRepository.sumPaymentsInRange(ctx.clinicId, monthStart),
      reportRepository.outstandingTotals(ctx.clinicId),
      reportRepository.productsWithBatches(ctx.clinicId),
      reportRepository.expiringBatchCount(ctx.clinicId, 30),
    ]);

    const lowStockCount = products.filter((p) => {
      const onHand = p.batches.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
      return onHand <= Number(p.reorderLevel);
    }).length;

    return {
      todaysAppointments,
      upcomingAppointments,
      newPatientsThisMonth,
      todaysRevenue: Number(todaysPayments._sum.amount ?? 0),
      monthlyRevenue: Number(monthlyPayments._sum.amount ?? 0),
      outstandingBalance: Number(outstanding._sum.total ?? 0) - Number(outstanding._sum.amountPaid ?? 0),
      lowStockCount,
      expiringCount,
    };
  },

  async getPractitionerPerformance(ctx: ActorContext, sinceDays = 30) {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const rows = await reportRepository.practitionerPerformance(ctx.clinicId, since);
    const practitioners = await reportRepository.findPractitionersByIds(rows.map((r) => r.practitionerId));
    return rows
      .map((r) => {
        const p = practitioners.find((p) => p.id === r.practitionerId);
        return { practitionerId: r.practitionerId, name: p ? `${p.employee.firstName} ${p.employee.lastName}` : "Unknown", treatmentsCompleted: r._count._all };
      })
      .sort((a, b) => b.treatmentsCompleted - a.treatmentsCompleted);
  },

  async getPopularServices(ctx: ActorContext, sinceDays = 30) {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const rows = await reportRepository.popularServices(ctx.clinicId, since);
    const services = await reportRepository.findServicesByIds(rows.map((r) => r.serviceId));
    return rows.map((r) => ({
      serviceId: r.serviceId,
      name: services.find((s) => s.id === r.serviceId)?.name ?? "Unknown",
      bookings: r._count._all,
    }));
  },

  listAllAppointments: (ctx: ActorContext) => reportRepository.listAllAppointments(ctx.clinicId),
  listAllInvoices: (ctx: ActorContext) => reportRepository.listAllInvoices(ctx.clinicId),
  listAllPackages: (ctx: ActorContext) => reportRepository.listAllPackages(ctx.clinicId),
  listAllMemberships: (ctx: ActorContext) => reportRepository.listAllMemberships(ctx.clinicId),
  listAllEmployees: (ctx: ActorContext) => reportRepository.listAllEmployees(ctx.clinicId),
};
