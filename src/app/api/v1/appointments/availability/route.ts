import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { appointmentController } from "@/modules/appointments/appointment.controller";
import { checkAvailabilitySchema } from "@/modules/appointments/appointment.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = checkAvailabilitySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return ok(await appointmentController.checkAvailability(ctx, input));
});
