ALTER TABLE users DROP CONSTRAINT IF EXISTS users_staff_role_check;

ALTER TABLE users ADD CONSTRAINT users_staff_role_check
    CHECK (staff_role IN ('admin', 'editor', 'moderator', 'designer'));