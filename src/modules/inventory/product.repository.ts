// ONLY file in the inventory module allowed to import PrismaClient.
import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

type TxClient = Prisma.TransactionClient | PrismaClient;

export const productRepository = {
  findById(clinicId: string, id: string) {
    return prisma.product.findFirst({ where: { id, clinicId }, include: { batches: true } });
  },

  list(clinicId: string, opts: { activeOnly?: boolean } = {}) {
    return prisma.product.findMany({
      where: { clinicId, ...(opts.activeOnly ? { active: true } : {}) },
      include: { batches: true },
      orderBy: { name: "asc" },
    });
  },

  create(clinicId: string, data: Omit<Prisma.ProductUncheckedCreateInput, "clinicId">) {
    return prisma.product.create({ data: { ...data, clinicId } });
  },

  async findBatch(tx: TxClient, batchId: string) {
    return tx.productBatch.findUnique({ where: { id: batchId } });
  },

  async findBatchesForProduct(tx: TxClient, productId: string) {
    return tx.productBatch.findMany({ where: { productId }, orderBy: { receivedAt: "asc" } });
  },

  createBatch(tx: TxClient, data: Prisma.ProductBatchUncheckedCreateInput) {
    return tx.productBatch.create({ data });
  },

  async adjustBatchQuantity(tx: TxClient, batchId: string, delta: number) {
    return tx.productBatch.update({
      where: { id: batchId },
      data: { quantityOnHand: { increment: delta } },
    });
  },

  createTransaction(tx: TxClient, data: Prisma.InventoryTransactionUncheckedCreateInput) {
    return tx.inventoryTransaction.create({ data });
  },

  expiringBatches(clinicId: string, withinDays: number) {
    const threshold = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
    return prisma.productBatch.findMany({
      where: { product: { clinicId }, expiryDate: { lte: threshold, not: null }, quantityOnHand: { gt: 0 } },
      include: { product: true },
      orderBy: { expiryDate: "asc" },
    });
  },

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(fn);
  },
};
