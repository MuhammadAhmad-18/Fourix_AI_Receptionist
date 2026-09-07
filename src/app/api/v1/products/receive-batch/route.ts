import { NextRequest } from "next/server";
import { withApiHandler, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { productController } from "@/modules/inventory/product.controller";
import { receiveBatchSchema } from "@/modules/inventory/product.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = receiveBatchSchema.parse(await req.json());
  return created(await productController.receiveBatch(ctx, input));
});
