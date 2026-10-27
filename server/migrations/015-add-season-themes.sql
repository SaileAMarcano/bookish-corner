ALTER TABLE users
    ADD COLUMN IF NOT EXISTS season_theme TEXT NOT NULL DEFAULT 'classic'
        CHECK (season_theme IN ('classic', 'christmas', 'valentine', 'sage', 'lavender', 'amber', 'teal')),
    ADD COLUMN IF NOT EXISTS plus_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS theme_unlocks (
    user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    theme       TEXT NOT NULL CHECK (theme IN ('sage', 'lavender', 'amber', 'teal')),
    order_id    TEXT UNIQUE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, theme)
);

ALTER TABLE theme_unlocks ENABLE ROW LEVEL SECURITY;