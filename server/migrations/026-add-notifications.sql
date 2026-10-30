CREATE TABLE IF NOT EXISTS notifications (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    actor_id        INTEGER REFERENCES users (id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('post_like', 'post_comment', 'review_like', 'review_comment', 'follow', 'book_added')),
    post_id         INTEGER REFERENCES posts (id) ON DELETE CASCADE,
    post_comment_id INTEGER REFERENCES post_comments (id) ON DELETE CASCADE,
    user_book_id    INTEGER REFERENCES user_books (id) ON DELETE CASCADE,
    comment_id      INTEGER REFERENCES comments (id) ON DELETE CASCADE,
    work_id         INTEGER REFERENCES works (id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;