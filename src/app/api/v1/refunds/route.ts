import { NextRequest } from "next/server";
import { withApiHandler, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { financeController } from "@/modules/finance/finance.controller";
import { createRefundSchema } from "@/modules/finance/finance.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = createRefundSchema.parse(await req.json());
  return created(await financeController.createRefund(ctx, input));
});
