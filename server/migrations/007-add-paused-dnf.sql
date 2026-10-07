ALTER TABLE user_books DROP CONSTRAINT IF EXISTS user_books_status_check;

ALTER TABLE user_books ADD CONSTRAINT user_books_status_check
    CHECK (status IN ('want-to-read', 'reading', 'paused', 'dnf', 'finished'));