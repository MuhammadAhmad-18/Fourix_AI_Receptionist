import { Prisma, PrismaClient } from "@prisma/client";
import { ActorContext } from "@/lib/auth/types";

type TxClient = Prisma.TransactionClient | PrismaClient;

export async function writeAuditLog(
  tx: TxClient,
  ctx: ActorContext,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  await tx.auditLog.create({
    data: {
      clinicId: ctx.clinicId,
      actorId: ctx.actorType === "USER" ? ctx.actorId : null,
      actorType: ctx.actorType,
      action,
      entityType,
      entityId,
      source: ctx.source,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
