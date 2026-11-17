BEGIN;
ALTER TABLE shelf_items DROP CONSTRAINT IF EXISTS shelf_items_decoration_check;
UPDATE shelf_items SET decoration = 'bookends' WHERE decoration = 'tea';
ALTER TABLE shelf_items ADD CONSTRAINT shelf_items_decoration_check
    CHECK (decoration IN ('candle', 'quill', 'stars', 'flowers', 'bookends'));
COMMIT;
