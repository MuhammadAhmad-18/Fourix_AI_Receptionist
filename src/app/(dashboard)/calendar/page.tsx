import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { appointmentController } from "@/modules/appointments/appointment.controller";
import { clinicService } from "@/modules/clinic/clinic.service";
import { clinicLocalToUtc, formatInClinicTz } from "@/lib/tz";
import type { CalendarAppointment } from "@/modules/appointments/appointment.schema";
import { AppointmentCalendar, type CalendarDay } from "@/components/appointment-calendar";

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/** All grid maths runs on plain UTC calendar dates — a date has the same
 *  weekday everywhere, so no timezone is involved in laying out the month.
 *  Only the *instants* (month bounds, "today") are converted via the clinic tz. */
function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const ctx = await getActorContextFromSession();
  const clinic = await clinicService.getClinicInformation(ctx);
  const tz = clinic.timezone;

  const todayKey = formatInClinicTz(new Date(), tz, "yyyy-MM-dd");
  const monthKey = m && MONTH_KEY.test(m) ? m : todayKey.slice(0, 7);
  const nextMonthKey = shiftMonth(monthKey, 1);

  // Month bounds as UTC instants, derived from clinic-local midnight.
  const from = clinicLocalToUtc(`${monthKey}-01T00:00:00`, tz);
  const to = clinicLocalToUtc(`${nextMonthKey}-01T00:00:00`, tz);

  const [appointments, businessHours] = await Promise.all([
    appointmentController.listInRange(ctx, from, to),
    clinicService.getBusinessHours(ctx),
  ]);

  const byDate = new Map<string, CalendarAppointment[]>();
  for (const a of appointments) {
    const bucket = byDate.get(a.date);
    if (bucket) bucket.push(a);
    else byDate.set(a.date, [a]);
  }

  const closedWeekdays = new Set(
    businessHours.filter((b) => b.isClosed).map((b) => b.dayOfWeek)
  );

  const [year, month] = monthKey.split("-").map(Number);
  const leading = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((leading + daysInMonth) / 7) * 7;

  const days: CalendarDay[] = Array.from({ length: cellCount }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1, 1 + (i - leading)));
    const key = dateKey(d);
    return {
      date: key,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month - 1,
      isToday: key === todayKey,
      isClosed: closedWeekdays.has(d.getUTCDay()),
      appointments: byDate.get(key) ?? [],
    };
  });

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // Land on today when it's in view, otherwise the first of the month.
  const selected = todayKey.startsWith(monthKey) ? todayKey : `${monthKey}-01`;

  return (
    <AppointmentCalendar
      days={days}
      monthLabel={monthLabel}
      monthKey={monthKey}
      prevMonth={shiftMonth(monthKey, -1)}
      nextMonth={nextMonthKey}
      todayMonth={todayKey.slice(0, 7)}
      initialSelected={selected}
      appointmentCount={appointments.length}
      timezone={tz}
    />
  );
}
