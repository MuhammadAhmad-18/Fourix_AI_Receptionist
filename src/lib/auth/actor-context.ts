import { NextRequest } from "next/server";
import { Channel } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveApiClient } from "@/lib/auth/api-client";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { ActorContext } from "@/lib/auth/types";
import { AI_TO_BASE_PERMISSION } from "@/lib/auth/permissions";

async function permissionsForUser(userId: string): Promise<string[]> {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  const perms = new Set<string>();
  for (const ur of roles) {
    for (const rp of ur.role.permissions) perms.add(rp.permission.key);
  }
  return Array.from(perms);
}

/** For Server Components / Server Actions: reads the human session in-process, no HTTP round trip. */
export async function getActorContextFromSession(): Promise<ActorContext> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const clinicId = (session?.user as { clinicId?: string } | undefined)?.clinicId;
  if (!userId || !clinicId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, "No active session");
  }
  return {
    actorId: userId,
    actorType: "USER",
    clinicId,
    source: Channel.DASHBOARD,
    permissions: await permissionsForUser(userId),
  };
}

/**
 * For /api/v1 route handlers: accepts either a Bearer ApiClient key (machine
 * clients — Phase 2's entry point) or a human session cookie. Both resolve
 * to the same ActorContext shape so downstream services never care which.
 */
export async function getActorContextFromRequest(req: NextRequest): Promise<ActorContext> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    const client = await resolveApiClient(token);
    if (!client) throw new AppError(ErrorCode.UNAUTHORIZED, "Invalid or disabled API key");
    // Machine clients (Phase 2 AI receptionist) hold ai.* scopes, which map
    // onto the same base permission keys the dashboard's roles use — so
    // requirePermission() has exactly one thing to check, regardless of
    // caller. An ai.* scope grants ONLY its mapped base permission, never
    // the raw scope string itself, so a client can't be given an unmapped
    // sensitive permission (refunds, inventory writes, ...) by mistake.
    const mappedPermissions = client.scopes
      .map((scope) => AI_TO_BASE_PERMISSION[scope])
      .filter((p): p is string => Boolean(p));
    return {
      actorId: client.id,
      actorType: "API_CLIENT",
      clinicId: client.clinicId,
      source: Channel.AI_AGENT,
      permissions: mappedPermissions,
    };
  }

  return getActorContextFromSession();
}
