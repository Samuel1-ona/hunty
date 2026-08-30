import { NextResponse } from 'next/server';
import { ServiceUnavailableError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';

const ANDROID_SHA256_CERT_FINGERPRINTS = process.env.ANDROID_SHA256_CERT_FINGERPRINTS;
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || 'com.yourorg.hunty';

function parseFingerprints(value: string) {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export const GET = withErrorHandling(async () => {
  if (!ANDROID_SHA256_CERT_FINGERPRINTS) {
    throw new ServiceUnavailableError(
      'Android App Links are not configured. Add ANDROID_SHA256_CERT_FINGERPRINTS (comma-separated SHA-256 cert fingerprints) to environment variables.'
    );
  }

  const fingerprints = parseFingerprints(ANDROID_SHA256_CERT_FINGERPRINTS);

  if (fingerprints.length === 0) {
    throw new ServiceUnavailableError('ANDROID_SHA256_CERT_FINGERPRINTS is set but empty.');
  }

  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: ANDROID_PACKAGE_NAME,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
});
