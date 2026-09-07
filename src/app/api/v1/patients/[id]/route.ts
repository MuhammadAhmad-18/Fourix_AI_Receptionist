import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { patientController } from "@/modules/patients/patient.controller";
import { updatePatientSchema } from "@/modules/patients/patient.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  const patient = await patientController.get(actor, id);
  return ok(patient);
});

export const PATCH = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  const body = await req.json();
  const input = updatePatientSchema.parse(body);
  const patient = await patientController.update(actor, id, input);
  return ok(patient);
});
