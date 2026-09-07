import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "@/lib/openapi/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(generateOpenApiDocument());
}
