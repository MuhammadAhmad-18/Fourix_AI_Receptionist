import { AppError, ErrorCode } from "@/lib/errors/codes";

// In-memory fixed-window limiter. Valid for deployment target A
// (self-hosted, single long-lived process — see ENVIRONMENT.md). Moving to
// target B (serverless/multi-instance) requires swapping this for an
// external store (Redis/Upstash) since counters here do not survive across
// instances.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    throw new AppError(ErrorCode.RATE_LIMITED, "Too many requests, please try again later");
  }
  bucket.count += 1;
}
