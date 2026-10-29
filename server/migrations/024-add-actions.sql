CREATE TABLE IF NOT EXISTS staff_actions (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id   INTEGER REFERENCES users (id) ON DELETE SET NULL,
    action     TEXT NOT NULL,
    target     TEXT,
    detail     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_actions_created_idx ON staff_actions (created_at DESC);

ALTER TABLE staff_actions ENABLE ROW LEVEL SECURITY;