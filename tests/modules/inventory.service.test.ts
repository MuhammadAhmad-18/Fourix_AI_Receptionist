import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/reset-db";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { ActorContext } from "@/lib/auth/types";
import { Channel } from "@prisma/client";

let ctx: ActorContext;

beforeEach(async () => {
  await resetDb();
  const clinic = await prisma.clinic.create({ data: { name: "Test Clinic" } });
  ctx = { actorId: null, actorType: "SYSTEM", clinicId: clinic.id, source: Channel.DASHBOARD, permissions: ["*"] };
});

describe("inventoryService", () => {
  it("tracks quantity on hand across receive + usage", async () => {
    const product = await inventoryService.createProduct(ctx, { name: "Botox Vial", unit: "VIAL", reorderLevel: 5 });
    await inventoryService.receiveBatch(ctx, { productId: product.id, batchNumber: "B1", quantity: 10 });

    const stock = await inventoryService.getStock(ctx, product.id);
    expect(stock).toBe(10);

    await inventoryService.recordStockUsage(ctx, { productId: product.id, quantity: 4 });
    expect(await inventoryService.getStock(ctx, product.id)).toBe(6);
  });

  it("draws from oldest batch first (FIFO) when no batch is specified", async () => {
    const product = await inventoryService.createProduct(ctx, { name: "Filler", unit: "ML", reorderLevel: 5 });
    const batch1 = await inventoryService.receiveBatch(ctx, { productId: product.id, batchNumber: "OLD", quantity: 5 });
    await new Promise((r) => setTimeout(r, 5));
    await inventoryService.receiveBatch(ctx, { productId: product.id, batchNumber: "NEW", quantity: 5 });

    await inventoryService.recordStockUsage(ctx, { productId: product.id, quantity: 7 });

    const refreshedBatch1 = await prisma.productBatch.findUnique({ where: { id: batch1.id } });
    expect(Number(refreshedBatch1!.quantityOnHand)).toBe(0); // fully drained first
  });

  it("rejects usage exceeding total available stock", async () => {
    const product = await inventoryService.createProduct(ctx, { name: "Peel Solution", unit: "ML", reorderLevel: 2 });
    await inventoryService.receiveBatch(ctx, { productId: product.id, batchNumber: "B1", quantity: 3 });

    await expect(
      inventoryService.recordStockUsage(ctx, { productId: product.id, quantity: 10 }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });

    expect(await inventoryService.getStock(ctx, product.id)).toBe(3); // unchanged
  });

  it("flags a product as low stock once quantity drops to the reorder level", async () => {
    const product = await inventoryService.createProduct(ctx, { name: "Hyaluronic Serum", unit: "ML", reorderLevel: 5 });
    await inventoryService.receiveBatch(ctx, { productId: product.id, batchNumber: "B1", quantity: 6 });

    expect(await inventoryService.getLowStockProducts(ctx)).toHaveLength(0);

    await inventoryService.recordStockUsage(ctx, { productId: product.id, quantity: 2 });
    const lowStock = await inventoryService.getLowStockProducts(ctx);
    expect(lowStock.map((p) => p.id)).toContain(product.id);
  });

  it("rejects an adjustment that would drive stock negative", async () => {
    const product = await inventoryService.createProduct(ctx, { name: "Toner", unit: "ML", reorderLevel: 1 });
    const batch = await inventoryService.receiveBatch(ctx, { productId: product.id, batchNumber: "B1", quantity: 2 });

    await expect(
      inventoryService.adjustStock(ctx, { productId: product.id, batchId: batch.id, delta: -5, reason: "damaged" }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
  });

  it("lists batches expiring within the given window", async () => {
    const product = await inventoryService.createProduct(ctx, { name: "Serum", unit: "ML", reorderLevel: 1 });
    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await inventoryService.receiveBatch(ctx, { productId: product.id, batchNumber: "SOON", quantity: 1, expiryDate: soon });
    await inventoryService.receiveBatch(ctx, { productId: product.id, batchNumber: "LATER", quantity: 1, expiryDate: later });

    const expiring = await inventoryService.getExpiringProducts(ctx, 30);
    expect(expiring.map((b) => b.batchNumber)).toEqual(["SOON"]);
  });
});
