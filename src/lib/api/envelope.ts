import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ErrorCode } from "@/lib/errors/codes";

export type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = { success: false; error: { code: ErrorCode; message: string; details?: unknown } };

export function ok<T>(data: T, meta?: Record<string, unknown>): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function created<T>(data: T, meta?: Record<string, unknown>): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status: 201 });
}

function fail(error: AppError): NextResponse<ApiFailure> {
  return NextResponse.json(
    { success: false, error: { code: error.code, message: error.message, details: error.details } },
    { status: error.status },
  );
}

/**
 * Wraps a /api/v1 route handler: parses errors thrown by the service layer
 * into the standard envelope. Route handlers should stay thin — parse,
 * authenticate, authorize, call service, format response — this only
 * catches what falls through.
 */
export function withApiHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof AppError) return fail(err);
      if (err instanceof ZodError) {
        return fail(new AppError(ErrorCode.VALIDATION_ERROR, "Request validation failed", err.issues));
      }
      console.error("Unhandled API error:", err);
      return fail(new AppError(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred"));
    }
  };
}
