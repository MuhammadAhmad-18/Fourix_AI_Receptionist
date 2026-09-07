import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { writeAuditLog } from "@/lib/audit";
import { eventBus } from "@/lib/events/bus";
import { productRepository } from "@/modules/inventory/product.repository";
import {
  AdjustStockInput,
  CreateProductInput,
  ReceiveBatchInput,
  RecordStockUsageInput,
} from "@/modules/inventory/product.schema";

export const inventoryService = {
  async listProducts(ctx: ActorContext, opts: { activeOnly?: boolean } = {}) {
    return productRepository.list(ctx.clinicId, opts);
  },

  async getProduct(ctx: ActorContext, id: string) {
    const product = await productRepository.findById(ctx.clinicId, id);
    if (!product) throw new AppError(ErrorCode.NOT_FOUND, `Product ${id} not found`);
    return product;
  },

  async getStock(ctx: ActorContext, id: string): Promise<number> {
    const product = await this.getProduct(ctx, id);
    return product.batches.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
  },

  async getLowStockProducts(ctx: ActorContext) {
    const products = await productRepository.list(ctx.clinicId, { activeOnly: true });
    return products.filter((p) => {
      const onHand = p.batches.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
      return onHand <= Number(p.reorderLevel);
    });
  },

  async getExpiringProducts(ctx: ActorContext, withinDays = 30) {
    return productRepository.expiringBatches(ctx.clinicId, withinDays);
  },

  async createProduct(ctx: ActorContext, input: CreateProductInput) {
    return productRepository.create(ctx.clinicId, input);
  },

  async receiveBatch(ctx: ActorContext, input: ReceiveBatchInput) {
    const product = await this.getProduct(ctx, input.productId);

    return productRepository.runInTransaction(async (tx) => {
      const batch = await productRepository.createBatch(tx, {
        productId: product.id,
        batchNumber: input.batchNumber,
        quantityOnHand: input.quantity,
        costPrice: input.costPrice ?? null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      });
      await productRepository.createTransaction(tx, {
        clinicId: ctx.clinicId,
        productId: product.id,
        batchId: batch.id,
        type: "PURCHASE_RECEIPT",
        quantity: input.quantity,
        actorId: ctx.actorId,
        actorType: ctx.actorType,
      });
      await writeAuditLog(tx, ctx, "inventory.receive_batch", "ProductBatch", batch.id, { quantity: input.quantity });
      return batch;
    });
  },

  /** FIFO by receipt date across batches when a specific batch isn't named. */
  async recordStockUsage(ctx: ActorContext, input: RecordStockUsageInput) {
    const product = await this.getProduct(ctx, input.productId);

    return productRepository.runInTransaction(async (tx) => {
      let remaining = input.quantity;
      const batches = input.batchId
        ? [await productRepository.findBatch(tx, input.batchId)].filter((b) => b !== null)
        : await productRepository.findBatchesForProduct(tx, product.id);

      const totalAvailable = batches.reduce((sum, b) => sum + Number(b!.quantityOnHand), 0);
      if (totalAvailable < remaining) {
        throw new AppError(ErrorCode.INSUFFICIENT_STOCK, `Insufficient stock for product ${product.name}`);
      }

      for (const batch of batches) {
        if (remaining <= 0) break;
        const available = Number(batch!.quantityOnHand);
        if (available <= 0) continue;
        const take = Math.min(available, remaining);

        await productRepository.adjustBatchQuantity(tx, batch!.id, -take);
        await productRepository.createTransaction(tx, {
          clinicId: ctx.clinicId,
          productId: product.id,
          batchId: batch!.id,
          type: "USAGE",
          quantity: -take,
          reason: input.reason ?? null,
          actorId: ctx.actorId,
          actorType: ctx.actorType,
        });
        remaining -= take;
      }

      await writeAuditLog(tx, ctx, "inventory.record_usage", "Product", product.id, { quantity: input.quantity });
      return { productId: product.id, quantityUsed: input.quantity };
    });
  },

  async adjustStock(ctx: ActorContext, input: AdjustStockInput) {
    const product = await this.getProduct(ctx, input.productId);
    const batchId = input.batchId ?? product.batches[0]?.id;
    if (!batchId) throw new AppError(ErrorCode.NOT_FOUND, "No batch available to adjust");

    return productRepository.runInTransaction(async (tx) => {
      const batch = await productRepository.findBatch(tx, batchId);
      if (!batch) throw new AppError(ErrorCode.NOT_FOUND, `Batch ${batchId} not found`);
      if (Number(batch.quantityOnHand) + input.delta < 0) {
        throw new AppError(ErrorCode.INSUFFICIENT_STOCK, "Adjustment would drive stock negative");
      }

      const updated = await productRepository.adjustBatchQuantity(tx, batchId, input.delta);
      await productRepository.createTransaction(tx, {
        clinicId: ctx.clinicId,
        productId: product.id,
        batchId,
        type: "ADJUSTMENT",
        quantity: input.delta,
        reason: input.reason,
        actorId: ctx.actorId,
        actorType: ctx.actorType,
      });
      await writeAuditLog(tx, ctx, "inventory.adjust_stock", "ProductBatch", batchId, { delta: input.delta, reason: input.reason });
      return updated;
    });
  },

  async checkLowStockAndNotify(ctx: ActorContext) {
    const lowStock = await this.getLowStockProducts(ctx);
    for (const product of lowStock) {
      eventBus.publish("InventoryLow", ctx.clinicId, { productId: product.id });
    }
    return lowStock;
  },
};
