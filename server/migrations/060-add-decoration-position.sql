BEGIN;
ALTER TABLE shelf_items ADD COLUMN IF NOT EXISTS pos_x REAL CHECK (pos_x >= 0 AND pos_x <= 1);
COMMIT;
