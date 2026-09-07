import { prisma } from "@/lib/db";

/** Purges expired idempotency keys (24h TTL, set at creation). Run periodically, not per-request. */
export async function purgeExpiredIdempotencyKeys(): Promise<number> {
  const { count } = await prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return count;
}
