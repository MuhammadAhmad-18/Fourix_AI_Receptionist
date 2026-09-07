import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { purchasingService } from "@/modules/purchasing/purchasing.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createPurchaseOrderSchema = z.object({
  supplierId: z.string(),
  items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().positive(), unitCost: z.coerce.number().min(0) })),
});

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  requirePermission(ctx, Permission.INVENTORY_READ);
  return ok(await purchasingService.listPurchaseOrders(ctx));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  requirePermission(ctx, Permission.INVENTORY_MANAGE);
  const input = createPurchaseOrderSchema.parse(await req.json());
  return created(await purchasingService.createPurchaseOrder(ctx, input));
});
