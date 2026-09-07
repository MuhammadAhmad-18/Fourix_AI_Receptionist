import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { productController } from "@/modules/inventory/product.controller";
import { adjustStockSchema } from "@/modules/inventory/product.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = adjustStockSchema.parse(await req.json());
  return ok(await productController.adjust(ctx, input));
});
