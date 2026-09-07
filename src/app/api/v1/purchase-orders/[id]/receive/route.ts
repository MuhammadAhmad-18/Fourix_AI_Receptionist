import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { purchasingService } from "@/modules/purchasing/purchasing.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  requirePermission(actor, Permission.INVENTORY_MANAGE);
  const { id } = await ctx.params;
  return ok(await purchasingService.receivePurchaseOrder(actor, id));
});
