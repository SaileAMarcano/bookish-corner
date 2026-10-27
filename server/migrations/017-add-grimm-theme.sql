ALTER TABLE users DROP CONSTRAINT IF EXISTS users_season_theme_check;

ALTER TABLE users ADD CONSTRAINT users_season_theme_check
    CHECK (season_theme IN ('classic', 'christmas', 'valentine', 'sage', 'lavender', 'amber', 'teal', 'grimm'));
