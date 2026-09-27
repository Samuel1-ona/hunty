import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { AppError, InternalError, isAppError } from "./errors"

export const REQUEST_ID_HEADER = "x-request-id"

export interface ApiErrorBody {
  error: string
  code: string
  details?: Record<string, unknown>
}

/**
 * Converts any thrown value into the standard { error, code, details? }
 * envelope, logs unexpected (non-AppError) failures, and stamps the
 * response with the request ID for tracing.
 */
export function errorResponse(error: unknown, requestId: string): NextResponse<ApiErrorBody> {
  const appError = toAppError(error)

  if (!isAppError(error)) {
    logger.error(`[${requestId}] Unhandled API error:`, error)
  } else if (appError.statusCode >= 500) {
    logger.error(`[${requestId}] ${appError.code}: ${appError.message}`, appError.details ?? "")
  }

  const body: ApiErrorBody = { error: appError.message, code: appError.code }
  if (appError.details) {
    body.details = appError.details
  }

  return NextResponse.json(body, {
    status: appError.statusCode,
    headers: { [REQUEST_ID_HEADER]: requestId },
  })
}

function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error

  // Don't leak raw internal error messages (stack traces, DB errors, etc.)
  // to clients in production; keep them in non-production for DX.
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error instanceof Error
        ? error.message
        : "Internal server error"

  return new InternalError(message)
}
