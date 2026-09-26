/**
 * POST /api/paymaster/sponsor
 *
 * Submit a transaction for the paymaster to sponsor. The paymaster will
 * check the user's quota and budget, and if eligible, return a signed
 * fee-bump XDR the client can submit to the network.
 *
 * The caller is authenticated with a signed wallet challenge (or a session
 * token) and the sponsorship budget is enforced against the verified
 * wallet, never against an address supplied in the request body. When
 * `PAYMASTER_ALLOWED_CONTRACTS` is configured, only transactions that
 * invoke allow-listed Soroban contracts are sponsored.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { withValidation } from "@/lib/api/withValidation";
import { getPaymaster } from "@/lib/paymaster";
import { enforceContractAllowList } from "@/lib/paymaster/allowList";
import { verifyCallerAuth } from "@/lib/walletAuth";
import { paymasterSponsorBodySchema } from "@hunty/types/api-schemas";

export const dynamic = "force-dynamic";

export const POST = withValidation(
  { body: paymasterSponsorBodySchema },
  async (request, _context, { body }) => {
    const auth = await verifyCallerAuth(request as unknown as NextRequest, body);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error || "Unauthenticated" }, { status: auth.status || 401 });
    }
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 });
    }

    const actor = auth.actor!;
    if (actor.toLowerCase() !== body.walletAddress.toLowerCase()) {
      return NextResponse.json(
        {
          error:
            "Forbidden: authenticated wallet does not match the requested wallet address",
        },
        { status: 403 }
      );
    }

    const allowListFailure = enforceContractAllowList(body.txXdr);
    if (allowListFailure) return allowListFailure;

    const paymaster = getPaymaster();
    const result = await paymaster.sponsorTransaction(body.txXdr, actor);
    return NextResponse.json(result);
  }
);
