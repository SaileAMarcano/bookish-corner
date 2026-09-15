const Database = require('better-sqlite3');
const db = new Database('books.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS books(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    coverImage TEXT,
    likes INTEGER DEFAULT 0
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS comments(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookId INTEGER NOT NULL,
    text TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

const row = db.prepare('SELECT COUNT(*) AS count FROM books').get();

if (row.count === 0) {
    const insert = db.prepare(`
        INSERT INTO books (title, author, description, coverImage)
        VALUES (?, ?, ?, ?)
    `);

    insert.run('Espiritu Salvaje', 'Adriana Criado', 'Una novela romantica ambientada en el mundo de las carreras de caballos.', 'espiritu-salvaje.jpg');
    insert.run('Blood of Hercules', 'Jasmine Mas', 'A dark fantasy novel that reimagines Greek mythology.', 'blood-of-hercules.webp');
}

module.exports = db;