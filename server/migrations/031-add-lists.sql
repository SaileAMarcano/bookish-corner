BEGIN;

CREATE TABLE IF NOT EXISTS lists (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 80),
    description TEXT CHECK (length(description) <= 500),
    is_public   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS list_books (
    list_id  INTEGER NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    work_id  INTEGER NOT NULL REFERENCES works (id) ON DELETE RESTRICT,
    position SMALLINT NOT NULL DEFAULT 0,
    note     TEXT CHECK (length(note) <= 280),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (list_id, work_id)
);

CREATE TABLE IF NOT EXISTS list_tags (
    list_id  INTEGER NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    position SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (list_id, tag_id)
);

CREATE TABLE IF NOT EXISTS list_likes (
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    list_id    INTEGER NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, list_id)
);

CREATE TABLE IF NOT EXISTS saved_lists (
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    list_id    INTEGER NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, list_id)
);

CREATE TABLE IF NOT EXISTS list_comments (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    list_id    INTEGER NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    text       TEXT NOT NULL CHECK (length(trim(text)) > 0 AND length(text) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lists_user_created_idx ON lists (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lists_public_created_idx ON lists (created_at DESC) WHERE is_public;
CREATE INDEX IF NOT EXISTS list_books_work_idx ON list_books (work_id);
CREATE INDEX IF NOT EXISTS list_tags_tag_idx ON list_tags (tag_id);
CREATE INDEX IF NOT EXISTS list_likes_list_idx ON list_likes (list_id);
CREATE INDEX IF NOT EXISTS list_comments_list_idx ON list_comments (list_id);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS list_id INTEGER REFERENCES lists (id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS list_comment_id INTEGER REFERENCES list_comments (id) ON DELETE CASCADE;
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('post_like', 'post_comment', 'review_like', 'review_comment', 'follow', 'book_added', 'list_like', 'list_comment'));

ALTER TABLE reports DROP CONSTRAINT reports_target_type_check;
ALTER TABLE reports ADD CONSTRAINT reports_target_type_check
    CHECK (target_type IN ('post', 'post_comment', 'review', 'review_comment', 'profile', 'tag', 'list', 'list_comment'));

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_comments ENABLE ROW LEVEL SECURITY;

COMMIT;