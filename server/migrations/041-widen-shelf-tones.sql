BEGIN;

ALTER TABLE shelf_items DROP CONSTRAINT IF EXISTS shelf_items_tone_check;
ALTER TABLE shelf_items ADD CONSTRAINT shelf_items_tone_check CHECK (tone BETWEEN 0 AND 11);

COMMIT;
