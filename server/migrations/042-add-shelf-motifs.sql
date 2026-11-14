ALTER TABLE shelf_items ADD COLUMN IF NOT EXISTS motif TEXT CHECK (motif IN ('star', 'heart', 'flower', 'quill', 'key', 'planet', 'moon', 'hourglass', 'leaf', 'bubble'));
