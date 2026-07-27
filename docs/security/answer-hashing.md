# Contracts: Answer Hashing Scheme

This document describes the client-side and contract-side conventions for hashing hunt/clue answers.

Goal
----
Prevent precomputation (rainbow table) attacks on stored answers by including a hunt-specific salt when hashing answers prior to storing them on-chain.

Hashing Scheme
--------------
- Normalization: the user's plain-text answer is normalized by trimming whitespace and converting to lowercase.
- Salt: a hunt-specific salt is constructed as `${huntId}_${clueId}` where `huntId` and `clueId` are integer identifiers assigned by the system.
- Digest: compute the lowercase hex SHA-256 digest of the concatenated normalized answer and salt:

```
hashed = SHA256( normalized_answer + `${huntId}_${clueId}` )
```

Implementation Notes
--------------------
- Client-side (creation): when a creator adds a clue, the client persists the clue locally to obtain a stable `clueId`, then computes `hashed` using the scheme above and submits the hashed value to the contract via the existing `add_clue` flow. The local storage record is updated to contain the hashed answer.
- Client-side (verification): when a player submits an answer, the web client normalizes the candidate, computes the same `SHA256(normalized + `${huntId}_${clueId}`)` and compares it against the stored hash. The end-to-end implementation lives in [`apps/web/lib/clueAnswerVerification.ts`](../../apps/web/lib/clueAnswerVerification.ts) — see `matchesClueAnswer` for the hashed path and the legacy plaintext/fuzzy fallback.
- Contract / server-side (verification): the contract (or the server-side verification mock) also normalizes the incoming answer, appends the same salt (`${huntId}_${clueId}`) and computes `SHA256(normalized + salt)` to compare with the stored hashed value.
- Backwards compatibility: the contract verification accepts both legacy plain-text stored answers (pipe-separated list) and the new hashed form. If the stored answer matches the hex-SHA256 pattern, the verifier checks the computed hash; otherwise it falls back to comparing normalized plaintext answers. React-native / mobile parity of this flow is still handled by the legacy helper `submitAnswer` in the mock.

Security Considerations
-----------------------
- The salt prevents simple rainbow-table attacks that only precompute hashes of common words; salts must be unguessable across different hunts only to the extent that `huntId`/`clueId` are not easily enumerated — this scheme intentionally uses deterministic ids for reproducibility. For stronger protection consider adding a creator-specific or server-side random nonce stored off-chain.
- Keep the normalization rules consistent between creation and verification (trim + lowercase). Any divergence will cause valid answers to fail verification.

Developer Example (JS)
----------------------
```js
// normalize
const normalized = answer.trim().toLowerCase()
const salt = `${huntId}_${clueId}`
const hashed = await sha256Hex(normalized + salt) // returns lowercase hex
// submit `hashed` as the stored answer
```

Migration / Testing
-------------------
- Existing hunts with plaintext answers continue to work; the verifier checks stored values and applies the correct verification method.
- Unit tests were added/updated to validate the hashing and verification flow in the mock `submitAnswer` implementation.

References
----------
- Cross-env SHA-256 helper: [`apps/web/lib/crypto.ts`](../../apps/web/lib/crypto.ts)
- Client-side verification (hash + fuzzy matching): [`apps/web/lib/clueAnswerVerification.ts`](../../apps/web/lib/clueAnswerVerification.ts)
- Contract submission helpers: [`apps/web/lib/contracts/hunt.ts`](../../apps/web/lib/contracts/hunt.ts)
- Local storage helpers: [`apps/web/lib/huntStore.ts`](../../apps/web/lib/huntStore.ts)

Tests
-----
- [`apps/web/lib/__tests__/crypto.test.ts`](../../apps/web/lib/__tests__/crypto.test.ts)
- [`apps/web/lib/__tests__/huntStore.test.ts`](../../apps/web/lib/__tests__/huntStore.test.ts)
