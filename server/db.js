const Database = require('better-sqlite3');
const db = new Database('books.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS books(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    coverImage TEXT
    )
`);

try {
  db.exec(`ALTER TABLE books ADD COLUMN openLibraryKey TEXT`);
} catch (error) {

}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_books_openLibraryKey
  ON books (openLibraryKey)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    userBookId INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, userBookId)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    userBookId INTEGER NOT NULL,
    text TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
    `);

try {
  db.exec(`ALTER TABLE users ADD COLUMN bio TEXT`);
} catch (error) {

}

try {
  db.exec(`ALTER TABLE users ADD COLUMN avatarUrl TEXT`);
} catch (error) {

}

try {
  db.exec(`ALTER TABLE users ADD COLUMN instagramUrl TEXT`);
} catch (error) {

}

try {
  db.exec(`ALTER TABLE users ADD COLUMN tiktokUrl TEXT`);
} catch (error) {

}

try {
  db.exec(`ALTER TABLE users ADD COLUMN displayName TEXT`);
} catch (error) {

}

try {
  db.exec(`ALTER TABLE users ADD COLUMN aboutMe TEXT`);
} catch (error) {

}

try {
  db.exec(`ALTER TABLE users ADD COLUMN favoriteQuote TEXT`);
} catch (error) {

}

try {
  db.exec(`ALTER TABLE users ADD COLUMN favoriteThings TEXT`);
} catch (error) {

}

try {
  db.exec(`ALTER TABLE users ADD COLUMN location TEXT`);
} catch (error) {

}

db.exec(`
    CREATE TABLE IF NOT EXISTS user_books(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    bookId INTEGER NOT NULL,
    status TEXT DEFAULT 'reading',
    progress INTEGER DEFAULT 0,
    review TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userID, bookId)
    )
    `);

try {
  db.exec(`ALTER TABLE user_books ADD COLUMN isFavorite INTEGER DEFAULT 0`);
} catch (error) {

}

try {
  db.exec(`ALTER TABLE user_books ADD COLUMN genre TEXT`);
} catch (error) {

}


const row = db.prepare('SELECT COUNT(*) AS count FROM books').get();

if (row.count === 0) {
  const insert = db.prepare(`
        INSERT INTO books (title, author, description, coverImage)
        VALUES (?, ?, ?, ?)
    `);

  insert.run('Espiritu Salvaje', 'Adriana Criado', 'A romance novel set in the world of horse racing in Maplewood Hollow.', 'espiritu-salvaje.jpg');
  insert.run('Blood of Hercules', 'Jasmine Mas', 'A dark fantasy novel that reimagines Greek mythology.', 'blood-of-hercules.webp');
}

module.exports = db;