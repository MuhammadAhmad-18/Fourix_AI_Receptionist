import { NextRequest } from "next/server";
import { withApiHandler, ok } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { packageController } from "@/modules/packages/package.controller";
import { useSessionSchema } from "@/modules/packages/package.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await getActorContextFromRequest(req);
  const { id } = await ctx.params;
  const input = useSessionSchema.parse(await req.json().catch(() => ({})));
  return ok(await packageController.useSession(actor, id, input.appointmentId));
});
