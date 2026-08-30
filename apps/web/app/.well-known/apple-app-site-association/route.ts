import { NextResponse } from 'next/server';
import { ServiceUnavailableError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';

const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || 'com.yourorg.hunty';

export const GET = withErrorHandling(async () => {
  if (!APPLE_TEAM_ID) {
    throw new ServiceUnavailableError(
      'Apple Universal Links are not configured. Add APPLE_TEAM_ID (your 10-character Apple Team ID) to environment variables.'
    );
  }

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`,
            paths: ['/hunt', '/hunt/*'],
          },
        ],
      },
    },
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
});
