/**
 * POST /api/paymaster/sponsor
 *
 * Submit a transaction for the paymaster to sponsor. The paymaster will
 * check the user's quota and budget, and if eligible, return a signed
 * fee-bump XDR the client can submit to the network.
 */

import { NextResponse } from 'next/server';

import { withValidation } from '@/lib/api/withValidation';
import { getPaymaster } from '@/lib/paymaster';
import { paymasterSponsorBodySchema } from '@hunty/types/api-schemas';

export const dynamic = 'force-dynamic';

export const POST = withValidation(
  { body: paymasterSponsorBodySchema },
  async (_request, _context, { body }) => {
    const paymaster = getPaymaster();
    const result = await paymaster.sponsorTransaction(body.txXdr, body.walletAddress);
    return NextResponse.json(result);
  }
);
