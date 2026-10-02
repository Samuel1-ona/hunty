# Season Creation Security Model

Applies to `POST /api/v1/seasons`. `GET /api/v1/seasons` stays public — it only
reads season, leaderboard and battle-pass data.

## Trust Boundaries

- Creating a season is a privileged write. It is restricted to admins.
- The acting identity is derived from the verified credential only. No request
  body field is trusted as an actor; `createdBy` on the stored season is always
  the verified identity.
- Two accepted credentials, both resolved by `lib/api/adminIdentity.ts`:
  - **Signed wallet challenge** — `x-wallet-address`, `x-wallet-challenge` and
    `x-wallet-signature`. The challenge has the form
    `huntly-challenge:create-season:<address>:<issuedAtMs>:<nonce>`; the address
    and the `create-season` purpose are inside the signed message, so a captured
    signature cannot be replayed against a different action or a different
    wallet. The recovered address must appear in `ADMIN_WALLET_ADDRESSES`.
  - **Admin API secret** — `Authorization: Bearer <ADMIN_API_SECRET>`, compared in
    constant time. Fails closed: when the secret is unset the bearer path cannot
    authenticate anyone.
- Wallet addresses are allow-listed by exact, case-insensitive match. An unset or
  empty `ADMIN_WALLET_ADDRESSES` means no wallet is an admin.

## Authorization

- 401 `UNAUTHORIZED` — no credentials, a wallet address without a challenge or
  signature, a malformed/expired/wrong-purpose challenge, or a bad signature.
- 403 `FORBIDDEN` — a valid signed challenge from a wallet that is not an admin,
  including when the admin allow-list is empty.
- Every denial is recorded via `lib/audit.ts` with a reason
  (`missing_credentials`, `missing_signature`, `invalid_signature`,
  `insufficient_role`).

## Rate Limiting

- Per-IP: 10 requests per 60 seconds, applied before the credential check.

## Known Limitations

- Challenges are not single-use. The replay window is bounded to 5 minutes by
  the `issuedAt` check, but within that window the same challenge can be
  presented again. Closing this requires a server-issued, single-use challenge
  store.
- The rate limiter is in-memory, so it is ineffective across multiple serverless
  instances.
- `ADMIN_API_SECRET` is a shared secret: it identifies "an admin machine", not a
  person. It is not sufficient on its own for attribution or non-repudiation.

## Battle Pass Claim Security Model

Applies to `POST /api/v1/seasons/[id]/battle-pass`. `GET /api/v1/seasons/[id]/battle-pass`
stays public — it only reads tier configurations and player progress.

- Claiming a tier reward is a privileged write on player progress.
- Caller identity must be verified via signed wallet challenge (`x-wallet-address`,
  `x-wallet-challenge`, `x-wallet-signature`) or session token (`Authorization: Bearer <token>`
  or `x-session-token`).
- The player address is derived strictly from the verified identity, never from the request body.
- Returns 401 for unauthenticated requests (missing credentials, incomplete payload, bad signature,
  invalid session token) and 403 for unauthorized callers.

