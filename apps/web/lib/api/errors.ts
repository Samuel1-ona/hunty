export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "BAD_GATEWAY"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR"

/**
 * Base class for all expected/typed API errors. Thrown from route handlers
 * (or the lib/ code they call) and translated into a consistent JSON
 * response by `errorResponse`/`withErrorHandling`.
 */
export class AppError extends Error {
  readonly statusCode: number
  readonly code: ApiErrorCode
  readonly details?: Record<string, unknown>

  constructor(message: string, statusCode: number, code: ApiErrorCode, details?: Record<string, unknown>) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

/** 400 - the request payload or query params failed validation. */
export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", details)
  }
}

/** 401 - caller could not be authenticated. */
export class AuthError extends AppError {
  constructor(message = "Authentication required", details?: Record<string, unknown>) {
    super(message, 401, "UNAUTHORIZED", details)
  }
}

/** 403 - caller is known but not allowed to perform this action. */
export class ForbiddenError extends AppError {
  constructor(message = "Access denied", details?: Record<string, unknown>) {
    super(message, 403, "FORBIDDEN", details)
  }
}

/** 404 - the requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: Record<string, unknown>) {
    super(message, 404, "NOT_FOUND", details)
  }
}

/** 409 - the request conflicts with the current state of the resource. */
export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: Record<string, unknown>) {
    super(message, 409, "CONFLICT", details)
  }
}

/** 413 - the request body exceeds the maximum allowed size. */
export class PayloadTooLargeError extends AppError {
  constructor(message = "Payload too large", details?: Record<string, unknown>) {
    super(message, 413, "PAYLOAD_TOO_LARGE", details)
  }
}

/** 429 - caller has exceeded a rate or frequency limit. */
export class RateLimitError extends AppError {
  constructor(message = "Too many requests", details?: Record<string, unknown>) {
    super(message, 429, "RATE_LIMITED", details)
  }
}

/** 502 - an upstream/third-party service returned an error. */
export class BadGatewayError extends AppError {
  constructor(message = "Upstream service error", details?: Record<string, unknown>) {
    super(message, 502, "BAD_GATEWAY", details)
  }
}

/** 503 - a required feature/dependency is not configured or unavailable. */
export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable", details?: Record<string, unknown>) {
    super(message, 503, "SERVICE_UNAVAILABLE", details)
  }
}

/** 500 - unexpected/uncategorized failure. */
export class InternalError extends AppError {
  constructor(message = "Internal server error", details?: Record<string, unknown>) {
    super(message, 500, "INTERNAL_ERROR", details)
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
