import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { appointmentController } from "@/modules/appointments/appointment.controller";
import { getAvailableSlotsSchema } from "@/modules/appointments/appointment.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = getAvailableSlotsSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return ok(await appointmentController.getAvailableSlots(ctx, input));
});
