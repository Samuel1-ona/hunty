/**
 * GET /api/v1/email-digest/unsubscribe?token=<token>
 *
 * Handles unsubscribe requests from email links.
 * Validates the token and marks the player as unsubscribed.
 */

import { NextResponse } from 'next/server';

import { ValidationError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { validateAndUseUnsubscribeToken } from '@/lib/email/dbStore';

export const GET = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    throw new ValidationError('Missing unsubscribe token', { token });
  }

  // Validate and use the token
  const result = await validateAndUseUnsubscribeToken(token);

  if (!result) {
    // Token is invalid, expired, or already used
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid or expired unsubscribe link. The token may have already been used.',
      },
      { status: 400 }
    );
  }

  // Unsubscribe successful
  return NextResponse.json({
    success: true,
    message: 'You have been unsubscribed from Hunty email digests.',
    email: result.email,
  });
});
