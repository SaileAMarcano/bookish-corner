const express = require('express');
const { query, pool } = require('./database');
const { descriptionFrom } = require('./openLibrary');
const { uploadAvatar } = require('./storage');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const multer = require('multer');
const path = require('path');
const app = express();
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is missing in server/.env');
}

app.use(session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24,
    },
}));

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!AVATAR_TYPES.includes(file.mimetype)) {
            const error = new Error('The photo must be a JPG, PNG or GIF image');
            error.status = 400;
            return cb(error);
        }
        cb(null, true);
    },
});

// Old profile photos (before Supabase Storage). Remove when nobody uses /uploads anymore.
app.use('/uploads', express.static('uploads'));

const PORT = 3000;
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'You must be logged in' });
    }
    next();
}


app.get('/api/books', async (req, res) => {
    const books = await query('SELECT * FROM works ORDER BY id');
    res.json(books);
});

app.get('/api/books/recent', requireAuth, async (req, res) => {
    const books = await query(`
        SELECT works.id, works.title, works.author, works.cover_image,
               EXISTS (
                   SELECT 1 FROM user_books
                   WHERE user_books.work_id = works.id AND user_books.user_id = $1
               ) AS in_library
        FROM works
        ORDER BY works.id DESC
        LIMIT 12
    `, [req.session.user.id]);
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

app.post('/api/user-books', requireAuth, async (req, res) => {
    const { bookId } = req.body;
    if (!bookId) {
        return res.status(400).json({ error: 'bookId is required' });
    }

    try {
        const [entry] = await query(`
            INSERT INTO user_books (user_id, work_id, started_at, last_read_at)
            VALUES ($1, $2, now(), now())
            RETURNING id, user_id, work_id AS book_id
        `, [req.session.user.id, bookId]);
        res.status(201).json(entry);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'You already added this book to your profile' });
        }
        // 23503 = foreign_key_violation: that book does not exist
        if (error.code === '23503') {
            return res.status(404).json({ error: 'Book not found' });
        }
        throw error;
    }
});

app.post('/api/user-books/from-search', requireAuth, async (req, res) => {
    const { openLibraryKey, title, author, coverImage } = req.body;

    if (!openLibraryKey || !title) {
        return res.status(400).json({ error: 'openLibraryKey and title are required' });
    }

    let [book] = await query('SELECT * FROM works WHERE open_library_key = $1', [openLibraryKey]);

    if (!book) {
        let description = null;

        try {
            const workResponse = await fetch(`https://openlibrary.org${openLibraryKey}.json`);
            const work = await workResponse.json();
            description = descriptionFrom(work);
        } catch (error) {
            console.error('Could not load description', error);
        }

        [book] = await query(`
            INSERT INTO works (title, author, description, cover_image, open_library_key)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [title, author || 'Unknown author', description, coverImage || null, openLibraryKey]);
    }

    try {
        const [entry] = await query(`
            INSERT INTO user_books (user_id, work_id, started_at, last_read_at)
            VALUES ($1, $2, now(), now())
            RETURNING id
        `, [req.session.user.id, book.id]);
        res.status(201).json({ id: entry.id, book });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'You already added this book to your profile' });
        }
        throw error;
    }
});

app.post('/api/user-books/:id/like', requireAuth, async (req, res) => {
    const { id } = req.params;

    const [userBook] = await query('SELECT user_id FROM user_books WHERE id = $1', [id]);
    if (!userBook) {
        return res.status(404).json({ error: 'Review not found' });
    }
    if (userBook.userId === req.session.user.id) {
        return res.status(403).json({ error: "You can't like your own review" });
    }

    try {
        await query('INSERT INTO likes (user_id, user_book_id) VALUES ($1, $2)', [req.session.user.id, id]);
        res.status(201).json({ message: 'Liked' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'You already liked this' });
        }
        throw error;
    }
});

app.delete('/api/user-books/:id/like', requireAuth, async (req, res) => {
    await query(
        'DELETE FROM likes WHERE user_id = $1 AND user_book_id = $2',
        [req.session.user.id, req.params.id]
    );
    res.json({ message: 'Unliked' });
});

const keepOrSet = (value, current) => (value === undefined ? current : value);

app.patch('/api/user-books/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status, progress, review, isFavorite, genre, currentPage, totalPages, currentChapter, rating } = req.body;

    const [userBook] = await query('SELECT * FROM user_books WHERE id = $1', [id]);
    if (!userBook) {
        return res.status(404).json({ error: 'Not found' });
    }
    if (userBook.userId !== req.session.user.id) {
        return res.status(403).json({ error: 'You cannot edit this entry' });
    }

    const pageFields = [currentPage, totalPages, currentChapter];
    const invalidNumber = pageFields.some(
        (value) => value !== undefined && value !== null && (!Number.isInteger(value) || value < 0)
    );
    if (invalidNumber) {
        return res.status(400).json({ error: 'Pages and chapters must be whole numbers' });
    }

    const badRating = typeof rating !== 'number' || !Number.isInteger(rating * 2) || rating < 0 || rating > 5;
    if (rating !== undefined && badRating) {
        return res.status(400).json({ error: 'Rating must be between 0 and 5, in half steps' });
    }

    const newTotal = keepOrSet(totalPages, userBook.totalPages);
    const newPage = keepOrSet(currentPage, userBook.currentPage);
    const newChapter = keepOrSet(currentChapter, userBook.currentChapter);
    const newGenre = keepOrSet(genre, userBook.genre);
    const cleanReview = typeof review === 'string' ? review.trim() || null : review;
    const newReview = keepOrSet(cleanReview, userBook.review);

    if (newTotal && newPage > newTotal) {
        return res.status(400).json({ error: 'Current page cannot be higher than the total' });
    }

    const statusChanged = status !== undefined && status !== userBook.status;
    const startedNow = statusChanged && status === 'reading';
    const finishedNow = statusChanged && status === 'finished';
    const readNow =
        (progress !== undefined && Number(progress) !== userBook.progress) ||
        newPage !== userBook.currentPage ||
        newChapter !== userBook.currentChapter;

    const [updated] = await query(`
        UPDATE user_books
        SET status = COALESCE($1, status),
            progress = COALESCE($2, progress),
            review = $3,
            is_favorite = COALESCE($4, is_favorite),
            genre = $5,
            current_page = $6,
            total_pages = $7,
            current_chapter = $8,
            rating = COALESCE($9, rating),
            started_at = CASE WHEN $10 THEN now() ELSE started_at END,
            finished_at = CASE WHEN $11 THEN now() ELSE finished_at END,
            last_read_at = CASE WHEN $12 THEN now() ELSE last_read_at END
        WHERE id = $13
        RETURNING *
    `, [status, progress, newReview, isFavorite, newGenre, newPage, newTotal, newChapter, rating, startedNow, finishedNow, readNow, id]);

    res.json(updated);
});

app.delete('/api/user-books/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    const [userBook] = await query('SELECT user_id FROM user_books WHERE id = $1', [id]);
    if (!userBook) {
        return res.status(404).json({ error: 'Not found' });
    }
    if (userBook.userId !== req.session.user.id) {
        return res.status(403).json({ error: 'You cannot remove this entry' });
    }

    await query('DELETE FROM user_books WHERE id = $1', [id]);

    res.json({ message: 'Removed from library' });
});

app.get('/api/user-books', requireAuth, async (req, res) => {
    const userBooks = await query(`
        SELECT ub.id, ub.status, ub.review, ub.is_favorite, ub.genre, ub.rating,
               ub.current_page, ub.total_pages, ub.current_chapter,
               ub.started_at, ub.finished_at, ub.last_read_at, ub.created_at,
               CASE WHEN ub.status = 'finished' THEN 100
                    WHEN ub.total_pages > 0
                    THEN LEAST(100, ROUND(COALESCE(ub.current_page, 0) * 100.0 / ub.total_pages))
                    ELSE ub.progress
               END AS progress,
               w.id AS book_id, w.title, w.author, w.description, w.cover_image, w.open_library_key,
               (SELECT COUNT(*) FROM likes WHERE likes.user_book_id = ub.id) AS like_count,
               (SELECT COUNT(*) FROM comments WHERE comments.user_book_id = ub.id) AS comment_count,
               EXISTS (
                   SELECT 1 FROM likes WHERE likes.user_book_id = ub.id AND likes.user_id = $1
               ) AS has_liked
        FROM user_books ub
        JOIN works w ON w.id = ub.work_id
        WHERE ub.user_id = $1
    `, [req.session.user.id]);

    res.json(userBooks);
});

app.post('/api/user-books/:id/comments', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    try {
        const [comment] = await query(
            'INSERT INTO comments (user_id, user_book_id, text) VALUES ($1, $2, $3) RETURNING id',
            [req.session.user.id, id, text.trim()]
        );

        const [newComment] = await query(`
            SELECT comments.id, comments.text, comments.created_at, users.username, users.avatar_url
            FROM comments
            JOIN users ON comments.user_id = users.id
            WHERE comments.id = $1
        `, [comment.id]);

        res.status(201).json(newComment);
    } catch (error) {
        if (error.code === '23503') {
            return res.status(404).json({ error: 'Review not found' });
        }
        throw error;
    }
});

app.get('/api/user-books/:id/comments', async (req, res) => {
    const comments = await query(`
        SELECT comments.id, comments.text, comments.created_at, users.username, users.avatar_url
        FROM comments
        JOIN users ON comments.user_id = users.id
        WHERE comments.user_book_id = $1
        ORDER BY comments.created_at DESC
    `, [req.params.id]);

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

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const problem = passwordProblem(password);
    if (problem) {
        return res.status(400).json({ error: problem });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const [user] = await query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, passwordHash]
        );
        res.status(201).json(user);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Username or email already in use' });
        }
        throw error;
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const [user] = await query(
        `SELECT id, username, email, password_hash, avatar_url, display_name, reading_goal, reader_type
         FROM users WHERE email = $1`,
        [email]
    );

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

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
        readerType: user.readerType,
    });
});

app.get('/api/me', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const [user] = await query(
        `SELECT id, username, email, avatar_url, reading_goal, reader_type,
                COALESCE(display_name, username) AS display_name
         FROM users WHERE id = $1`,
        [req.session.user.id]
    );

    if (!user) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    res.json(user);
});

app.get('/api/profile', requireAuth, async (req, res) => {
    const [user] = await query(`
        SELECT id, username, email, bio, avatar_url, instagram_url, tiktok_url, about_me, favorite_quote,
               favorite_things, location, reading_goal, reader_type,
               COALESCE(display_name, username) AS display_name,
               (SELECT COUNT(*) FROM user_books
                   WHERE user_books.user_id = users.id AND user_books.status = 'finished') AS books_read,
               (SELECT COUNT(*) FROM user_books
                   WHERE user_books.user_id = users.id AND user_books.review IS NOT NULL) AS reviews_count,
               (SELECT COUNT(*) FROM user_books
                   WHERE user_books.user_id = users.id AND user_books.status = 'reading') AS currently_reading
        FROM users
        WHERE users.id = $1
    `, [req.session.user.id]);

    res.json(user);
});

const READER_TYPES = ['first-time', 'casual', 'avid'];

app.patch('/api/profile', requireAuth, upload.single('avatar'), async (req, res) => {
    const { bio, instagramUrl, tiktokUrl, location, readerType } = req.body;
    if (readerType !== undefined && !READER_TYPES.includes(readerType)) {
        return res.status(400).json({ error: 'Please choose one of the reader types' });
    }
    const aboutMe = req.body.aboutMe?.trim().slice(0, 600) || null;
    const favoriteQuote = req.body.favoriteQuote?.trim().slice(0, 200) || null;
    const favoriteThings = req.body.favoriteThings?.trim().slice(0, 300) || null;
    const displayName = req.body.displayName?.trim().slice(0, 40) || null;
    const goal = parseInt(req.body.readingGoal, 10);
    const readingGoal = goal >= 1 && goal <= 365 ? goal : null;
    const avatarUrl = req.file ? await uploadAvatar(req.file) : null;

    const [user] = await query(`
        UPDATE users
        SET bio = COALESCE($1, bio),
            display_name = COALESCE($2, display_name),
            about_me = COALESCE($3, about_me),
            favorite_quote = COALESCE($4, favorite_quote),
            favorite_things = COALESCE($5, favorite_things),
            location = COALESCE($6, location),
            instagram_url = COALESCE($7, instagram_url),
            tiktok_url = COALESCE($8, tiktok_url),
            reading_goal = COALESCE($9, reading_goal),
            reader_type = COALESCE($10, reader_type),
            avatar_url = COALESCE($11, avatar_url)
        WHERE id = $12
        RETURNING id, username, email, bio, avatar_url, instagram_url, tiktok_url, about_me, favorite_quote,
                  favorite_things, location, reading_goal, reader_type,
                  COALESCE(display_name, username) AS display_name
    `, [bio, displayName, aboutMe, favoriteQuote, favoriteThings, location, instagramUrl, tiktokUrl, readingGoal, readerType, avatarUrl, req.session.user.id]);

    res.json(user);
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

app.use((error, req, res, next) => {
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'The photo must be 5 MB or smaller' });
    }
    if (error.status === 400) {
        return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});