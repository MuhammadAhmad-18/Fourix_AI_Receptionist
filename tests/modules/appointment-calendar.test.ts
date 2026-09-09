import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/reset-db";
import { appointmentService } from "@/modules/appointments/appointment.service";
import { ActorContext } from "@/lib/auth/types";
import { Channel } from "@prisma/client";

let ctx: ActorContext;
let practitionerId: string;
let serviceId: string;
let patientId: string;

// Clinic-local September 2026 in Asia/Karachi (+05:00), as UTC instants.
const FROM = new Date("2026-08-31T19:00:00Z"); // 2026-09-01 00:00 +05:00
const TO = new Date("2026-09-30T19:00:00Z"); // 2026-10-01 00:00 +05:00

beforeEach(async () => {
  await resetDb();

  const clinic = await prisma.clinic.create({
    data: { name: "Test Clinic", timezone: "Asia/Karachi" },
  });
  const employee = await prisma.employee.create({
    data: { clinicId: clinic.id, firstName: "Ayesha", lastName: "Raza", role: "PRACTITIONER" },
  });
  const practitioner = await prisma.practitioner.create({
    data: { clinicId: clinic.id, employeeId: employee.id },
  });
  const service = await prisma.service.create({
    data: { clinicId: clinic.id, name: "Hydrafacial", durationMinutes: 60, price: 8000 },
  });
  const patient = await prisma.patient.create({
    data: { clinicId: clinic.id, firstName: "Sara", lastName: "Ahmed" },
  });

  practitionerId = practitioner.id;
  serviceId = service.id;
  patientId = patient.id;
  ctx = {
    actorId: null,
    actorType: "SYSTEM",
    clinicId: clinic.id,
    source: Channel.DASHBOARD,
    permissions: ["*"],
  };
});

/** Written straight to the DB so the availability engine's opening-hours
 *  rules don't stop us placing an appointment at an awkward hour on purpose. */
async function bookRaw(startIso: string, minutes = 60) {
  const startTime = new Date(startIso);
  return prisma.appointment.create({
    data: {
      clinicId: ctx.clinicId,
      patientId,
      practitionerId,
      serviceId,
      startTime,
      endTime: new Date(startTime.getTime() + minutes * 60_000),
      status: "CONFIRMED",
      source: "DASHBOARD",
    },
  });
}

describe("appointmentService.getAppointmentsInRange", () => {
  it("groups an appointment onto its clinic-local date, not its UTC date", async () => {
    // 01:00 on 9 Sep in Karachi is still 8 Sep in UTC — the calendar must
    // show it on the 9th, which is the day the clinic actually works it.
    await bookRaw("2026-09-08T20:00:00Z");

    const rows = await appointmentService.getAppointmentsInRange(ctx, FROM, TO);

    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-09-09");
    expect(rows[0].startLabel).toBe("1:00 AM");
    expect(rows[0].endLabel).toBe("2:00 AM");
  });

  it("resolves the names the calendar renders", async () => {
    await bookRaw("2026-09-09T05:00:00Z"); // 10:00 AM local

    const [row] = await appointmentService.getAppointmentsInRange(ctx, FROM, TO);

    expect(row.patientName).toBe("Sara Ahmed");
    expect(row.practitionerName).toBe("Ayesha Raza");
    expect(row.serviceName).toBe("Hydrafacial");
    expect(row.startLabel).toBe("10:00 AM");
  });

  it("excludes appointments outside the requested window", async () => {
    await bookRaw("2026-09-09T05:00:00Z"); // inside September
    await bookRaw("2026-10-05T05:00:00Z"); // October
    await bookRaw("2026-08-20T05:00:00Z"); // August

    const rows = await appointmentService.getAppointmentsInRange(ctx, FROM, TO);

    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-09-09");
  });

  it("returns cancelled appointments too, so the day still shows its history", async () => {
    const appt = await bookRaw("2026-09-09T05:00:00Z");
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELLED" },
    });

    const rows = await appointmentService.getAppointmentsInRange(ctx, FROM, TO);

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("CANCELLED");
  });

  it("orders a day's appointments by start time", async () => {
    await bookRaw("2026-09-09T09:00:00Z"); // 2:00 PM
    await bookRaw("2026-09-09T05:00:00Z"); // 10:00 AM
    await bookRaw("2026-09-09T07:00:00Z"); // 12:00 PM

    const rows = await appointmentService.getAppointmentsInRange(ctx, FROM, TO);

    expect(rows.map((r) => r.startLabel)).toEqual(["10:00 AM", "12:00 PM", "2:00 PM"]);
  });
});
