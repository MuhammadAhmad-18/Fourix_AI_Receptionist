import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { purchasingService } from "@/modules/purchasing/purchasing.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSupplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  requirePermission(ctx, Permission.INVENTORY_READ);
  return ok(await purchasingService.listSuppliers(ctx));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  requirePermission(ctx, Permission.INVENTORY_MANAGE);
  const input = createSupplierSchema.parse(await req.json());
  return created(await purchasingService.createSupplier(ctx, input));
});
