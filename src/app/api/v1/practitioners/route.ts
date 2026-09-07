import { NextRequest } from "next/server";
import { withApiHandler, ok, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { practitionerController } from "@/modules/practitioners/practitioner.controller";
import { createPractitionerSchema } from "@/modules/practitioners/practitioner.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
  const serviceId = req.nextUrl.searchParams.get("serviceId") ?? undefined;
  return ok(await practitionerController.list(ctx, { activeOnly, serviceId }));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  const input = createPractitionerSchema.parse(await req.json());
  return created(await practitionerController.create(ctx, input));
});
