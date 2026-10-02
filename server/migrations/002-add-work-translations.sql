-- Session 19: titles and descriptions of the books in other languages.
-- works keeps the original (English) title; this table adds the Spanish one.
-- If a book has no row here, the app shows the title from works.
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS work_translations (
    work_id     INTEGER NOT NULL REFERENCES works (id) ON DELETE CASCADE,
    language    TEXT NOT NULL CHECK (language IN ('en', 'es')),
    title       TEXT NOT NULL,
    description TEXT,
    PRIMARY KEY (work_id, language)
);
