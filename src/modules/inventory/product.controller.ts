import { ActorContext } from "@/lib/auth/types";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { inventoryService } from "@/modules/inventory/inventory.service";
import {
  AdjustStockInput,
  CreateProductInput,
  ReceiveBatchInput,
  RecordStockUsageInput,
  toProductOutput,
} from "@/modules/inventory/product.schema";

export const productController = {
  async list(ctx: ActorContext, activeOnly = false) {
    requirePermission(ctx, Permission.INVENTORY_READ);
    const products = await inventoryService.listProducts(ctx, { activeOnly });
    return products.map(toProductOutput);
  },
  async get(ctx: ActorContext, id: string) {
    requirePermission(ctx, Permission.INVENTORY_READ);
    return toProductOutput(await inventoryService.getProduct(ctx, id));
  },
  async lowStock(ctx: ActorContext) {
    requirePermission(ctx, Permission.INVENTORY_READ);
    const products = await inventoryService.getLowStockProducts(ctx);
    return products.map(toProductOutput);
  },
  async expiring(ctx: ActorContext, withinDays?: number) {
    requirePermission(ctx, Permission.INVENTORY_READ);
    return inventoryService.getExpiringProducts(ctx, withinDays);
  },
  async create(ctx: ActorContext, input: CreateProductInput) {
    requirePermission(ctx, Permission.INVENTORY_MANAGE);
    return toProductOutput(await inventoryService.createProduct(ctx, input));
  },
  async receiveBatch(ctx: ActorContext, input: ReceiveBatchInput) {
    requirePermission(ctx, Permission.INVENTORY_MANAGE);
    return inventoryService.receiveBatch(ctx, input);
  },
  async recordUsage(ctx: ActorContext, input: RecordStockUsageInput) {
    requirePermission(ctx, Permission.INVENTORY_MANAGE);
    return inventoryService.recordStockUsage(ctx, input);
  },
  async adjust(ctx: ActorContext, input: AdjustStockInput) {
    requirePermission(ctx, Permission.INVENTORY_MANAGE);
    return inventoryService.adjustStock(ctx, input);
  },
};
