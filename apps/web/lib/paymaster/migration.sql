/**
 * Paymaster database migration SQL.
 *
 * Run against the hunty PostgreSQL database to create the paymaster tables.
 *
 * Usage:
 *   psql "$DATABASE_URL" -f lib/paymaster/migration.sql
 *
 * Or run via a one-off script:
 *   node -e "require('@/lib/db').getDb().file('lib/paymaster/migration.sql')"
 */

-- Track per-user sponsorship quotas and budgets
CREATE TABLE IF NOT EXISTS paymaster_users (
    wallet_address    TEXT PRIMARY KEY,
    sponsored_tx_count  INTEGER NOT NULL DEFAULT 0,
    total_budget_sponsored BIGINT NOT NULL DEFAULT 0,  -- stroops (1 XLM = 10_000_000)
    max_sponsored_tx    INTEGER NOT NULL DEFAULT 3,
    max_budget_per_user BIGINT NOT NULL DEFAULT 10000000,  -- 1 XLM in stroops
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Record every sponsored transaction for audit
CREATE TABLE IF NOT EXISTS paymaster_transactions (
    id              SERIAL PRIMARY KEY,
    wallet_address  TEXT NOT NULL REFERENCES paymaster_users(wallet_address),
    tx_hash         TEXT NOT NULL,
    inner_tx_hash   TEXT,
    fee_sponsored   BIGINT NOT NULL,  -- stroops
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paymaster_tx_wallet
    ON paymaster_transactions(wallet_address);

CREATE INDEX IF NOT EXISTS idx_paymaster_tx_created
    ON paymaster_transactions(created_at DESC);

-- Global key-value config overrides
CREATE TABLE IF NOT EXISTS paymaster_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
