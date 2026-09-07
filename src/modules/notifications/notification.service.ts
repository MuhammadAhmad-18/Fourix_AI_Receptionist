import { NotificationChannel } from "@prisma/client";
import { ActorContext } from "@/lib/auth/types";
import { notificationRepository } from "@/modules/notifications/notification.repository";

/**
 * Channel providers. Phase 1 wires Email (console/dev provider — swap for
 * a real SMTP/SES provider in production) and in-app only. Phase 2 adds
 * WhatsApp/Messenger/Instagram providers here without touching callers —
 * every caller goes through notify(), never a provider directly.
 */
interface NotificationProvider {
  send(recipient: string, subject: string | undefined, body: string): Promise<void>;
}

class ConsoleEmailProvider implements NotificationProvider {
  async send(recipient: string, subject: string | undefined, body: string) {
    console.log(`[email] to=${recipient} subject="${subject ?? ""}" body="${body}"`);
  }
}

class InAppProvider implements NotificationProvider {
  async send() {
    // In-app notifications are the Notification row itself; nothing to dispatch.
  }
}

const PROVIDERS: Partial<Record<NotificationChannel, NotificationProvider>> = {
  EMAIL: new ConsoleEmailProvider(),
  IN_APP: new InAppProvider(),
};

export const notificationService = {
  async notify(
    ctx: ActorContext,
    input: { recipient: string; channel: NotificationChannel; subject?: string; body: string },
  ) {
    const record = await notificationRepository.create({
      clinicId: ctx.clinicId,
      recipient: input.recipient,
      channel: input.channel,
      subject: input.subject ?? null,
      body: input.body,
      status: "PENDING",
    });

    const provider = PROVIDERS[input.channel];
    if (!provider) {
      // Phase 2 channel not yet wired — leave PENDING for the outbox worker
      // or a future provider registration rather than failing the caller.
      return record;
    }

    try {
      await provider.send(input.recipient, input.subject, input.body);
      return notificationRepository.updateStatus(record.id, "SENT");
    } catch {
      return notificationRepository.updateStatus(record.id, "FAILED");
    }
  },

  async listForRecipient(ctx: ActorContext, recipient: string) {
    return notificationRepository.listForRecipient(ctx.clinicId, recipient);
  },

  async markRead(ctx: ActorContext, id: string) {
    return notificationRepository.markRead(ctx.clinicId, id);
  },
};
