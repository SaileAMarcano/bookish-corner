const express = require('express');
const db = require('./db');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const app = express();
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

app.use(session({
    secret: 'bookish-corner-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24,
    },
}));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

app.use('/uploads', express.static('uploads'));

const PORT = 3000;
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'You must be logged in' });
    }
    next();
}

function cleanDescription(text) {
    if (!text) return null;

    let clean = text;

    clean = clean.split(/\n-{3,}/)[0];

    clean = clean.replace(/\[[^\]]*\]\(https?:\/\/[^)]*\)/g, '');

    clean = clean.replace(/https?:\/\/\S+/g, '');

    clean = clean.replace(/\s+/g, ' ').trim();

    return clean === '' ? null : clean;
}

app.get('/api/books', (req, res) => {
    const books = db.prepare('SELECT * FROM books').all();
    res.json(books);
});

app.get('/api/search-books', async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === '') {
        return res.status(400).json({ error: 'A search term is required' });
    }

    try {
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=10&fields=key,title,author_name,first_publish_year,cover_i`;

        const response = await fetch(url);
        const data = await response.json();

        const results = data.docs.map((doc) => ({
            openLibraryKey: doc.key,
            title: doc.title,
            author: doc.author_name ? doc.author_name[0] : 'Unknown author',
            year: doc.first_publish_year || null,
            coverImage: doc.cover_i
                ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                : null,
        }));

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not search books right now' });
    }
});

app.post('/api/user-books', requireAuth, (req, res) => {
    const { bookId } = req.body;
    if (!bookId) {
        return res.status(400).json({ error: 'bookId is required' });
    }
    try {
        const insert = db.prepare(
            'INSERT INTO user_books (userId, bookId) VALUES(?, ?)'
        );
        const result = insert.run(req.session.user.id, bookId);
        res.status(201).json({ id: result.lastInsertRowid, userId: req.session.user.id, bookId });
    } catch (error) {
        res.status(400).json({ error: 'You already added this book to your profile' });
    }
});

app.post('/api/user-books/from-search', requireAuth, async (req, res) => {
    const { openLibraryKey, title, author, coverImage } = req.body;

    if (!openLibraryKey || !title) {
        return res.status(400).json({ error: 'openLibraryKey and title are required' })
    }

    let book = db.prepare('SELECT * FROM books WHERE openLibraryKey = ?').get(openLibraryKey);

    if (!book) {
        let description = null;

        try {
            const workResponse = await fetch(`https://openlibrary.org${openLibraryKey}.json`);
            const work = await workResponse.json();

            if (typeof work.description === 'string') {
                description = cleanDescription(work.description);
            } else if (work.description && work.description.value) {
                description = cleanDescription(work.description.value);
            }
        } catch (error) {
            console.error('Could not load description', error);
        }

        const insert = db.prepare(`
            INSERT INTO books (title, author, description, coverImage, openLibraryKey) 
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = insert.run(
            title,
            author || 'Unknown author',
            description,
            coverImage || null,
            openLibraryKey
        );

        book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    }

    try {
        const insert = db.prepare('INSERT INTO user_books (userId, bookId) VALUES(?, ?)');
        const result = insert.run(req.session.user.id, book.id);
        res.status(201).json({ id: result.lastInsertRowid, book });
    } catch (error) {
        res.status(400).json({ error: 'You already added this book to your profile' });
    }
});

app.post('/api/user-books/:id/Like', requireAuth, (req, res) => {
    const { id } = req.params;
    try {
        const insert = db.prepare(
            'INSERT INTO likes (userId, userBookId) VALUES (?, ?)'
        );
        insert.run(req.session.user.id, id);
        res.status(201).json({ message: 'Liked' });
    } catch (error) {
        res.status(400).json({ error: 'You already liked this' });
    }
});

app.delete('/api/user-books/:id/like', requireAuth, (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM likes WHERE userId = ? AND userBookId = ?').run(req.session.user.id, id);
    res.json({ message: 'Unliked' });
});

app.patch('/api/user-books/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { status, progress, review } = req.body;

    const userBook = db.prepare('SELECT * FROM user_books WHERE id = ?').get(id);
    if (!userBook) {
        return res.status(404).json({ error: 'Not found' });
    }
    if (userBook.userId !== req.session.user.id) {
        return res.status(403).json({ error: 'You cannot edit this entry' });
    }

    db.prepare(`
        UPDATE user_books
        SET status = COALESCE(?, status),
            progress = COALESCE(?, progress),
            review = COALESCE(?, review)
        WHERE id = ?
    `).run(status, progress, review, id);

    const update = db.prepare('SELECT * FROM user_books WHERE id = ?').get(id);
    res.json(update);
});

app.get('/api/user-books', requireAuth, (req, res) => {
    const userBooks = db.prepare(`
        SELECT user_books.id, user_books.status, user_books.progress, user_books.review,
               books.id AS bookId, books.title, books.author, books.description, books.coverImage, books.openLibraryKey,
               (SELECT COUNT (*) FROM likes WHERE likes.userBookId = user_books.id) AS likeCount,
               (SELECT COUNT(*) FROM likes WHERE likes.userBookId = user_books.id AND likes.userId = ?) AS hasLiked
        FROM user_books
        JOIN books ON user_books.bookId = books.id
        WHERE user_books.userId = ?
    `).all(req.session.user.id, req.session.user.id);
    res.json(userBooks);
});

app.post('/api/user-books/:id/comments', requireAuth, (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const insert = db.prepare(
        'INSERT INTO comments (userId, userBookId, text) VALUES (?, ?, ?)'
    );
    const result = insert.run(req.session.user.id, id, text);

    const newComment = db.prepare(`
        SELECT comments.id, comments.text, comments.createdAt, users.username
        FROM comments
        JOIN users ON comments.userId = users.id
        WHERE comments.id = ?
        `).get(result.lastInsertRowid);
    res.status(201).json(newComment);
});

app.get('/api/user-books/:id/comments', (req, res) => {
    const { id } = req.params;
    const comments = db.prepare(`
        SELECT comments.id, comments.text, comments.createdAt, users.username
        FROM comments
        JOIN users ON comments.userId = users.id
        WHERE comments.userBookId = ?
        ORDER BY comments.createdAt DESC
    `).all(id);
    res.json(comments);
});

app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    try {
        const insert = db.prepare(
            'INSERT INTO users (username, email, passwordHash) VALUES (?, ?, ?)'
        );
        const result = insert.run(username, email, passwordHash);

        res.status(201).json({
            id: result.lastInsertRowid,
            username: username,
            email: email,
        });
    } catch (error) {
        res.status(400).json({ error: 'Username or email already in use' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare(
        'SELECT id, username, email, passwordHash, avatarUrl FROM users WHERE email = ?'
    ).get(email);

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = bcrypt.compareSync(password, user.passwordHash);

    if (!passwordMatches) {
        return res.status(401).json({ error: 'Invalid email or password ' });
    }

    req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
    };

    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
    });
});

app.get('/api/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const user = db.prepare(
        'SELECT id, username, email, avatarUrl FROM users WHERE id = ?'
    ).get(req.session.user.id);

    if (!user) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    res.json(user);
});

app.get('/api/profile', requireAuth, (req, res) => {
    const user = db.prepare(`
    SELECT id, username, email, bio, avatarUrl, instagramUrl, tiktokUrl,
        COALESCE(displayName, username) AS displayName,
        (SELECT COUNT(*) FROM user_books
            WHERE user_books.userId = users.id
            AND user_books.status = 'finished') AS booksRead,
        (SELECT COUNT(*) FROM user_books
            WHERE user_books.userId = users.id
            AND user_books.review IS NOT NULL
            AND TRIM (user_books.review) != '') AS reviewsCount,
        (SELECT COUNT (*) FROM user_books
            WHERE user_books.userId = users.id
            AND user_books.status = 'reading') AS currentlyReading
    FROM users
    WHERE users.id = ?
    `).get(req.session.user.id);

    res.json(user);
});

app.patch('/api/profile', requireAuth, upload.single('avatar'), (req, res) => {
    const { bio, instagramUrl, tiktokUrl } = req.body;
    const displayName = req.body.displayName?.trim().slice(0, 40) || null;
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(`
        UPDATE users
        SET bio = COALESCE(?, bio),
            displayName = COALESCE(?, displayName),
            instagramUrl = COALESCE(?, instagramUrl),
            tiktokUrl = COALESCE(?, tiktokUrl),
            avatarUrl = COALESCE(?, avatarUrl)
        WHERE ID = ?
    `).run(bio, displayName, instagramUrl, tiktokUrl, avatarUrl, req.session.user.id);

    const update = db.prepare(
        'SELECT id, username, email, bio, avatarUrl, instagramUrl, tiktokUrl, COALESCE(displayName, username) AS displayName FROM users WHERE id = ? '
    ).get(req.session.user.id);

    res.json(update);
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});