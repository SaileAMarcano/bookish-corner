const express = require('express');
const db = require('./db');
const app = express();
app.use(express.json());
const PORT = 3000;

app.get('/api/books', (req, res) => {
    const books = db.prepare('SELECT * FROM books').all();
    res.json(books);
});

app.post('/api/books/:id/like', (req, res) => {
    const { id } = req.params;
    db.prepare('UPDATE books SET likes = likes + 1 WHERE id = ?').run(id);
    const updateBook = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    res.json(updateBook);
});

app.post('/api/books/:id/comments', (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'El comentario no puede estar vacio' });
    }

    const insert = db.prepare('INSERT INTO comments (bookId, text) VALUES (?, ?)');
    const result = insert.run(id, text);

    const newComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newComment);
});

app.get('/api/books/:id/comments', (req, res) => {
    const { id } = req.params;
    const comments = db.prepare('SELECT * FROM comments WHERE bookId = ? ORDER BY createdAt DESC').all(id);
    res.json(comments);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});