// ONLY file in the purchasing module allowed to import PrismaClient.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const purchasingRepository = {
  listSuppliers(clinicId: string) {
    return prisma.supplier.findMany({ where: { clinicId }, orderBy: { name: "asc" } });
  },
  createSupplier(clinicId: string, data: Omit<Prisma.SupplierUncheckedCreateInput, "clinicId">) {
    return prisma.supplier.create({ data: { ...data, clinicId } });
  },

  listPurchaseOrders(clinicId: string) {
    return prisma.purchaseOrder.findMany({
      where: { clinicId },
      include: { supplier: true, items: true },
      orderBy: { createdAt: "desc" },
    });
  },
  createPurchaseOrder(clinicId: string, supplierId: string, items: { productId: string; quantity: number; unitCost: number }[]) {
    return prisma.purchaseOrder.create({
      data: {
        clinicId,
        supplierId,
        status: "DRAFT",
        items: { create: items },
      },
      include: { items: true },
    });
  },
  findPurchaseOrder(clinicId: string, id: string) {
    return prisma.purchaseOrder.findFirst({ where: { id, clinicId }, include: { items: true } });
  },
  markReceived(id: string) {
    return prisma.purchaseOrder.update({ where: { id }, data: { status: "RECEIVED", receivedAt: new Date() } });
  },
};
