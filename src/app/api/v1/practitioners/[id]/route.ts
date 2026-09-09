import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { practitionerController } from "@/modules/practitioners/practitioner.controller";
import { updatePractitionerSchema } from "@/modules/practitioners/practitioner.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  return ok(await practitionerController.get(actor, id));
});

export const PATCH = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  const input = updatePractitionerSchema.parse(await req.json());
  return ok(await practitionerController.update(actor, id, input));
});

export const DELETE = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  return ok(await practitionerController.remove(actor, id));
});
