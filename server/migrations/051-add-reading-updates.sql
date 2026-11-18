BEGIN;
CREATE TABLE IF NOT EXISTS reading_updates (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_book_id INTEGER NOT NULL REFERENCES user_books (id) ON DELETE CASCADE,
    user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind         TEXT NOT NULL CHECK (kind IN ('started', 'progress', 'finished')),
    current_page INTEGER CHECK (current_page >= 0),
    total_pages  INTEGER CHECK (total_pages > 0),
    progress     SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    note         TEXT CHECK (length(note) <= 280),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reading_updates_user_book_id_idx ON reading_updates (user_book_id);
CREATE INDEX IF NOT EXISTS reading_updates_updated_at_idx ON reading_updates (updated_at);

CREATE TABLE IF NOT EXISTS reading_update_likes (
    update_id  INTEGER NOT NULL REFERENCES reading_updates (id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (update_id, user_id)
);

CREATE TABLE IF NOT EXISTS reading_update_comments (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    update_id  INTEGER NOT NULL REFERENCES reading_updates (id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    text       TEXT NOT NULL CHECK (length(trim(text)) > 0 AND length(text) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reading_update_comments_update_id_idx ON reading_update_comments (update_id);

ALTER TABLE reading_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_update_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_update_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reading_update_id INTEGER REFERENCES reading_updates (id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reading_update_comment_id INTEGER REFERENCES reading_update_comments (id) ON DELETE CASCADE;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('post_like', 'post_comment', 'review_like', 'review_comment', 'follow', 'book_added', 'list_like', 'list_comment', 'announcement', 'update_like', 'update_comment'));

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_target_type_check;
ALTER TABLE reports ADD CONSTRAINT reports_target_type_check
    CHECK (target_type IN ('post', 'post_comment', 'review', 'review_comment', 'profile', 'tag', 'list', 'list_comment', 'update_comment'));

INSERT INTO reading_updates (user_book_id, user_id, kind, current_page, total_pages, progress, note, created_at, updated_at)
SELECT ub.id, ub.user_id,
       CASE WHEN ub.status = 'finished' THEN 'finished'
            WHEN COALESCE(ub.current_page, 0) > 0 OR ub.progress > 0 THEN 'progress'
            ELSE 'started' END,
       ub.current_page, ub.total_pages,
       CASE WHEN ub.total_pages > 0 THEN LEAST(100, ROUND(COALESCE(ub.current_page, 0) * 100.0 / ub.total_pages))
            ELSE ub.progress END,
       CASE WHEN ub.status = 'finished' THEN NULL ELSE ub.progress_note END,
       d.happened_at, d.happened_at
FROM user_books ub
CROSS JOIN LATERAL (
    SELECT CASE WHEN ub.status = 'finished' THEN COALESCE(ub.finished_at, ub.created_at)
                ELSE COALESCE(ub.last_read_at, ub.started_at, ub.created_at) END AS happened_at
) d
WHERE ub.status IN ('reading', 'finished')
  AND NOT EXISTS (SELECT 1 FROM reading_updates ru WHERE ru.user_book_id = ub.id);
COMMIT;
