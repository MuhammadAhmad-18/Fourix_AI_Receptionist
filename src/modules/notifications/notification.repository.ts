// ONLY file in the notifications module allowed to import PrismaClient.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const notificationRepository = {
  listForRecipient(clinicId: string, recipient: string) {
    return prisma.notification.findMany({ where: { clinicId, recipient }, orderBy: { createdAt: "desc" } });
  },
  create(data: Prisma.NotificationUncheckedCreateInput) {
    return prisma.notification.create({ data });
  },
  markRead(clinicId: string, id: string) {
    return prisma.notification.updateMany({ where: { id, clinicId }, data: { status: "READ", readAt: new Date() } });
  },
  updateStatus(id: string, status: "SENT" | "FAILED") {
    return prisma.notification.update({ where: { id }, data: { status } });
  },
};
