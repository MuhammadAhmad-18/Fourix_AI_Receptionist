import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { AppError, ErrorCode } from "@/lib/errors/codes";

/**
 * Single date/timezone library used everywhere on the server. Never build
 * dates from ad-hoc string parsing — business hours, holidays, and
 * availability windows are evaluated in clinic-local time then converted
 * to UTC for storage/comparison.
 */

export function clinicLocalToUtc(localIso: string, timezone: string): Date {
  return fromZonedTime(localIso, timezone);
}

export function utcToClinicLocal(utcDate: Date, timezone: string): Date {
  return toZonedTime(utcDate, timezone);
}

export function formatInClinicTz(utcDate: Date, timezone: string, fmt: string): string {
  return formatInTimeZone(utcDate, timezone, fmt);
}

/** 0 = Sunday .. 6 = Saturday, evaluated in clinic-local time. */
export function dayOfWeekInClinicTz(utcDate: Date, timezone: string): number {
  return utcToClinicLocal(utcDate, timezone).getDay();
}

/** Parses a strict ISO-8601 string with an explicit offset; rejects naive datetimes. */
export function parseStrictIso(value: string): Date {
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/.test(value.trim());
  if (!hasOffset) {
    throw new AppError(ErrorCode.INVALID_APPOINTMENT_TIME, "Datetime must include an explicit UTC offset");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(ErrorCode.INVALID_APPOINTMENT_TIME, "Unparseable datetime");
  }
  return date;
}
