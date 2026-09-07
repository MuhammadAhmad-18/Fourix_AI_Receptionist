import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/reset-db";
import { generateApiKey, hashApiKey } from "@/lib/auth/api-client";
import { Permission } from "@/lib/auth/permissions";
import { POST as refundsPost } from "@/app/api/v1/refunds/route";
import { POST as adjustStockPost } from "@/app/api/v1/products/adjust/route";
import { POST as appointmentsPost } from "@/app/api/v1/appointments/route";

let apiKey: string;

beforeEach(async () => {
  await resetDb();
  const clinic = await prisma.clinic.create({ data: { name: "Test Clinic" } });
  const { plaintext, prefix } = generateApiKey();
  apiKey = plaintext;
  await prisma.apiClient.create({
    data: {
      clinicId: clinic.id,
      name: "ai-receptionist",
      keyHash: await hashApiKey(plaintext),
      keyPrefix: prefix,
      scopes: [Permission.AI_APPOINTMENT_CREATE, Permission.AI_APPOINTMENT_READ],
      status: "ACTIVE",
    },
  });
});

function authedRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
}

describe("a scoped ai.appointment.create token", () => {
  it("is rejected (403) on the refund route", async () => {
    const req = authedRequest("http://localhost/api/v1/refunds", { invoiceId: "x", amount: 100 });
    const res = await refundsPost(req);
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("is rejected (403) on the inventory adjust-stock route", async () => {
    const req = authedRequest("http://localhost/api/v1/products/adjust", {
      productId: "x",
      delta: -5,
      reason: "test",
    });
    const res = await adjustStockPost(req);
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("is allowed on the appointment create route (still fails validation for a fake patient, but not on auth)", async () => {
    const req = authedRequest("http://localhost/api/v1/appointments", {
      patientId: "does-not-exist",
      serviceId: "does-not-exist",
      practitionerId: "does-not-exist",
      startTime: "2026-09-09T10:00:00+05:00",
    });
    const res = await appointmentsPost(req);
    const json = await res.json();
    // Not a 403 — the scope is granted; it fails downstream on PATIENT_NOT_FOUND instead.
    expect(res.status).not.toBe(403);
    expect(json.error?.code).not.toBe("FORBIDDEN");
  });
});
