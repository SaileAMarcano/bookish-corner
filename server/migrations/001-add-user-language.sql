-- Session 19: each user keeps the language they chose (English or Spanish).
-- Safe to run more than once: IF NOT EXISTS skips it if the column is already there.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'es'));
