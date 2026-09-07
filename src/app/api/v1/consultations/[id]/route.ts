import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { consultationController } from "@/modules/consultations/consultation.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  return ok(await consultationController.get(actor, id));
});
