import { NextRequest } from "next/server";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { appointmentController } from "@/modules/appointments/appointment.controller";
import { createAppointmentSchema } from "@/modules/appointments/appointment.schema";
import { parseStrictIso } from "@/lib/tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const params = req.nextUrl.searchParams;

  // Range query powers the calendar; patientId keeps the original behaviour.
  const from = params.get("from");
  const to = params.get("to");
  if (from && to) {
    return ok(await appointmentController.listInRange(ctx, parseStrictIso(from), parseStrictIso(to)));
  }

  const patientId = params.get("patientId");
  if (!patientId) {
    return ok([]);
  }
  return ok(await appointmentController.listForPatient(ctx, patientId));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const body = await req.json();
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined;
  const input = createAppointmentSchema.parse({ ...body, idempotencyKey });
  const appointment = await appointmentController.create(ctx, input);
  return created(appointment);
});
