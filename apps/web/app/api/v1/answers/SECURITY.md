# Answer Submission Security Model

## Trust Boundaries
- Server-side verification is authoritative — client submissions are untrusted
- Answer hashes use SHA-256 with per-clue salt: `SHA256(normalized_answer + "${huntId}_${clueId}")`
- Raw answers are never returned in API responses

## Rate Limiting
- IP-based: 100 requests per 60 seconds
- Per-clue minimum interval: 2 seconds between submissions
- Anomaly detection flags rapid attempts, fast submissions, and impossible patterns

## Input Validation
- All request bodies validated with Zod schemas
- Answer length capped at 200 characters
- Wallet address validated as 56-character string
- Hint count clamped to 0-3

## Known Limitations
- Rate limiter is in-memory (ineffective in serverless multi-instance deployments)
- Salt is deterministic per (huntId, clueId) — adequate for game context, insufficient for high-value rewards
- Legacy plaintext answers are fuzzy-matched server-side (typo tolerance widens attack surface)
