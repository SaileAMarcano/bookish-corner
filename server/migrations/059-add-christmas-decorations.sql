BEGIN;
ALTER TABLE shelf_items DROP CONSTRAINT IF EXISTS shelf_items_decoration_check;
ALTER TABLE shelf_items ADD CONSTRAINT shelf_items_decoration_check
    CHECK (decoration IN (
        'candle', 'quill', 'stars', 'flowers', 'bookends',
        'tree', 'gift-books', 'reindeer', 'snowman', 'snow-globe',
        'bottle', 'seashell', 'compass', 'clock',
        'moon', 'moon-chest', 'geode', 'secret-door', 'dragon-egg',
        'treasure-map', 'suitcase', 'globe', 'camera',
        'reading-cat', 'paper-lantern', 'daruma', 'fox-mask'
    ));
COMMIT;
