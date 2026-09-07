import { ActorContext } from "@/lib/auth/types";
import { notificationService } from "@/modules/notifications/notification.service";

export const notificationController = {
  async listMine(ctx: ActorContext) {
    if (!ctx.actorId) return [];
    return notificationService.listForRecipient(ctx, ctx.actorId);
  },
  async markRead(ctx: ActorContext, id: string) {
    return notificationService.markRead(ctx, id);
  },
};
