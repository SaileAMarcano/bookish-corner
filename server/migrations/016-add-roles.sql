ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS gender_identity TEXT
        CHECK (gender_identity IN ('woman', 'man', 'nonbinary', 'unspecified'));

CREATE TABLE IF NOT EXISTS user_roles (
    user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('reader', 'writer', 'reviewer', 'creator', 'publisher', 'club_host', 'illustrator')),
    position    SMALLINT NOT NULL CHECK (position IN (1, 2)),
    verified_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role),
    UNIQUE (user_id, position)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;