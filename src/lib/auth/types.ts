import { ActorType, Channel } from "@prisma/client";

/**
 * Passed explicitly into every service method instead of services reading
 * headers/cookies themselves. This is what lets Phase 2 (AI tool calls),
 * the seed script, and tests call the exact same service code as the
 * dashboard.
 */
export interface ActorContext {
  actorId: string | null;
  actorType: ActorType;
  clinicId: string;
  source: Channel;
  permissions: string[];
}

export function actorHasPermission(ctx: ActorContext, permission: string): boolean {
  return ctx.permissions.includes(permission) || ctx.permissions.includes("*");
}
