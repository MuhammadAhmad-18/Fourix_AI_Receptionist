import { Prisma, PrismaClient } from "@prisma/client";
import { DomainEventName } from "@/lib/events/bus";

type TxClient = Prisma.TransactionClient | PrismaClient;

/**
 * Writes an OutboxEvent row inside the caller's transaction. A worker
 * (src/jobs/outbox-worker.ts) polls PENDING rows and dispatches them with
 * retry + dead-letter, so a crash between commit and delivery cannot
 * silently drop an outbound notification (email now; WhatsApp in Phase 2).
 */
export async function writeOutboxEvent(
  tx: TxClient,
  clinicId: string,
  eventType: DomainEventName,
  payload: Record<string, unknown>,
) {
  await tx.outboxEvent.create({
    data: { clinicId, eventType, payload: payload as Prisma.InputJsonValue },
  });
}
