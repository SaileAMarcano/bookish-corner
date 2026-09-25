const Database = require('better-sqlite3');
const db = new Database('books.db');

const result = db.prepare('DELETE FROM users WHERE email = ?').run('prueba@test.com');
console.log(`Deleted users: ${result.changes}`);