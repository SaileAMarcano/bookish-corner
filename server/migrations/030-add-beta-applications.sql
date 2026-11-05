CREATE TABLE IF NOT EXISTS beta_applications (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    age           INTEGER NOT NULL CHECK (age BETWEEN 18 AND 120),
    social        TEXT,
    app_language  TEXT NOT NULL CHECK (app_language IN ('en', 'es')),
    genres        TEXT[] NOT NULL DEFAULT '{}',
    tracking      TEXT[] NOT NULL DEFAULT '{}',
    found_via     TEXT,
    phrase        TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'invited', 'declined')),
    invite_id     INTEGER REFERENCES invites (id) ON DELETE SET NULL,
    reviewed_by   INTEGER REFERENCES users (id) ON DELETE SET NULL,
    reviewed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS beta_applications_email_idx ON beta_applications (lower(email));
CREATE INDEX IF NOT EXISTS beta_applications_status_idx ON beta_applications (status, created_at DESC);

ALTER TABLE beta_applications ENABLE ROW LEVEL SECURITY;
