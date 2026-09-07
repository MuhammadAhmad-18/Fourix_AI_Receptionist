import { describe, expect, it } from "vitest";
import { requirePermission, Permission, AI_TO_BASE_PERMISSION } from "@/lib/auth/permissions";
import { ActorContext } from "@/lib/auth/types";
import { Channel } from "@prisma/client";

/**
 * Simulates the mapping actor-context.ts applies to an ApiClient's ai.*
 * scopes before requirePermission ever sees them (see AI_TO_BASE_PERMISSION).
 */
function ctxForScopes(scopes: string[]): ActorContext {
  const permissions = scopes.map((s) => AI_TO_BASE_PERMISSION[s]).filter((p): p is string => Boolean(p));
  return { actorId: "api-client-1", actorType: "API_CLIENT", clinicId: "clinic-1", source: Channel.AI_AGENT, permissions };
}

describe("AI receptionist scope enforcement", () => {
  it("a client scoped only to ai.appointment.create may create appointments", () => {
    const ctx = ctxForScopes([Permission.AI_APPOINTMENT_CREATE]);
    expect(() => requirePermission(ctx, Permission.APPOINTMENT_CREATE)).not.toThrow();
  });

  it("is rejected on finance/refund operations", () => {
    const ctx = ctxForScopes([Permission.AI_APPOINTMENT_CREATE, Permission.AI_APPOINTMENT_READ]);
    expect(() => requirePermission(ctx, Permission.REFUND_MANAGE)).toThrow(/FORBIDDEN|Missing required permission/);
    expect(() => requirePermission(ctx, Permission.FINANCE_MANAGE)).toThrow();
  });

  it("is rejected on inventory writes", () => {
    const ctx = ctxForScopes([Permission.AI_APPOINTMENT_CREATE]);
    expect(() => requirePermission(ctx, Permission.INVENTORY_MANAGE)).toThrow();
  });

  it("is rejected on employee management", () => {
    const ctx = ctxForScopes([Permission.AI_APPOINTMENT_CREATE, Permission.AI_PATIENT_CREATE]);
    expect(() => requirePermission(ctx, Permission.EMPLOYEE_MANAGE)).toThrow();
  });

  it("a raw ai.* scope string never grants its own permission directly (only the mapped base key does)", () => {
    const ctx: ActorContext = {
      actorId: "x",
      actorType: "API_CLIENT",
      clinicId: "clinic-1",
      source: Channel.AI_AGENT,
      permissions: ["ai.appointment.create"], // unmapped raw scope, as if mapping were skipped
    };
    expect(() => requirePermission(ctx, Permission.APPOINTMENT_CREATE)).toThrow();
  });
});
