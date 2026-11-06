BEGIN;
UPDATE users SET season_theme = 'classic' WHERE season_theme NOT IN ('classic', 'christmas');
ALTER TABLE users DROP CONSTRAINT users_season_theme_check;
ALTER TABLE users ADD CONSTRAINT users_season_theme_check CHECK (season_theme IN ('classic', 'christmas'));
COMMIT;