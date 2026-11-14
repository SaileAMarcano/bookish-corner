ALTER TABLE shelf_items ADD COLUMN IF NOT EXISTS face TEXT CHECK (face IN ('cover', 'solid'));
