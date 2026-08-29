-- Migration: add variant column to anti_cheat_answers to support A/B testing

ALTER TABLE IF EXISTS anti_cheat_answers
  ADD COLUMN IF NOT EXISTS variant TEXT;

CREATE INDEX IF NOT EXISTS idx_anti_cheat_answers_variant
  ON anti_cheat_answers (variant);
