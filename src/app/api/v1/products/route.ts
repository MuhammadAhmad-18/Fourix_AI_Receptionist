import { NextRequest } from "next/server";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { productController } from "@/modules/inventory/product.controller";
import { createProductSchema } from "@/modules/inventory/product.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
  return ok(await productController.list(ctx, activeOnly));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = createProductSchema.parse(await req.json());
  return created(await productController.create(ctx, input));
});
