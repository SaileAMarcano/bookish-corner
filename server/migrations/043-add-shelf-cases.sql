CREATE TABLE IF NOT EXISTS shelf_cases (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    year    SMALLINT NOT NULL CHECK (year = 0 OR year BETWEEN 1000 AND 9999),
    model   TEXT NOT NULL CHECK (model IN ('scroll', 'gothic', 'floral')),
    color   TEXT NOT NULL CHECK (color IN ('black', 'tan', 'walnut', 'oak', 'honey', 'rose', 'sage', 'night')),
    PRIMARY KEY (user_id, year)
);

ALTER TABLE shelf_cases ENABLE ROW LEVEL SECURITY;
