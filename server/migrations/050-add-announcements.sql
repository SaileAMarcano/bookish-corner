BEGIN;
CREATE TABLE IF NOT EXISTS announcements (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    title_es   TEXT NOT NULL CHECK (length(trim(title_es)) > 0 AND length(title_es) <= 80),
    body_es    TEXT NOT NULL CHECK (length(trim(body_es)) > 0 AND length(body_es) <= 1000),
    title_en   TEXT NOT NULL CHECK (length(trim(title_en)) > 0 AND length(title_en) <= 80),
    body_en    TEXT NOT NULL CHECK (length(trim(body_en)) > 0 AND length(body_en) <= 1000),
    link       TEXT CHECK (link IS NULL OR (link LIKE '/%' AND length(link) <= 200)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS announcement_id INTEGER REFERENCES announcements (id) ON DELETE CASCADE;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('post_like', 'post_comment', 'review_like', 'review_comment', 'follow', 'book_added', 'list_like', 'list_comment', 'announcement'));
ALTER TABLE users ALTER COLUMN push_types SET DEFAULT ARRAY['follows', 'comments', 'books', 'updates'];
UPDATE users SET push_types = array_append(push_types, 'updates') WHERE NOT ('updates' = ANY (push_types));
COMMIT;
