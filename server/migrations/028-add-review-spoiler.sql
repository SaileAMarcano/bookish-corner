BEGIN;

ALTER TABLE user_books
    ADD COLUMN review_is_spoiler BOOLEAN NOT NULL DEFAULT false;

COMMIT;
