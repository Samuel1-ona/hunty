# Hunty Persistence Strategy

This document answers: **"Where does non-blockchain state live?"**

## Summary

| Layer                      | What lives there                                                           | Technology                                                       |
| -------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| On-chain (Stellar/Soroban) | Hunt definitions, reward escrow, NFT receipts, player registration         | Soroban smart contracts                                          |
| IPFS (Pinata)              | Hunt cover images, NFT media, NFT metadata JSON                            | Pinata + public IPFS                                             |
| PostgreSQL database        | All mutable server-side application state (see below)                      | `postgres` (porsager/postgres)                                   |
| localStorage (client)      | Cached notification preferences, offline-first draft cache, wallet session | Browser cache — server is canonical for notification preferences |

---

## What lives on-chain (Stellar / Soroban)

- **Hunt creation & lifecycle** — `createHunt`, `activateHunt`, `addClue` calls in `lib/contracts/hunt.ts`.
- **Reward escrow** — XLM pools funded via `createRewardEscrow` / `sponsorHunt` in `lib/contracts/rewardManager.ts`.
- **NFT rewards** — minting receipts stored on-chain via `lib/nft/minter.ts`.
- **Player registration** — `registerPlayer` in `lib/contracts/player-registration.ts`.

_These records are authoritative and immutable once confirmed. Nothing server-side overrides them._

---

## What lives in IPFS (Pinata)

- **Hunt cover images** and any media uploads — uploaded via `POST /api/ipfs` which proxies to Pinata.
- **NFT metadata JSON** — built by `lib/nft/metadataBuilder.ts` and uploaded by `lib/nft/metadataUploader.ts`.
- **NFT media files** — CIDs stored in the NFT metadata and resolved by `lib/ipfs.ts`.

_IPFS content is content-addressed and immutable. The CID is stored on-chain so the metadata can always be verified._

---

## What lives in PostgreSQL

The PostgreSQL database (connection string in `DATABASE_URL`) is the canonical store for all mutable application state that must survive across deploys and multiple serverless instances.

### Schema (migrations in `apps/web/lib/db/migrations/`)

| Migration file                         | Table(s)                                                                               | Purpose                                                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `001_create_app_settings.sql`          | `app_settings`                                                                         | Generic key/value store; currently holds `featured_hunt_id`                                                                    |
| `002_create_rate_limit.sql`            | `rate_limit`                                                                           | Distributed rate-limit counters (replaces in-memory Map)                                                                       |
| `003_create_moderation_tables.sql`     | `moderation_queue`, `moderation_notifications`                                         | Moderation review queue and creator notifications                                                                              |
| `004_create_anti_cheat_tables.sql`     | `anti_cheat_answers`, `anti_cheat_anomalies`, `anti_cheat_bans`, `anti_cheat_tracking` | Answer history, anomaly detection, bans, per-key submission tracking                                                           |
| `005_create_hunt_drafts.sql`           | `hunt_drafts`                                                                          | Cloud-synced creator draft auto-saves                                                                                          |
| `008_create_analytics.sql`             | `hunt_views`, `hint_usage_events`                                                      | Hunt view counters and hint-reveal event log (replaces `data/hunt-views.json`, `data/hint-usage.json`)                         |
| `009_create_hunt_analytics.sql`        | `hunt_analytics`                                                                       | Per-hunt analytics: views, starts, completions, clue drop-off, demographics, time-series (replaces `data/hunt-analytics.json`) |
| `010_add_notification_preferences.sql` | `notification_preferences`                                                             | Wallet-scoped notification categories and global mute, shared across devices                                                   |
| Migration file                         | Table(s)                                                                               | Purpose                                                                                                                        |
| ----------------------------------     | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `001_create_app_settings.sql`          | `app_settings`                                                                         | Generic key/value store; currently holds `featured_hunt_id`                                                                    |
| `002_create_rate_limit.sql`            | `rate_limit`                                                                           | Distributed rate-limit counters (replaces in-memory Map)                                                                       |
| `003_create_moderation_tables.sql`     | `moderation_queue`, `moderation_notifications`                                         | Moderation review queue and creator notifications                                                                              |
| `004_create_anti_cheat_tables.sql`     | `anti_cheat_answers`, `anti_cheat_anomalies`, `anti_cheat_bans`, `anti_cheat_tracking` | Answer history, anomaly detection, bans, per-key submission tracking                                                           |
| `005_create_hunt_drafts.sql`           | `hunt_drafts`                                                                          | Cloud-synced creator draft auto-saves                                                                                          |
| `010_create_hunt_versions.sql`         | `hunt_versions`                                                                        | Immutable creator hunt snapshots for edit history and restore; retained for 90 days                                            |
| `008_create_analytics.sql`             | `hunt_views`, `hint_usage_events`                                                      | Hunt view counters and hint-reveal event log (replaces `data/hunt-views.json`, `data/hint-usage.json`)                         |
| `009_create_hunt_analytics.sql`        | `hunt_analytics`                                                                       | Per-hunt analytics: views, starts, completions, clue drop-off, demographics, time-series (replaces `data/hunt-analytics.json`) |

### Feature details

#### Featured hunt (`lib/featuredHuntDb.ts`)

Single row in `app_settings` under `key = 'featured_hunt_id'`. Uses UPSERT so rotating the featured hunt is always consistent across instances.

#### Notification preferences (`api/v1/notifications/preferences`)

`notification_preferences` stores one normalized JSONB document per wallet. Web and mobile keep a local cache for offline rendering, but read and write the wallet-scoped database document whenever a wallet is connected. The `enabled` field is the global mute and is checked before category-specific delivery.

#### Rate limiting (`lib/rate-limit.ts`)

Each call does a single atomic UPSERT: increment `count` for the `(key, expires_at)` window pair. Graceful degradation: if the database is unreachable the request is allowed through rather than dropped. Stale rows (where `expires_at < NOW()`) can be pruned periodically.

#### Moderation queue (`lib/moderation/store.ts`)

`moderation_queue` holds the full `StoredHunt` JSON snapshot in a `JSONB` column so no separate hunt-table join is needed for the admin UI. `moderation_notifications` stores creator-facing approved/rejected messages with a `read` flag.

#### Anti-cheat (`lib/anti-cheat.ts`)

Four tables replace four JSON files:

- `anti_cheat_answers` — full answer log for replay/audit.
- `anti_cheat_anomalies` — flagged anomaly events.
- `anti_cheat_bans` — permanent bans keyed on wallet address.
- `anti_cheat_tracking` — lightweight per-(wallet, hunt, clue) tracking for min-interval checks.

#### Hunt drafts (`app/api/v1/drafts/`, `hooks/useHuntDraftAutoSave.ts`)

`hunt_drafts` stores the full `HuntDraftSave` JSON payload keyed on `draft_id` and `owner_key` (wallet public key). The draft hook saves to `localStorage` immediately for offline-first UX, then syncs to `POST /api/v1/drafts` for logged-in users.

#### Hunt versions (`app/api/v1/hunts/[id]/versions/`)

`hunt_versions` stores each creator-submitted hunt snapshot as an immutable JSONB
record with a per-hunt version number, creator address, and timestamp. The creator
can list versions and restore one; restore creates a new version rather than
rewriting history. Snapshots are retained for 90 days. Reads exclude older rows,
and the write path deletes expired rows; production deployments should also run
the same cleanup query from a scheduled maintenance job.

#### Hunt view analytics (`lib/analytics.ts`)

`hunt_views` holds one row per hunt; `views` is incremented atomically via `INSERT … ON CONFLICT DO UPDATE`. `hint_usage_events` is an append-only log of hint-reveal events; wallet addresses are HMAC-hashed before storage so raw addresses are never persisted.

#### Hunt analytics (`lib/huntAnalytics.ts`)

`hunt_analytics` stores per-hunt scalar counters (`views`, `starts`, `completions`, `total_completion_time_seconds`) as integer columns for cheap aggregation, and three evolving arrays (`clue_drop_off`, `demographics`, `time_series`) as JSONB so the schema never needs to change when those shapes evolve. Updates use a read-modify-write pattern inside each event handler.

---

## Migration path for existing state

Because the previous storage was files on the local filesystem (wiped on every deploy), there is no canonical data to migrate. The tables start empty and are populated as users interact with the running application.

The recommended procedure for a **production cut-over** is:

1. Run all SQL migrations against the production database in order:
   ```bash
   psql "$DATABASE_URL" -f apps/web/lib/db/migrations/001_create_app_settings.sql
   psql "$DATABASE_URL" -f apps/web/lib/db/migrations/002_create_rate_limit.sql
   psql "$DATABASE_URL" -f apps/web/lib/db/migrations/003_create_moderation_tables.sql
   psql "$DATABASE_URL" -f apps/web/lib/db/migrations/004_create_anti_cheat_tables.sql
   psql "$DATABASE_URL" -f apps/web/lib/db/migrations/005_create_hunt_drafts.sql
   psql "$DATABASE_URL" -f apps/web/lib/db/migrations/008_create_analytics.sql
   psql "$DATABASE_URL" -f apps/web/lib/db/migrations/009_create_hunt_analytics.sql
   ```
2. Deploy the new code.
3. The old JSON files in `data/`, `lib/moderation-data/`, and `lib/anti-cheat-data/` are no longer read. They can be removed or left in place — neither causes harm.

If you have a staging environment with valuable moderation decisions, export them with `jq` and import as SQL `INSERT` statements before cutting over.

---

## Running migrations locally (Docker)

```bash
# Start the dev stack
docker compose up -d db

# Apply all migrations in order
for f in apps/web/lib/db/migrations/*.sql; do
  psql postgresql://hunty:hunty@localhost:5432/hunty_dev -f "$f"
done
```

---

## What still lives in localStorage (client-only)

The following state is intentionally client-local and does not need a server equivalent:

- **Hunt attempt progress** (`lib/huntAttemptHistory.ts`) — in-progress play state; ephemeral by design.
- **Draft cache** (`hooks/useHuntDraftAutoSave.ts`) — the localStorage copy serves as an offline-first cache; the server copy in `hunt_drafts` is canonical.
- **Wallet session** (`lib/walletAdapter.ts`, `lib/walletConnect.ts`) — wallet connection metadata; intentionally not persisted to the server.
- **UI preferences** — theme, onboarding tour completion, etc.
