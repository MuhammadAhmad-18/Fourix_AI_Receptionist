import { NextRequest } from "next/server";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { rateLimit } from "@/lib/rate-limit";
import { patientController } from "@/modules/patients/patient.controller";
import { createPatientSchema, searchPatientSchema } from "@/modules/patients/patient.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  rateLimit(`patients:list:${ctx.clinicId}`, 120, 60_000);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const input = searchPatientSchema.parse(params);
  const patients = await patientController.list(ctx, input);
  return ok(patients);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  rateLimit(`patients:create:${ctx.clinicId}`, 60, 60_000);

  const body = await req.json();
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined;
  const input = createPatientSchema.parse({ ...body, idempotencyKey });
  const patient = await patientController.create(ctx, input);
  return created(patient);
});
