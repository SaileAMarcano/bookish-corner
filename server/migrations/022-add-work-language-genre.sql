ALTER TABLE works
    ADD COLUMN IF NOT EXISTS language TEXT CHECK (language IN ('en', 'es', 'other')),
    ADD COLUMN IF NOT EXISTS genre TEXT;