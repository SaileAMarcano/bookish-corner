BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS color_vision TEXT NOT NULL DEFAULT 'default'
    CHECK (color_vision IN ('default', 'red-green', 'blue-yellow'));

COMMIT;
