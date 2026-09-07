import argon2 from "argon2";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

const KEY_PREFIX_LENGTH = 10;

export function generateApiKey(): { plaintext: string; prefix: string } {
  const plaintext = `fx_${crypto.randomBytes(24).toString("hex")}`;
  return { plaintext, prefix: plaintext.slice(0, KEY_PREFIX_LENGTH) };
}

export async function hashApiKey(plaintext: string): Promise<string> {
  return argon2.hash(plaintext);
}

/** Resolves a raw bearer token to its ApiClient row, verifying the hash. Returns null if invalid/disabled. */
export async function resolveApiClient(bearerToken: string) {
  const prefix = bearerToken.slice(0, KEY_PREFIX_LENGTH);
  const candidates = await prisma.apiClient.findMany({ where: { keyPrefix: prefix, status: "ACTIVE" } });

  for (const candidate of candidates) {
    if (await argon2.verify(candidate.keyHash, bearerToken)) {
      await prisma.apiClient.update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } });
      return candidate;
    }
  }
  return null;
}
