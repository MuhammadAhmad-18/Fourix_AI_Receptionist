import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/reset-db";
import { serviceCatalogService } from "@/modules/services/service.service";
import { practitionerService } from "@/modules/practitioners/practitioner.service";
import { ActorContext } from "@/lib/auth/types";
import { Channel } from "@prisma/client";

let ctx: ActorContext;
let patientId: string;

beforeEach(async () => {
  await resetDb();
  const clinic = await prisma.clinic.create({
    data: { name: "Test Clinic", timezone: "Asia/Karachi" },
  });
  const patient = await prisma.patient.create({
    data: { clinicId: clinic.id, firstName: "Sara", lastName: "Ahmed" },
  });
  patientId = patient.id;
  ctx = {
    actorId: null,
    actorType: "SYSTEM",
    clinicId: clinic.id,
    source: Channel.DASHBOARD,
    permissions: ["*"],
  };
});

function newService() {
  return serviceCatalogService.createService(ctx, {
    name: "Hydrafacial",
    durationMinutes: 60,
    price: 8000,
    requiresConsultation: false,
    requiresConsent: false,
    requiresPractitioner: true,
  });
}

function newPractitioner() {
  return practitionerService.createPractitioner(ctx, {
    firstName: "Ayesha",
    lastName: "Raza",
    title: "Dr.",
    specialties: ["Injectables"],
    phone: "03001234567",
  });
}

/** Booking is what makes a service/practitioner part of the clinic's history. */
async function book(serviceId: string, practitionerId: string) {
  return prisma.appointment.create({
    data: {
      clinicId: ctx.clinicId,
      patientId,
      practitionerId,
      serviceId,
      startTime: new Date("2026-09-09T05:00:00Z"),
      endTime: new Date("2026-09-09T06:00:00Z"),
      status: "CONFIRMED",
      source: "DASHBOARD",
    },
  });
}

describe("service catalog CRUD", () => {
  it("creates, edits and reads back a service", async () => {
    const created = await newService();
    expect(created.name).toBe("Hydrafacial");

    await serviceCatalogService.updateService(ctx, created.id, {
      name: "Hydrafacial Deluxe",
      price: 9500,
    });

    const updated = await serviceCatalogService.getService(ctx, created.id);
    expect(updated.name).toBe("Hydrafacial Deluxe");
    expect(Number(updated.price)).toBe(9500);
    expect(updated.durationMinutes).toBe(60); // untouched fields survive
  });

  it("deactivates and reactivates without deleting", async () => {
    const service = await newService();

    await serviceCatalogService.updateService(ctx, service.id, { active: false });
    expect((await serviceCatalogService.getService(ctx, service.id)).active).toBe(false);
    // Deactivated services drop out of the bookable list but still exist.
    expect(await serviceCatalogService.listServices(ctx, { activeOnly: true })).toHaveLength(0);
    expect(await serviceCatalogService.listServices(ctx)).toHaveLength(1);

    await serviceCatalogService.updateService(ctx, service.id, { active: true });
    expect((await serviceCatalogService.getService(ctx, service.id)).active).toBe(true);
  });

  it("deletes a service that has never been used", async () => {
    const service = await newService();
    await serviceCatalogService.deleteService(ctx, service.id);

    await expect(serviceCatalogService.getService(ctx, service.id)).rejects.toMatchObject({
      code: "SERVICE_NOT_FOUND",
    });
  });

  it("refuses to delete a service that has been booked, and leaves it intact", async () => {
    const service = await newService();
    const practitioner = await newPractitioner();
    await book(service.id, practitioner.id);

    await expect(serviceCatalogService.deleteService(ctx, service.id)).rejects.toMatchObject({
      code: "SERVICE_IN_USE",
    });

    // The guard must not have partially deleted anything.
    expect(await serviceCatalogService.getService(ctx, service.id)).toBeTruthy();
    expect(await prisma.appointment.count()).toBe(1);
  });
});

describe("practitioner CRUD", () => {
  it("edits fields that live on the practitioner and on its employee row", async () => {
    const practitioner = await newPractitioner();

    await practitionerService.updatePractitioner(ctx, practitioner.id, {
      firstName: "Ayesha",
      lastName: "Khan",
      title: "Consultant",
      specialties: ["Injectables", "Laser"],
      phone: "0321 111 2233",
    });

    const updated = await practitionerService.getPractitioner(ctx, practitioner.id);
    expect(updated.employee.lastName).toBe("Khan"); // employee row
    expect(updated.title).toBe("Consultant"); // practitioner row
    expect(updated.specialties).toEqual(["Injectables", "Laser"]);
    expect(updated.employee.phoneE164).toBe("+923211112233"); // normalized on write
  });

  it("deactivating stands down both the practitioner and the employee record", async () => {
    const practitioner = await newPractitioner();

    await practitionerService.updatePractitioner(ctx, practitioner.id, { active: false });

    const updated = await practitionerService.getPractitioner(ctx, practitioner.id);
    expect(updated.active).toBe(false);
    expect(updated.employee.active).toBe(false);
    expect(await practitionerService.listPractitioners(ctx, { activeOnly: true })).toHaveLength(0);
  });

  it("deletes an unused practitioner along with its employee record", async () => {
    const practitioner = await newPractitioner();
    const employeeId = practitioner.employeeId;

    await practitionerService.deletePractitioner(ctx, practitioner.id);

    await expect(
      practitionerService.getPractitioner(ctx, practitioner.id)
    ).rejects.toMatchObject({ code: "PRACTITIONER_NOT_FOUND" });
    expect(await prisma.employee.findUnique({ where: { id: employeeId } })).toBeNull();
  });

  it("refuses to delete a practitioner who has appointments", async () => {
    const service = await newService();
    const practitioner = await newPractitioner();
    await book(service.id, practitioner.id);

    await expect(
      practitionerService.deletePractitioner(ctx, practitioner.id)
    ).rejects.toMatchObject({ code: "PRACTITIONER_IN_USE" });

    expect(await practitionerService.getPractitioner(ctx, practitioner.id)).toBeTruthy();
  });

  it("deleting a practitioner clears their schedule rows", async () => {
    const practitioner = await newPractitioner();
    await practitionerService.setSchedules(ctx, practitioner.id, [
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
    ]);

    await practitionerService.deletePractitioner(ctx, practitioner.id);

    expect(await prisma.practitionerSchedule.count()).toBe(0);
  });
});
