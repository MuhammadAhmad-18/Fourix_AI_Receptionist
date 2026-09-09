"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, toneFor } from "@/components/status-badge";
import type { CalendarAppointment } from "@/modules/appointments/appointment.schema";
import { cn } from "cn";

export type CalendarDay = {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isClosed: boolean;
  appointments: CalendarAppointment[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Full class strings so Tailwind sees every tone at build time. */
const CHIP: Record<string, string> = {
  rose: "bg-rose-surface text-rose ring-rose-line/60",
  sage: "bg-sage-surface text-sage ring-sage-line/60",
  honey: "bg-honey-surface text-honey ring-honey-line/60",
  clay: "bg-clay-surface text-clay ring-clay-line/60",
  plum: "bg-plum-surface text-plum ring-plum-line/60",
  stone: "bg-stone-surface text-stone ring-stone-line/60",
};
const DOT: Record<string, string> = {
  rose: "bg-rose",
  sage: "bg-sage",
  honey: "bg-honey",
  clay: "bg-clay",
  plum: "bg-plum",
  stone: "bg-stone",
};

/** "2026-09-09" → "Tuesday, 9 September". Fixed locale + UTC keeps it
 *  deterministic between the server render and the client hydration. */
function longDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function shortDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function AppointmentCalendar({
  days,
  monthLabel,
  monthKey,
  prevMonth,
  nextMonth,
  todayMonth,
  initialSelected,
  appointmentCount,
  timezone,
}: {
  days: CalendarDay[];
  monthLabel: string;
  monthKey: string;
  prevMonth: string;
  nextMonth: string;
  todayMonth: string;
  initialSelected: string;
  appointmentCount: number;
  timezone: string;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const selectedDay = days.find((d) => d.date === selected);
  const selectedAppointments = selectedDay?.appointments ?? [];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Clinic"
        title="Calendar"
        description={`${appointmentCount} appointment${appointmentCount === 1 ? "" : "s"} in ${monthLabel} · times shown in ${timezone.replace("_", " ")}`}
        action={
          <Button
            nativeButton={false}
            render={<Link href={`/appointments/new?date=${selected}`} />}
          >
            <Plus data-icon="inline-start" />
            New appointment
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ---------------------------------------------------------- grid */}
        <section className="table-surface flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="font-heading text-lg leading-none font-medium tracking-[-0.015em]">
              {monthLabel}
            </h2>
            <div className="flex items-center gap-1">
              {monthKey !== todayMonth && (
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/calendar" />}
                >
                  Today
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Previous month"
                nativeButton={false}
                render={<Link href={`/calendar?m=${prevMonth}`} />}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Next month"
                nativeButton={false}
                render={<Link href={`/calendar?m=${nextMonth}`} />}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {WEEKDAYS.map((d) => (
              <div key={d} className="page-eyebrow px-2 py-2 text-center">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d.charAt(0)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const isSelected = day.date === selected;
              const visible = day.appointments.slice(0, 3);
              const overflow = day.appointments.length - visible.length;

              return (
                <div
                  key={day.date}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${longDate(day.date)}, ${day.appointments.length} appointments`}
                  onClick={() => setSelected(day.date)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(day.date);
                    }
                  }}
                  className={cn(
                    "group relative flex min-h-[5rem] cursor-pointer flex-col gap-1.5 border-r border-b border-border/70 p-1.5 transition-colors sm:min-h-[7rem] sm:p-2",
                    "[&:nth-child(7n)]:border-r-0 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset focus-visible:outline-none",
                    day.inMonth ? "bg-card" : "bg-muted/35",
                    day.isClosed && day.inMonth && "bg-muted/25",
                    isSelected && "bg-rose-surface/70 ring-1 ring-rose-line/70 ring-inset",
                    !isSelected && "hover:bg-accent/35"
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span
                      data-numeric
                      className={cn(
                        "font-heading text-[0.9rem] leading-none",
                        !day.inMonth && "text-muted-foreground/45",
                        day.isToday &&
                          "grid size-[1.45rem] place-items-center rounded-full bg-primary text-[0.78rem] text-primary-foreground"
                      )}
                    >
                      {day.day}
                    </span>

                    {/* Quick-add straight onto this date. */}
                    <Link
                      href={`/appointments/new?date=${day.date}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Add an appointment on ${longDate(day.date)}`}
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition",
                        "hover:bg-primary hover:text-primary-foreground focus-visible:opacity-100 group-hover:opacity-100",
                        "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                      )}
                    >
                      <Plus className="size-3.5" />
                    </Link>
                  </div>

                  {/* Chips on tablet and up; a dot row keeps phones readable. */}
                  <div className="hidden min-w-0 flex-col gap-1 sm:flex">
                    {visible.map((a) => (
                      <span
                        key={a.id}
                        title={`${a.startLabel} · ${a.patientName} · ${a.serviceName}`}
                        className={cn(
                          "truncate rounded-[5px] px-1.5 py-[3px] text-[0.68rem] leading-tight ring-1 ring-inset",
                          CHIP[toneFor(a.status)],
                          a.status === "CANCELLED" && "line-through opacity-70"
                        )}
                      >
                        <span data-numeric className="font-medium">
                          {a.startLabel.replace(":00", "")}
                        </span>{" "}
                        {a.patientName}
                      </span>
                    ))}
                    {overflow > 0 && (
                      <span className="px-1 text-[0.66rem] font-medium text-muted-foreground">
                        +{overflow} more
                      </span>
                    )}
                    {day.appointments.length === 0 && day.isClosed && day.inMonth && (
                      <span className="px-1 text-[0.66rem] text-muted-foreground/70">
                        Closed
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 sm:hidden">
                    {day.appointments.slice(0, 4).map((a) => (
                      <span
                        key={a.id}
                        aria-hidden
                        className={cn("size-1.5 rounded-full", DOT[toneFor(a.status)])}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ------------------------------------------------------- day panel */}
        <aside className="table-surface flex h-fit flex-col xl:sticky xl:top-8">
          <div className="border-b border-border px-5 pt-4 pb-3.5">
            <p className="page-eyebrow">Selected day</p>
            <h2 className="mt-1 font-heading text-lg leading-tight font-medium tracking-[-0.015em]">
              {longDate(selected)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedAppointments.length === 0
                ? selectedDay?.isClosed
                  ? "The clinic is closed on this day."
                  : "Nothing booked yet."
                : `${selectedAppointments.length} appointment${selectedAppointments.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <ul className="flex max-h-[26rem] flex-col overflow-y-auto">
            {selectedAppointments.length === 0 && (
              <li className="px-5 py-10 text-center">
                <p className="font-heading text-base text-foreground/70">
                  No appointments
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Book the first one for {shortDate(selected)}.
                </p>
              </li>
            )}
            {selectedAppointments.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-1.5 border-b border-border/70 px-5 py-3.5 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span data-numeric className="text-[0.82rem] font-medium">
                    {a.startLabel}
                    <span className="text-muted-foreground"> – {a.endLabel}</span>
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <span className="text-[0.92rem] leading-tight font-medium">
                  {a.patientName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {a.serviceName} · {a.practitionerName}
                </span>
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-4">
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href={`/appointments/new?date=${selected}`} />}
            >
              <Plus data-icon="inline-start" />
              Add on {shortDate(selected)}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
