ALTER TABLE user_books ADD COLUMN IF NOT EXISTS progress_note TEXT
    CHECK (length(progress_note) <= 280);
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS progress_note_at TIMESTAMPTZ;