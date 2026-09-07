import { NextRequest } from "next/server";
import { withApiHandler, created } from "@/lib/api/envelope";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { fileService } from "@/modules/files/file.service";
import { AppError, ErrorCode } from "@/lib/errors/codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (req: NextRequest) => {
  const ctx = await getActorContextFromRequest(req);
  requirePermission(ctx, Permission.CONSENT_MANAGE);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Multipart field 'file' is required");
  }
  const patientId = (form.get("patientId") as string) || undefined;
  const treatmentId = (form.get("treatmentId") as string) || undefined;

  const buffer = Buffer.from(await file.arrayBuffer());
  const record = await fileService.uploadFile(ctx, { buffer, originalName: file.name, patientId, treatmentId });
  return created({ id: record.id, originalName: record.originalName, mimeType: record.mimeType, sizeBytes: record.sizeBytes });
});
