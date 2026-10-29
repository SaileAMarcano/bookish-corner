CREATE TABLE IF NOT EXISTS reports (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    target_type     TEXT NOT NULL CHECK (target_type IN ('post', 'post_comment', 'review', 'review_comment', 'profile', 'tag')),
    target_id       INTEGER NOT NULL,
    reason          TEXT NOT NULL CHECK (reason IN ('spoiler', 'offensive', 'harassment', 'spam', 'other')),
    details         TEXT CHECK (length(details) <= 500),
    reported_by     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'spoiler', 'removed')),
    resolution_note TEXT,
    resolved_by     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (target_type, target_id, reported_by)
);

CREATE INDEX IF NOT EXISTS reports_pending_idx ON reports (target_type, target_id) WHERE status = 'pending';

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;