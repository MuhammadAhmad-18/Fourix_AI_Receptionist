import { NextRequest } from "next/server";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { consentController } from "@/modules/consents/consent.controller";
import { createConsentSchema } from "@/modules/consents/consent.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return ok([]);
  return ok(await consentController.listForPatient(ctx, patientId));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = createConsentSchema.parse(await req.json());
  return created(await consentController.create(ctx, input));
});
