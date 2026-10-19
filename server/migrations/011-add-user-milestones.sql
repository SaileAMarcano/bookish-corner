CREATE TABLE IF NOT EXISTS user_milestones (
    user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    milestone_key TEXT NOT NULL CHECK (length(milestone_key) <= 40),
    achieved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen_at       TIMESTAMPTZ,
    claimed_at    TIMESTAMPTZ,
    PRIMARY KEY (user_id, milestone_key)
);

ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;