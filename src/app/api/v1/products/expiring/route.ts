import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { productController } from "@/modules/inventory/product.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const within = req.nextUrl.searchParams.get("withinDays");
  return ok(await productController.expiring(ctx, within ? Number(within) : undefined));
});
