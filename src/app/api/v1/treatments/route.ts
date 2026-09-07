import { NextRequest } from "next/server";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { treatmentController } from "@/modules/treatments/treatment.controller";
import { createTreatmentSchema } from "@/modules/treatments/treatment.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return ok([]);
  return ok(await treatmentController.listForPatient(ctx, patientId));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = createTreatmentSchema.parse(await req.json());
  return created(await treatmentController.create(ctx, input));
});
