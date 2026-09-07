import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/reset-db";
import { patientService } from "@/modules/patients/patient.service";
import { ActorContext } from "@/lib/auth/types";
import { Channel } from "@prisma/client";

let ctx: ActorContext;

beforeEach(async () => {
  await resetDb();
  const clinic = await prisma.clinic.create({ data: { name: "Test Clinic" } });
  ctx = { actorId: null, actorType: "SYSTEM", clinicId: clinic.id, source: Channel.DASHBOARD, permissions: ["*"] };
});

describe("patientService.createPatient", () => {
  it("normalizes phone numbers to E.164", async () => {
    const patient = await patientService.createPatient(ctx, {
      firstName: "Ayesha",
      lastName: "Khan",
      gender: "FEMALE",
      source: "WALK_IN",
      phone: "03001234567",
    });
    expect(patient.phoneE164).toBe("+923001234567");
    expect(patient.phoneRaw).toBe("03001234567");
  });

  it("repeated calls with the same idempotency key create exactly one row", async () => {
    const input = {
      firstName: "Bilal",
      lastName: "Ahmed",
      gender: "MALE" as const,
      source: "PHONE" as const,
      phone: "+923001112222",
      idempotencyKey: "test-key-1",
    };

    const first = await patientService.createPatient(ctx, input);
    const second = await patientService.createPatient(ctx, input);

    expect(second.id).toBe(first.id);
    const count = await prisma.patient.count({ where: { clinicId: ctx.clinicId } });
    expect(count).toBe(1);
  });

  it("rejects a reused key with a different payload", async () => {
    await patientService.createPatient(ctx, {
      firstName: "Sana",
      lastName: "Malik",
      gender: "FEMALE",
      source: "WEBSITE",
      idempotencyKey: "test-key-2",
    });

    await expect(
      patientService.createPatient(ctx, {
        firstName: "Different",
        lastName: "Person",
        gender: "MALE",
        source: "WEBSITE",
        idempotencyKey: "test-key-2",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });
});

describe("patientService.searchPatient", () => {
  it("finds a patient by normalized phone", async () => {
    await patientService.createPatient(ctx, {
      firstName: "Zara",
      lastName: "Iqbal",
      gender: "FEMALE",
      source: "WALK_IN",
      phone: "0300 111 2233",
    });

    const results = await patientService.searchPatient(ctx, { phone: "+923001112233", limit: 20 });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe("Zara");
  });
});
