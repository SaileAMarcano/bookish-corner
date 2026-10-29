CREATE TABLE IF NOT EXISTS book_requests (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       TEXT NOT NULL,
    author      TEXT,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'added', 'rejected')),
    work_id     INTEGER REFERENCES works (id) ON DELETE SET NULL,
    created_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS book_request_votes (
    request_id INTEGER NOT NULL REFERENCES book_requests (id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (request_id, user_id)
);

ALTER TABLE book_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_request_votes ENABLE ROW LEVEL SECURITY;