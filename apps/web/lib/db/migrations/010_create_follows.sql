-- Follows: players follow creators and get notified of new hunts.
CREATE TABLE IF NOT EXISTS creator_follows (
  follower_wallet TEXT NOT NULL,
  creator_wallet  TEXT NOT NULL,
  followed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_wallet, creator_wallet)
);

CREATE INDEX IF NOT EXISTS idx_creator_follows_creator ON creator_follows (creator_wallet);

CREATE TABLE IF NOT EXISTS follow_notifications (
  id              TEXT PRIMARY KEY,
  recipient_wallet TEXT NOT NULL,
  creator_wallet  TEXT NOT NULL,
  hunt_id         INTEGER NOT NULL,
  hunt_title      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_notifications_recipient ON follow_notifications (recipient_wallet);
