BEGIN;

ALTER TABLE user_books
    ADD COLUMN review_updated_at TIMESTAMPTZ;

UPDATE user_books
SET review_updated_at = COALESCE(finished_at, created_at)
WHERE review IS NOT NULL AND btrim(review) <> '';

CREATE INDEX user_books_review_updated_idx
    ON user_books (review_updated_at DESC, id DESC)
    WHERE review IS NOT NULL AND btrim(review) <> '';

COMMIT;
