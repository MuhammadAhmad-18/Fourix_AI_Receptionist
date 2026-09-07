import { NextRequest } from "next/server";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { serviceController } from "@/modules/services/service.controller";
import { createServiceSchema } from "@/modules/services/service.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
  const services = await serviceController.list(ctx, activeOnly);
  return ok(services);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = createServiceSchema.parse(await req.json());
  const service = await serviceController.create(ctx, input);
  return created(service);
});
