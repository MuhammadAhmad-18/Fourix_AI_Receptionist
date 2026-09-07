import { NextRequest } from "next/server";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { financeController } from "@/modules/finance/finance.controller";
import { createInvoiceSchema } from "@/modules/finance/finance.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return ok([]);
  return ok(await financeController.listForPatient(ctx, patientId));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = createInvoiceSchema.parse(await req.json());
  return created(await financeController.createInvoice(ctx, input));
});
