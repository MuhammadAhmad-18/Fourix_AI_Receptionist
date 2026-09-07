import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors/codes";

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function hashPayload(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * Runs `fn` at most once per (key, operation). A repeat call with the same
 * key + operation + payload returns the stored result instead of re-running
 * fn. A repeat call with the same key but a different payload is rejected —
 * this catches a caller reusing a key across unrelated requests.
 *
 * Insert-first: the unique (key, operation) constraint on IdempotencyKey is
 * the mutex, so two concurrent requests with the same key can't both
 * proceed even under READ COMMITTED.
 */
export async function withIdempotency<T>(
  key: string | undefined | null,
  operation: string,
  payload: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  if (!key) return fn();

  const requestHash = hashPayload(payload);

  try {
    await prisma.idempotencyKey.create({
      data: { key, operation, requestHash, status: "IN_PROGRESS", expiresAt: new Date(Date.now() + TTL_MS) },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.idempotencyKey.findUniqueOrThrow({
        where: { key_operation: { key, operation } },
      });
      if (existing.requestHash !== requestHash) {
        throw new AppError(ErrorCode.IDEMPOTENCY_KEY_REUSED, "Idempotency key reused with a different payload");
      }
      if (existing.status === "COMPLETED") {
        return existing.responseBody as T;
      }
      throw new AppError(ErrorCode.IDEMPOTENT_REQUEST_IN_PROGRESS, "Request with this idempotency key is still in progress");
    }
    throw err;
  }

  try {
    const result = await fn();
    await prisma.idempotencyKey.update({
      where: { key_operation: { key, operation } },
      data: { status: "COMPLETED", responseBody: result as Prisma.InputJsonValue },
    });
    return result;
  } catch (err) {
    // Release the mutex so a corrected retry can proceed.
    await prisma.idempotencyKey.delete({ where: { key_operation: { key, operation } } }).catch(() => {});
    throw err;
  }
}
