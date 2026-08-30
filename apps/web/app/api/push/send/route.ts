import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { notifyWallet, notifyWallets } from '@/lib/notifications/pushService';
import type { PushEventType } from '@/lib/notifications/types';
import { AuthError, InternalError, ValidationError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { withValidation } from '@/lib/api/withValidation';
import { pushSendBodySchema } from '@hunty/types/api-schemas';

/**
 * POST /api/push/send
 *
 * Internal service-to-service endpoint for triggering Web Push notifications
 * on hunt events. Callers must present either PUSH_API_SECRET (the dedicated
 * push service credential) or ADMIN_API_SECRET (the shared admin credential
 * used elsewhere in this app) as a bearer token.
 *
 * Unlike @/lib/api/adminAuth's assertAdminAuth, this check is unconditional:
 * there is no "unprotected in dev when unset" fallback. If neither secret is
 * configured, every request is rejected — a push-fan-out endpoint has no
 * legitimate reason to ever run open.
 *
 * This must never be called directly from browser/client code: a secret
 * shipped in client JS isn't a secret. Trigger sends from server-side code
 * that already holds one of these credentials.
 *
 * Body:
 * {
 *   type: PushEventType,
 *   walletAddresses: string[],  // recipients
 *   context: Record<string, string | number>  // event-specific data (huntName, huntId, etc.)
 * }
 */
function assertServiceOrAdminAuth(request: Request): void {
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const pushSecret = process.env.PUSH_API_SECRET;
  const adminSecret = process.env.ADMIN_API_SECRET;

  const matchesPush = Boolean(token && pushSecret && token === pushSecret);
  const matchesAdmin = Boolean(token && adminSecret && token === adminSecret);

  if (!matchesPush && !matchesAdmin) {
    throw new AuthError('A valid service or admin credential is required');
  }
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const ip = getIP(request);
  const { success, reset } = rateLimit(ip, { limit: 50, windowMs: 60 * 1000 });
  if (!success) return rateLimitResponse(reset);

  assertServiceOrAdminAuth(request);

  let body: {
    type?: string;
    walletAddresses?: string[];
    context?: Record<string, string | number>;
  };
  try {
    body = await request.json();
  } catch {
    throw new ValidationError('Invalid request body');
  }

  const { type, walletAddresses, context = {} } = body;

  if (!type || typeof type !== 'string') {
    throw new ValidationError('type is required', { field: 'type' });
  }

  if (!Array.isArray(walletAddresses) || walletAddresses.length === 0) {
    throw new ValidationError('walletAddresses must be a non-empty array', {
      field: 'walletAddresses',
    });
  }
  export const POST = withValidation(
    { body: pushSendBodySchema },
    async (request: NextRequest, _context, { body }) => {
      const ip = getIP(request);
      const { success, reset } = await rateLimit(ip, { limit: 50, windowMs: 60 * 1000 });
      if (!success) return rateLimitResponse(reset);

      const secret = process.env.PUSH_API_SECRET;
      if (secret) {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${secret}`) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      }

      try {
        if (body.walletAddresses.length === 1) {
          await notifyWallet(body.walletAddresses[0], body.type as PushEventType, body.context);
        } else {
          await notifyWallets(body.walletAddresses, body.type as PushEventType, body.context);
        }
      } catch (error) {
        logger.error('[push/send] Failed to send push notification:', error);
        return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 });
      }

      if (!validTypes.includes(type as PushEventType)) {
        throw new ValidationError(`Invalid type. Must be one of: ${validTypes.join(', ')}`, {
          field: 'type',
        });
      }

      try {
        if (walletAddresses.length === 1) {
          await notifyWallet(walletAddresses[0], type as PushEventType, context);
        } else {
          await notifyWallets(walletAddresses, type as PushEventType, context);
        }
      } catch (error) {
        logger.error('[push/send] Failed to send push notification:', error);
        throw new InternalError('Failed to send push notification');
      }

      logger.info(`[push/send] Sent "${type}" to ${walletAddresses.length} wallet(s)`);

      return NextResponse.json({ success: true, sent: walletAddresses.length });
    }
  );
  logger.info(`[push/send] Sent "${body.type}" to ${body.walletAddresses.length} wallet(s)`);

  return NextResponse.json({ success: true, sent: body.walletAddresses.length });
});
