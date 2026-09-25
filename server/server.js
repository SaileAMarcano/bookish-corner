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

app.get('/api/books/recent', requireAuth, (req, res) => {
    const books = db.prepare(`
        SELECT books.id, books.title, books.author, books.coverImage,
        (SELECT COUNT(*) FROM user_books
            WHERE user_books.bookId = books.id
            AND user_books.userId = ?) AS inLibrary
        FROM books
        ORDER BY books.id DESC
        LIMIT 12
    `).all(req.session.user.id);
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
            'INSERT INTO user_books (userId, bookId, startedAt, lastReadAt) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
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
        const insert = db.prepare('INSERT INTO user_books(userId, bookId, startedAt, lastReadAt) VALUES(?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
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
    const { status, progress, review, isFavorite, genre, currentPage, totalPages, currentChapter } = req.body;

    const userBook = db.prepare('SELECT * FROM user_books WHERE id = ?').get(id);
    if (!userBook) {
        return res.status(404).json({ error: 'Not found' });
    }
    if (userBook.userId !== req.session.user.id) {
        return res.status(403).json({ error: 'You cannot edit this entry' });
    }

    const pageFields = [currentPage, totalPages, currentChapter];
    const invalidNumber = pageFields.some(
        (value) => value !== undefined && (!Number.isInteger(value) || value < 0)
    );
    if (invalidNumber) {
        return res.status(400).json({ error: 'Pages and chapters must be whole numbers' });
    }

    const newTotal = totalPages !== undefined ? totalPages : userBook.totalPages;
    const newPage = currentPage !== undefined ? currentPage : userBook.currentPage;
    if (newTotal && newPage > newTotal) {
        return res.status(400).json({ error: 'Current page cannot be higher than the total' });
    }

    const statusChanged = status !== undefined && status !== userBook.status;
    const startedNow = statusChanged && status === 'reading' ? 1 : 0;
    const finishedNow = statusChanged && status === 'finished' ? 1 : 0;
    const readNow =
        (progress !== undefined && Number(progress) !== userBook.progress) ||
            (currentPage !== undefined && Number(currentPage) !== userBook.currentPage) ||
            (currentChapter !== undefined && Number(currentChapter) !== userBook.currentChapter) ? 1 : 0;

    db.prepare(`
        UPDATE user_books
        SET status = COALESCE(?, status),
            progress = COALESCE(?, progress),
            review = COALESCE(?, review),
            isFavorite = COALESCE(?, isFavorite),
            genre = COALESCE(?, genre),
            currentPage = COALESCE(?, currentPage),
            totalPages = COALESCE(?, totalPages),
            currentChapter = COALESCE(?, currentChapter),
            startedAt = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE startedAt END,
            finishedAt = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE finishedAt END,
            lastReadAt = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE lastReadAt END
        WHERE id = ?
    `).run(status, progress, review, isFavorite, genre, currentPage, totalPages, currentChapter, startedNow, finishedNow, readNow, id);

    const update = db.prepare('SELECT * FROM user_books WHERE id = ?').get(id);
    res.json(update);
});

app.get('/api/user-books', requireAuth, (req, res) => {
    const userBooks = db.prepare(`
        SELECT user_books.id, user_books.status, user_books.review, user_books.isFavorite, user_books.genre,
               user_books.currentPage, user_books.totalPages, user_books.currentChapter,
               user_books.startedAt, user_books.finishedAt, user_books.lastReadAt, user_books.createdAt,
               CASE WHEN user_books.status = 'finished' THEN 100
                    WHEN user_books.totalPages > 0
                    THEN MIN(100, ROUND(COALESCE(user_books.currentPage, 0) * 100.0 / user_books.totalPages))
                    ELSE user_books.progress
               END AS progress,
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

const passwordProblem = (password) => {
    if (typeof password !== 'string' || password.length < 8) {
        return 'Password must be at least 8 characters';
    }

    if (!/\d/.test(password)) {
        return 'Password must include a number';
    }
    if (!/[a-z]/i.test(password)) {
        return 'Password must include a letter';
    }
    return null;
}

app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const problem = passwordProblem(password);
    if (problem) {
        return res.status(400).json({ error: problem });
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
        'SELECT id, username, email, passwordHash, avatarUrl, displayName, readingGoal FROM users WHERE email = ?'
    ).get(email);

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = bcrypt.compareSync(password, user.passwordHash);

    if (!passwordMatches) {
        return res.status(401).json({ error: 'Invalid email or password' });
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
        displayName: user.displayName || user.username,
        readingGoal: user.readingGoal,
    });
});

app.get('/api/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const user = db.prepare(
        `SELECT id, username, email, avatarUrl, readingGoal, COALESCE(displayName, username) AS displayName FROM users WHERE id = ?`
    ).get(req.session.user.id);

    if (!user) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    res.json(user);
});

app.get('/api/profile', requireAuth, (req, res) => {
    const user = db.prepare(`
    SELECT id, username, email, bio, avatarUrl, instagramUrl, tiktokUrl, aboutMe, favoriteQuote, favoriteThings, location, readingGoal,
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
    const { bio, instagramUrl, tiktokUrl, location } = req.body;
    const aboutMe = req.body.aboutMe?.trim().slice(0, 600) || null;
    const favoriteQuote = req.body.favoriteQuote?.trim().slice(0, 200) || null;
    const favoriteThings = req.body.favoriteThings?.trim().slice(0, 300) || null;
    const displayName = req.body.displayName?.trim().slice(0, 40) || null;
    const goal = parseInt(req.body.readingGoal, 10);
    const readingGoal = goal >= 1 && goal <= 365 ? goal : null;
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(`
        UPDATE users
        SET bio = COALESCE(?, bio),
            displayName = COALESCE(?, displayName),
            aboutMe = COALESCE(?, aboutMe),
            favoriteQuote = COALESCE(?,  favoriteQuote),
            favoriteThings = COALESCE(?, favoriteThings),
            location = COALESCE(?, location),
            instagramUrl = COALESCE(?, instagramUrl),
            tiktokUrl = COALESCE(?, tiktokUrl),
            readingGoal = COALESCE(?, readingGoal),
            avatarUrl = COALESCE(?, avatarUrl)
        WHERE ID = ?
    `).run(bio, displayName, aboutMe, favoriteQuote, favoriteThings, location, instagramUrl, tiktokUrl, readingGoal, avatarUrl, req.session.user.id);

    const update = db.prepare(
        'SELECT id, username, email, bio, avatarUrl, instagramUrl, tiktokUrl, aboutMe, favoriteQuote, favoriteThings, location, readingGoal, COALESCE(displayName, username) AS displayName FROM users WHERE id = ? '
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