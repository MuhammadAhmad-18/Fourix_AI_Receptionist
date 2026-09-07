import { prisma } from "@/lib/db";
import { notificationService } from "@/modules/notifications/notification.service";
import { ActorContext } from "@/lib/auth/types";
import { Channel } from "@prisma/client";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;

// Maps outbox event types to an outbound notification. Extend this as new
// domain events need external delivery (Phase 2 will add WhatsApp here).
const EVENT_HANDLERS: Record<string, (payload: Record<string, unknown>, ctx: ActorContext) => Promise<void>> = {
  AppointmentCreated: async (payload, ctx) => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: payload.appointmentId as string },
      include: { patient: true },
    });
    if (!appointment?.patient.email) return;
    await notificationService.notify(ctx, {
      recipient: appointment.patient.email,
      channel: "EMAIL",
      subject: "Appointment Confirmed",
      body: `Your appointment is scheduled for ${appointment.startTime.toISOString()}.`,
    });
  },
  AppointmentCancelled: async (payload, ctx) => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: payload.appointmentId as string },
      include: { patient: true },
    });
    if (!appointment?.patient.email) return;
    await notificationService.notify(ctx, {
      recipient: appointment.patient.email,
      channel: "EMAIL",
      subject: "Appointment Cancelled",
      body: `Your appointment on ${appointment.startTime.toISOString()} has been cancelled.`,
    });
  },
  PaymentReceived: async () => {
    // Extend: send a receipt email once FinanceService exposes invoice PDF generation.
  },
};

/** Processes one batch of pending outbox events. Safe to call repeatedly (e.g. from a cron/poll loop). */
export async function processOutboxOnce(): Promise<{ processed: number; failed: number }> {
  const events = await prisma.outboxEvent.findMany({
    where: { status: "PENDING", availableAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: "PROCESSING" } });

    const handler = EVENT_HANDLERS[event.eventType];
    const ctx: ActorContext = {
      actorId: null,
      actorType: "SYSTEM",
      clinicId: event.clinicId,
      source: Channel.DASHBOARD,
      permissions: ["*"],
    };

    try {
      if (handler) await handler(event.payload as Record<string, unknown>, ctx);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: "SENT", processedAt: new Date() },
      });
      processed++;
    } catch (err) {
      const attempts = event.attempts + 1;
      const isDead = attempts >= MAX_ATTEMPTS;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: isDead ? "DEAD_LETTER" : "PENDING",
          attempts,
          lastError: err instanceof Error ? err.message : String(err),
          // Exponential backoff before the next retry.
          availableAt: new Date(Date.now() + Math.min(2 ** attempts, 60) * 1000),
        },
      });
      failed++;
    }
  }

  return { processed, failed };
}

let workerHandle: NodeJS.Timeout | null = null;

/** Starts an in-process poll loop. Called once from instrumentation.ts on server boot (target A only). */
export function startOutboxWorker(intervalMs = 10_000) {
  if (workerHandle) return;
  workerHandle = setInterval(() => {
    processOutboxOnce().catch((err) => console.error("Outbox worker error:", err));
  }, intervalMs);
}
