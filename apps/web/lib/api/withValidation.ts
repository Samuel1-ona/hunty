/**
 * withValidation — Zod-powered request validation helper for Next.js route handlers.
 *
 * Usage:
 *
 *   import { withValidation } from "@/lib/api/withValidation"
 *   import { myBodySchema } from "@hunty/types/api-schemas"
 *
 *   export const POST = withValidation(
 *     { body: myBodySchema },
 *     async (req, context, { body }) => {
 *       // body is fully typed and validated
 *       return NextResponse.json({ ok: true })
 *     }
 *   )
 *
 * Validation failures return HTTP 400 with a consistent JSON shape:
 *   {
 *     "error": "Validation failed",
 *     "code": "VALIDATION_ERROR",
 *     "details": {
 *       "fieldErrors": { "fieldName": ["error message", …], … }
 *     }
 *   }
 */

import { NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { ValidationError } from "./errors"
import { withErrorHandling } from "./withErrorHandling"

// ─── Types ───────────────────────────────────────────────────────────────────

type AnyZodSchema = z.ZodTypeAny

/** Shape of the validated input passed to validated handlers */
interface ValidatedInput<
  TBody extends AnyZodSchema | undefined,
  TQuery extends AnyZodSchema | undefined,
  TParams extends AnyZodSchema | undefined,
> {
  body: TBody extends AnyZodSchema ? z.infer<TBody> : undefined
  query: TQuery extends AnyZodSchema ? z.infer<TQuery> : undefined
  params: TParams extends AnyZodSchema ? z.infer<TParams> : undefined
}

/** Schema config accepted by withValidation */
interface ValidationConfig<
  TBody extends AnyZodSchema | undefined,
  TQuery extends AnyZodSchema | undefined,
  TParams extends AnyZodSchema | undefined,
> {
  body?: TBody
  query?: TQuery
  params?: TParams
}

type ValidatedHandler<
  TBody extends AnyZodSchema | undefined,
  TQuery extends AnyZodSchema | undefined,
  TParams extends AnyZodSchema | undefined,
  TContext = unknown,
> = (
  req: Request,
  context: TContext,
  input: ValidatedInput<TBody, TQuery, TParams>
) => Promise<NextResponse> | NextResponse

// ─── Error formatting ────────────────────────────────────────────────────────

/**
 * Convert a ZodError into a flat fieldErrors map suitable for the API
 * error response body.
 */
function formatZodError(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_root"
    if (!fieldErrors[path]) fieldErrors[path] = []
    fieldErrors[path].push(issue.message)
  }
  return fieldErrors
}

// ─── Core helper ─────────────────────────────────────────────────────────────

/**
 * Parse + validate the request body as JSON against `schema`.
 * Throws a ValidationError (→ HTTP 400) on parse or schema failure.
 */
async function parseBody<T extends AnyZodSchema>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new ValidationError("Invalid JSON body")
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new ValidationError("Validation failed", {
      fieldErrors: formatZodError(result.error),
    })
  }
  return result.data as z.infer<T>
}

/**
 * Parse + validate URL search params against `schema`.
 * Throws a ValidationError (→ HTTP 400) on schema failure.
 */
function parseQuery<T extends AnyZodSchema>(
  req: Request,
  schema: T
): z.infer<T> {
  const { searchParams } = new URL(req.url)
  const raw = Object.fromEntries(searchParams.entries())
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new ValidationError("Invalid query parameters", {
      fieldErrors: formatZodError(result.error),
    })
  }
  return result.data as z.infer<T>
}

/**
 * Parse + validate route params against `schema`.
 * Throws a ValidationError (→ HTTP 400) on schema failure.
 */
function parseParams<T extends AnyZodSchema>(
  raw: unknown,
  schema: T
): z.infer<T> {
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new ValidationError("Invalid path parameters", {
      fieldErrors: formatZodError(result.error),
    })
  }
  return result.data as z.infer<T>
}

// ─── Public wrapper ───────────────────────────────────────────────────────────

/**
 * withValidation wraps a route handler with Zod body/query/params validation
 * and re-uses withErrorHandling so all errors are normalised to the standard
 * { error, code, details } JSON shape.
 *
 * Route context is typed generically so path-param contexts (e.g.
 * `{ params: Promise<{ id: string }> }`) work the same as bare handlers.
 */
export function withValidation<
  TBody extends AnyZodSchema | undefined = undefined,
  TQuery extends AnyZodSchema | undefined = undefined,
  TParams extends AnyZodSchema | undefined = undefined,
  TContext = unknown,
>(
  config: ValidationConfig<TBody, TQuery, TParams>,
  handler: ValidatedHandler<TBody, TQuery, TParams, TContext>
) {
  return withErrorHandling<TContext>(async (req: Request, context: TContext) => {
    // Validate body
    const body = config.body
      ? await parseBody(req, config.body)
      : undefined

    // Validate query string
    const query = config.query
      ? parseQuery(req, config.query)
      : undefined

    // Validate path params — context may have a `params` property (Next.js route segments)
    let params: z.infer<NonNullable<TParams>> | undefined = undefined
    if (config.params) {
      const rawParams =
        context && typeof context === "object" && "params" in context
          ? await (context as { params: unknown }).params
          : undefined
      params = parseParams(rawParams, config.params)
    }

    return handler(req, context, {
      body,
      query,
      params,
    } as ValidatedInput<TBody, TQuery, TParams>)
  })
}
