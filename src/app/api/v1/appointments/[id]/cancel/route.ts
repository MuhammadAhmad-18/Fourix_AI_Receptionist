import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { appointmentController } from "@/modules/appointments/appointment.controller";
import { cancelAppointmentSchema } from "@/modules/appointments/appointment.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  const input = cancelAppointmentSchema.parse(await req.json().catch(() => ({})));
  return ok(await appointmentController.cancel(actor, id, input.reason));
});
