import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/reset-db";
import { packageService } from "@/modules/packages/package.service";
import { ActorContext } from "@/lib/auth/types";
import { Channel } from "@prisma/client";

let ctx: ActorContext;
let patientId: string;
let serviceId: string;

beforeEach(async () => {
  await resetDb();
  const clinic = await prisma.clinic.create({ data: { name: "Test Clinic" } });
  const patient = await prisma.patient.create({ data: { clinicId: clinic.id, firstName: "A", lastName: "One" } });
  const service = await prisma.service.create({ data: { clinicId: clinic.id, name: "Hydrafacial", durationMinutes: 60, price: 8000 } });
  patientId = patient.id;
  serviceId = service.id;
  ctx = { actorId: null, actorType: "SYSTEM", clinicId: clinic.id, source: Channel.DASHBOARD, permissions: ["*"] };
});

describe("packageService", () => {
  it("decrements remaining sessions on use and marks COMPLETED once exhausted", async () => {
    const pkg = await packageService.createPackage(ctx, { patientId, serviceId, totalSessions: 2 });
    expect(await packageService.getPackageBalance(ctx, pkg.id)).toBe(2);

    await packageService.useSession(ctx, pkg.id);
    expect(await packageService.getPackageBalance(ctx, pkg.id)).toBe(1);

    await packageService.useSession(ctx, pkg.id);
    expect(await packageService.getPackageBalance(ctx, pkg.id)).toBe(0);

    const final = await prisma.package.findUnique({ where: { id: pkg.id } });
    expect(final!.status).toBe("COMPLETED");
  });

  it("rejects using a session once exhausted", async () => {
    const pkg = await packageService.createPackage(ctx, { patientId, serviceId, totalSessions: 1 });
    await packageService.useSession(ctx, pkg.id);

    await expect(packageService.useSession(ctx, pkg.id)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
