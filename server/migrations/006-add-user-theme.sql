ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT CHECK (theme IN ('light', 'dark'));
