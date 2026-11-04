BEGIN;

ALTER TABLE user_books
    ADD COLUMN read_year SMALLINT,
    ADD COLUMN finished_on DATE,
    ADD CONSTRAINT user_books_read_year_range
        CHECK (read_year BETWEEN 1000 AND 9999),
    ADD CONSTRAINT user_books_finished_on_year
        CHECK (
            finished_on IS NULL
            OR (read_year IS NOT NULL AND read_year = EXTRACT(YEAR FROM finished_on))
        );

UPDATE user_books
SET read_year = EXTRACT(YEAR FROM finished_at AT TIME ZONE 'UTC')::SMALLINT
WHERE status = 'finished' AND finished_at IS NOT NULL;

COMMIT;