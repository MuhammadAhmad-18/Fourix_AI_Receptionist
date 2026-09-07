import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { purchasingRepository } from "@/modules/purchasing/purchasing.repository";

export const purchasingService = {
  listSuppliers(ctx: ActorContext) {
    return purchasingRepository.listSuppliers(ctx.clinicId);
  },
  createSupplier(ctx: ActorContext, input: { name: string; phone?: string; email?: string; address?: string }) {
    return purchasingRepository.createSupplier(ctx.clinicId, input);
  },

  listPurchaseOrders(ctx: ActorContext) {
    return purchasingRepository.listPurchaseOrders(ctx.clinicId);
  },
  createPurchaseOrder(
    ctx: ActorContext,
    input: { supplierId: string; items: { productId: string; quantity: number; unitCost: number }[] },
  ) {
    return purchasingRepository.createPurchaseOrder(ctx.clinicId, input.supplierId, input.items);
  },

  /** Receiving a PO creates one inventory batch per line item via InventoryService — no duplicate stock logic here. */
  async receivePurchaseOrder(ctx: ActorContext, id: string) {
    const po = await purchasingRepository.findPurchaseOrder(ctx.clinicId, id);
    if (!po) throw new AppError(ErrorCode.NOT_FOUND, `Purchase order ${id} not found`);

    for (const item of po.items) {
      await inventoryService.receiveBatch(ctx, {
        productId: item.productId,
        batchNumber: `PO-${po.id.slice(-6)}`,
        quantity: Number(item.quantity),
        costPrice: Number(item.unitCost),
      });
    }
    return purchasingRepository.markReceived(id);
  },
};
