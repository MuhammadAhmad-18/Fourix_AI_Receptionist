import { NextRequest, NextResponse } from "next/server";
import { getActorContextFromRequest } from "@/lib/auth/actor-context";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { fileService } from "@/modules/files/file.service";
import { AppError, ErrorCode } from "@/lib/errors/codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Never served from a public static path — every read goes through session/
// API-key authorization here, same as any other clinic-scoped resource.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActorContextFromRequest(req);
    requirePermission(actor, Permission.CONSENT_READ);
    const { id } = await ctx.params;
    const { file, buffer } = await fileService.getFileContent(actor, id);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.originalName}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    throw err;
  }
}
