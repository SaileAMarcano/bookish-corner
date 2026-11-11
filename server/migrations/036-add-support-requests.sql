BEGIN;

CREATE TABLE IF NOT EXISTS support_requests (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('problem', 'idea', 'account', 'other')),
    message     TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 10 AND 2000),
    page_url    TEXT,
    user_agent  TEXT,
    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    staff_note  TEXT CHECK (length(staff_note) <= 500),
    resolved_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_requests_status_idx ON support_requests (status, created_at DESC);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

COMMIT;