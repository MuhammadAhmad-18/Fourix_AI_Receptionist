import { clinicRepository } from "@/modules/clinic/clinic.repository";
import { practitionerRepository } from "@/modules/practitioners/practitioner.repository";
import { appointmentRepository } from "@/modules/appointments/appointment.repository";
import { clinicLocalToUtc, dayOfWeekInClinicTz, formatInClinicTz } from "@/lib/tz";

export interface Interval {
  start: Date;
  end: Date;
}

function subtractIntervals(base: Interval, blockers: Interval[]): Interval[] {
  let free: Interval[] = [base];
  for (const blocker of blockers) {
    const next: Interval[] = [];
    for (const window of free) {
      if (blocker.end <= window.start || blocker.start >= window.end) {
        next.push(window); // no overlap
        continue;
      }
      if (blocker.start > window.start) next.push({ start: window.start, end: blocker.start });
      if (blocker.end < window.end) next.push({ start: blocker.end, end: window.end });
    }
    free = next;
  }
  return free.filter((w) => w.end > w.start);
}

/**
 * Computes free working windows (UTC) for one practitioner on one
 * clinic-local calendar date, considering: clinic business hours, clinic
 * holidays, the practitioner's weekly schedule, approved leave, and existing
 * (non-cancelled) appointments.
 */
export async function computeFreeWindows(
  clinicId: string,
  practitionerId: string,
  localDate: string, // YYYY-MM-DD, clinic-local
): Promise<Interval[]> {
  const clinic = await clinicRepository.getById(clinicId);
  const tz = clinic.timezone;

  const dayStartUtc = clinicLocalToUtc(`${localDate}T00:00:00`, tz);
  const dayEndUtc = clinicLocalToUtc(`${localDate}T23:59:59.999`, tz);
  const dayOfWeek = dayOfWeekInClinicTz(dayStartUtc, tz);

  const holidays = await clinicRepository.holidaysInRange(clinicId, dayStartUtc, dayEndUtc);
  if (holidays.length > 0) return [];

  const [businessHours, schedules] = await Promise.all([
    clinicRepository.businessHours(clinicId),
    practitionerRepository.schedules(practitionerId),
  ]);

  const bh = businessHours.find((b) => b.dayOfWeek === dayOfWeek);
  const sched = schedules.find((s) => s.dayOfWeek === dayOfWeek);
  if (!bh || bh.isClosed || !sched) return [];

  const workStart = clinicLocalToUtc(`${localDate}T${maxTime(bh.openTime, sched.startTime)}:00`, tz);
  const workEnd = clinicLocalToUtc(`${localDate}T${minTime(bh.closeTime, sched.endTime)}:00`, tz);
  if (workEnd <= workStart) return [];

  const [leaves, busy] = await Promise.all([
    practitionerRepository.leavesInRange(practitionerId, workStart, workEnd),
    appointmentRepository.busyIntervals(practitionerId, workStart, workEnd),
  ]);

  const blockers: Interval[] = [
    ...leaves.map((l) => ({ start: l.startAt, end: l.endAt })),
    ...busy.map((b) => ({ start: b.startTime, end: b.endTime })),
  ];

  return subtractIntervals({ start: workStart, end: workEnd }, blockers);
}

function maxTime(a: string, b: string): string {
  return a >= b ? a : b;
}
function minTime(a: string, b: string): string {
  return a <= b ? a : b;
}

/** Slices free windows into bookable slots of exactly `durationMinutes`, stepping by that duration. */
export function sliceSlots(windows: Interval[], durationMinutes: number): Interval[] {
  const durationMs = durationMinutes * 60_000;
  const slots: Interval[] = [];
  for (const window of windows) {
    let cursor = window.start.getTime();
    const end = window.end.getTime();
    while (cursor + durationMs <= end) {
      slots.push({ start: new Date(cursor), end: new Date(cursor + durationMs) });
      cursor += durationMs;
    }
  }
  return slots;
}

export async function isSlotAvailable(
  clinicId: string,
  practitionerId: string,
  localDate: string,
  start: Date,
  end: Date,
): Promise<boolean> {
  const windows = await computeFreeWindows(clinicId, practitionerId, localDate);
  return windows.some((w) => start >= w.start && end <= w.end);
}

export function localDateFromUtc(utcDate: Date, timezone: string): string {
  return formatInClinicTz(utcDate, timezone, "yyyy-MM-dd");
}
