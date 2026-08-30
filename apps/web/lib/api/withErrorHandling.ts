import { NextResponse } from 'next/server';
import { errorResponse, REQUEST_ID_HEADER } from './response';

type RouteHandler<Context, Req extends Request = Request> = (
  req: Req,
  context: Context
) => Promise<NextResponse> | NextResponse;

function generateRequestId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Wraps a Next.js route handler so that:
 *  - any thrown error (AppError or otherwise) is caught and turned into
 *    the standard { error, code, details? } JSON response
 *  - every response (success or error) carries an `x-request-id` header,
 *    reusing an inbound `x-request-id` header when the caller provided one
 *
 * Usage:
 *   export const GET = withErrorHandling(async (req) => { ... })
 *   export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
 *     async (req, { params }) => { ... }
 *   )
 */
export function withErrorHandling<Context = unknown, Req extends Request = Request>(
  handler: RouteHandler<Context, Req>
): RouteHandler<Context, Req> {
  return async (req: Req, context: Context): Promise<NextResponse> => {
    // `req` may be omitted by callers/tests that don't need it (e.g. static
    // GET handlers with no dynamic input), so avoid assuming it exists.
    const requestId = req?.headers?.get(REQUEST_ID_HEADER) ?? generateRequestId();

    try {
      const response = await handler(req, context);
      if (!response.headers.has(REQUEST_ID_HEADER)) {
        response.headers.set(REQUEST_ID_HEADER, requestId);
      }
      return response;
    } catch (error) {
      return errorResponse(error, requestId);
    }
  };
}
