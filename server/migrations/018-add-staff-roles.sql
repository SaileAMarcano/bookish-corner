ALTER TABLE users
    ADD COLUMN IF NOT EXISTS staff_role TEXT CHECK (staff_role IN ('admin', 'editor', 'moderator'));

UPDATE users SET staff_role = 'admin' WHERE is_admin AND staff_role IS NULL;

ALTER TABLE works 
    ADD COLUMN IF NOT EXISTS added_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;