CREATE TABLE IF NOT EXISTS tag_follows (
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS tag_follows_tag_idx ON tag_follows (tag_id);

ALTER TABLE tag_follows ENABLE ROW LEVEL SECURITY;