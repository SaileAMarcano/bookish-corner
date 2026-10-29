CREATE TABLE IF NOT EXISTS invites (
    code       TEXT PRIMARY KEY,
    note       TEXT,
    created_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
    used_by    INTEGER REFERENCES users (id) ON DELETE SET NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;