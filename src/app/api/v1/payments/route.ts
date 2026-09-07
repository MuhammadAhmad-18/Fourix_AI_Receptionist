import { NextRequest } from "next/server";
import { withApiHandler, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { financeController } from "@/modules/finance/finance.controller";
import { recordPaymentSchema } from "@/modules/finance/finance.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined;
  const input = recordPaymentSchema.parse({ ...(await req.json()), idempotencyKey });
  return created(await financeController.recordPayment(ctx, input));
});
