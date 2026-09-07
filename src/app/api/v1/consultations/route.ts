import { NextRequest } from "next/server";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { consultationController } from "@/modules/consultations/consultation.controller";
import { createConsultationSchema } from "@/modules/consultations/consultation.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return ok([]);
  return ok(await consultationController.listForPatient(ctx, patientId));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = createConsultationSchema.parse(await req.json());
  return created(await consultationController.create(ctx, input));
});
