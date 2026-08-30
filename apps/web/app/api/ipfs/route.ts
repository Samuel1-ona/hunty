import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import {
  BadGatewayError,
  RateLimitError,
  ServiceUnavailableError,
  ValidationError,
} from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { getIP, rateLimit } from '@/lib/rate-limit';

const PINATA_JWT = process.env.PINATA_JWT;

export const POST = withErrorHandling(async (req: NextRequest) => {
  if (!PINATA_JWT) {
    throw new ServiceUnavailableError(
      'IPFS uploads are not configured. Add PINATA_JWT to your environment variables.'
    );
  }

  const wallet = req.headers.get('x-wallet-address');
  if (!wallet) {
    throw new ValidationError('Wallet address required', { header: 'x-wallet-address' });
  }

  const ip = getIP(req);

  const { success } = await rateLimit(ip, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!success) {
    throw new RateLimitError('Too many requests. Limit is 10 uploads per hour.');
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof Blob)) {
    throw new ValidationError('No file provided', { field: 'file' });
  }

  const pinataForm = new FormData();
  pinataForm.append('file', file);

  const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: pinataForm,
  });

  if (!pinataRes.ok) {
    const errText = await pinataRes.text();
    logger.error('Pinata upload error:', pinataRes.status, errText);
    throw new BadGatewayError('Failed to pin file to IPFS');
  }

  const data = (await pinataRes.json()) as { IpfsHash: string };
  return NextResponse.json({ cid: data.IpfsHash });
});
