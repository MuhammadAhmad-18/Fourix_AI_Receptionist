// Next.js instrumentation hook — runs once when the server process starts.
// Deployment target A (self-hosted Node, long-lived process) only: this is
// how the transactional-outbox worker and idempotency-key cleanup run
// in-process without a separate cron service. On target B (serverless) this
// would need to move to Vercel Cron hitting a route handler instead, since
// there is no long-lived process to hold a setInterval.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startOutboxWorker } = await import("@/jobs/outbox-worker");
  const { purgeExpiredIdempotencyKeys } = await import("@/jobs/idempotency-cleanup");

  startOutboxWorker(10_000);
  setInterval(() => {
    purgeExpiredIdempotencyKeys().catch((err) => console.error("Idempotency cleanup error:", err));
  }, 60 * 60 * 1000);
}
