import type { NextRequest } from 'next/server';

/**
 * Extracts the client's IP address from a request in a secure way.
 *
 * It prioritizes the `ip` property from Next.js's `NextRequest`, which is
 * reliably set by platforms like Vercel to the originating client IP.
 *
 * As a fallback for other environments or plain `Request` objects, it checks
 * common proxy headers. Crucially, when reading `x-forwarded-for`, it takes
 * only the *first* (leftmost) IP in the list, which is the standard way to
 * identify the originating client and prevent spoofing.
 *
 * @param req The incoming `Request` or `NextRequest` object.
 * @returns The client's IP address or "unknown" if it cannot be determined.
 */
export function getClientIp(req: Request | NextRequest): string {
  // Prioritize Next.js's `ip` property, which is trusted on Vercel.
  if ('ip' in req && req.ip) {
    return req.ip;
  }

  // Fallback for standard `Request` or other environments.
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // The first IP in the list is the original client.
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }

  return req.headers.get('x-real-ip') ?? 'unknown';
}
