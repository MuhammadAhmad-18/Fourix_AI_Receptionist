import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { serviceController } from "@/modules/services/service.controller";
import { updateServiceSchema } from "@/modules/services/service.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  return ok(await serviceController.get(actor, id));
});

export const PATCH = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  const input = updateServiceSchema.parse(await req.json());
  return ok(await serviceController.update(actor, id, input));
});

export const DELETE = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  return ok(await serviceController.remove(actor, id));
});
