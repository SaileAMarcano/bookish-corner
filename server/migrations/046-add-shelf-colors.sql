ALTER TABLE shelf_items ADD COLUMN IF NOT EXISTS color TEXT CHECK (color ~ '^#[0-9a-f]{6}$');
