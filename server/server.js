const express = require('express');
const { query, pool } = require('./database');
const { descriptionFrom } = require('./openLibrary');
const { uploadAvatar, deleteAvatar, uploadPostImage, deletePostImage, uploadCover, deleteCover } = require('./storage');
const { LANGUAGES, languageOf, msg } = require('./messages');
const { syncMilestones } = require('./milestones');
const { resolveReadingDates } = require('./readingDates');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const app = express();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
    app.set('trust proxy', 1);
}

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            frameSrc: ['https://open.spotify.com'],
            connectSrc: ["'self'", 'https://api.web3forms.com'],
        },
    },
}));
app.use(express.json({ limit: '100kb' }));

if (!isProduction) {
    app.use(cors({
        origin: 'http://localhost:5173',
        credentials: true,
    }));
}

if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is missing in server/.env');
}

app.use(session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24,
    },
}));

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!AVATAR_TYPES.includes(file.mimetype)) {
            const error = new Error(msg(req, 'photoType'));
            error.status = 400;
            return cb(error);
        }
        cb(null, true);
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: msg(req, 'tooManyAttempts') }),
});

const loginLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    limit: 3,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: msg(req, 'tooManyLoginAttempts') }),
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: msg(req, 'tooManyRequests') }),
});
app.use('/api', apiLimiter);

const applyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    skipFailedRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: msg(req, 'betaTooManyApplications') }),
});

const PORT = process.env.PORT || 3000;
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: msg(req, 'loginRequired') });
    }
    next();
}

function requireStaff(...roles) {
    return async (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ error: msg(req, 'loginRequired') });
        }

        const [user] = await query('SELECT staff_role FROM users WHERE id = $1', [req.session.user.id]);

        if (user?.staffRole !== 'admin' && !roles.includes(user?.staffRole)) {
            return res.status(403).json({ error: msg(req, 'staffOnly') });
        }

        req.staffRole = user.staffRole;
        next();
    };
}

async function logAction(req, action, target, detail = null) {
    await query(
        'INSERT INTO staff_actions (actor_id, action, target, detail) VALUES ($1, $2, $3, $4)',
        [req.session.user.id, action, target, detail]
    );
}

async function notify(userId, actorId, type, refs = {}) {
    if (userId === actorId) return;

    await query(`
        INSERT INTO notifications (user_id, actor_id, type, post_id, post_comment_id, user_book_id, comment_id, work_id, list_id, list_comment_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
        userId,
        actorId,
        type,
        refs.postId ?? null,
        refs.postCommentId ?? null,
        refs.userBookId ?? null,
        refs.commentId ?? null,
        refs.workId ?? null,
        refs.listId ?? null,
        refs.listCommentId ?? null,
    ]);
}

async function unnotify(userId, actorId, type, refs = {}) {
    await query(`
        DELETE FROM notifications
        WHERE user_id = $1 AND actor_id = $2 AND type = $3
          AND post_id IS NOT DISTINCT FROM $4
          AND user_book_id IS NOT DISTINCT FROM $5
          AND list_id IS NOT DISTINCT FROM $6
    `, [userId, actorId, type, refs.postId ?? null, refs.userBookId ?? null, refs.listId ?? null]);
}

const TRANSLATED_TITLE = 'COALESCE(t.title, w.title)';
const TRANSLATED_DESCRIPTION = 'COALESCE(t.description, w.description)';
const JOIN_TRANSLATION = 'LEFT JOIN work_translations t ON t.work_id = w.id AND t.language';
const GENRES = [
    'Fantasy', 'Romance', 'Dark Romance', 'Contemporary', 'Classics', 'Mystery', 'Sci-fi', 'Horror', 'Historical', 'Non-fiction', 'Poetry', 'Manga', 'Comics',
];

const STATUSES = ['want-to-read', 'reading', 'paused', 'dnf', 'finished'];

const WORK_GENRES = `
    WITH work_genre AS (
        SELECT DISTINCT ON (work_id) work_id, genre
        FROM user_books
        WHERE genre IS NOT NULL
        GROUP BY work_id, genre
        ORDER BY work_id, COUNT(*) DESC, genre
    )
`;

const BOOK_GENRES = `
    ${WORK_GENRES.trim()},
    book_genre AS (
        SELECT w.id AS work_id, COALESCE(wg.genre, w.genre) AS genre
        FROM works w
        LEFT JOIN work_genre wg ON wg.work_id = w.id
        WHERE COALESCE(wg.genre, w.genre) IS NOT NULL
    )
`;

app.get('/api/books', async (req, res) => {
    const books = await query(`
        SELECT w.id, ${TRANSLATED_TITLE} AS title, w.author, ${TRANSLATED_DESCRIPTION} AS description,
               w.cover_image, w.first_published_year, w.open_library_key, w.created_at
        FROM works w
        ${JOIN_TRANSLATION} = $1
        ORDER BY w.id
    `, [languageOf(req)]);
    res.json(books);
});

app.get('/api/books/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: msg(req, 'bookNotFound') });
    }

    const [book] = await query(`
        ${WORK_GENRES}
        SELECT w.id, ${TRANSLATED_TITLE} AS title, w.author, ${TRANSLATED_DESCRIPTION} AS description,
               w.cover_image, w.first_published_year AS year, COALESCE(wg.genre, w.genre) AS genre,
               (SELECT COUNT(*) FROM user_books ub WHERE ub.work_id = w.id) AS readers,
               (SELECT COUNT(*) FROM user_books ub WHERE ub.work_id = w.id AND ub.status = 'want-to-read') AS want_count,
               (SELECT COUNT(*) FROM user_books ub WHERE ub.work_id = w.id AND ub.rating > 0) AS rating_count,
               (SELECT ROUND(AVG(ub.rating), 1) FROM user_books ub WHERE ub.work_id = w.id AND ub.rating > 0) AS average_rating,
               mine.id AS my_user_book_id, mine.status AS my_status
        FROM works w
        ${JOIN_TRANSLATION} = $2
        LEFT JOIN work_genre wg ON wg.work_id = w.id
        LEFT JOIN user_books mine ON mine.work_id = w.id AND mine.user_id = $3
        WHERE w.id = $1
    `, [id, languageOf(req), req.session.user.id]);

    if (!book) {
        return res.status(404).json({ error: msg(req, 'bookNotFound') });
    }

    const reviews = await query(`
        SELECT ub.id, ub.review, ub.review_is_spoiler, ub.rating, ub.status, ub.created_at,
               u.username, COALESCE(u.display_name, u.username) AS display_name, u.avatar_url,
               (SELECT COUNT(*) FROM likes l WHERE l.user_book_id = ub.id) AS like_count,
               (SELECT COUNT(*) FROM comments c WHERE c.user_book_id = ub.id) AS comment_count,
               EXISTS (SELECT 1 FROM likes l WHERE l.user_book_id = ub.id AND l.user_id = $2) AS has_liked,
               ub.user_id = $2 AS is_mine
        FROM user_books ub
        JOIN users u ON u.id = ub.user_id
        WHERE ub.work_id = $1 AND ub.review IS NOT NULL
        ORDER BY like_count DESC, ub.created_at DESC
        LIMIT 50
    `, [id, req.session.user.id]);

    res.json({ ...book, reviews });
});

const SEARCH_LIMIT = 10;

const plainText = (sql) => `translate(lower(${sql}), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc')`;
const plainSearch = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const escapeLike = (text) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

async function searchCatalog(q, language, limit) {
    const term = escapeLike(plainSearch(q));

    return query(`
        SELECT w.id AS book_id, w.open_library_key, ${TRANSLATED_TITLE} AS title, w.author,
               w.first_published_year AS year, w.cover_image
        FROM works w
        ${JOIN_TRANSLATION} = $3
        WHERE ${plainText('w.title')} LIKE $1
           OR ${plainText('w.author')} LIKE $1
           OR EXISTS (
               SELECT 1 FROM work_translations any_t
               WHERE any_t.work_id = w.id AND ${plainText('any_t.title')} LIKE $1
           )
        ORDER BY ${plainText(TRANSLATED_TITLE)} LIKE $2 DESC, ${TRANSLATED_TITLE}
        LIMIT ${limit}
    `, [`%${term}%`, `${term}%`, language]);
}

async function searchOpenLibrary(q, limit) {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=key,title,author_name,first_publish_year,cover_i`;

    const response = await fetch(url, {
        headers: { 'User-Agent': 'ALibraryOfUs/1.0' },
        signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();

    return data.docs.map((doc) => ({
        bookId: null,
        openLibraryKey: doc.key,
        title: doc.title,
        author: doc.author_name ? doc.author_name[0] : 'Unknown author',
        year: doc.first_publish_year || null,
        coverImage: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : null,
    }));
}

app.get('/api/search-books', async (req, res) => {
    const q = (req.query.q || '').trim();

    if (q === '') {
        return res.status(400).json({ error: msg(req, 'searchTermRequired') });
    }

    const language = languageOf(req);
    const asked = parseInt(req.query.limit, 10);
    const limit = asked >= 1 && asked <= SEARCH_LIMIT ? asked : SEARCH_LIMIT;
    const results = await searchCatalog(q, language, limit);

    if (results.length >= limit || req.query.source === 'catalog') {
        return res.json(results);
    }

    let fromOpenLibrary = [];
    try {
        fromOpenLibrary = await searchOpenLibrary(q, limit);
    } catch (error) {
        console.error('Open Library search failed', error);
        if (results.length === 0) {
            return res.status(500).json({ error: msg(req, 'searchUnavailable') });
        }
        return res.json(results);
    }

    const keys = fromOpenLibrary.map((book) => book.openLibraryKey);
    const known = await query(`
        SELECT w.id AS book_id, w.open_library_key, ${TRANSLATED_TITLE} AS title, w.author,
               w.first_published_year AS year, w.cover_image
        FROM works w
        ${JOIN_TRANSLATION} = $2
        WHERE w.open_library_key = ANY($1)
    `, [keys, language]);
    const knownByKey = new Map(known.map((book) => [book.openLibraryKey, book]));
    const shownKeys = new Set(results.map((book) => book.openLibraryKey));

    for (const book of fromOpenLibrary) {
        if (results.length >= limit) break;
        if (shownKeys.has(book.openLibraryKey)) continue;

        results.push(knownByKey.get(book.openLibraryKey) || book);
        shownKeys.add(book.openLibraryKey);
    }

    res.json(results);
});

const AUTHOR_BOOK_PAGE_SIZE = 24;
const authorIdentity = (name) => plainSearch(name).replace(/[.\s]+/g, '');

app.get('/api/search-authors', requireAuth, async (req, res) => {
    const q = req.query.q ?? '';
    if (typeof q !== 'string' || q.length > 120) {
        return res.status(400).json({ error: msg(req, 'searchInputInvalid') });
    }
    if (q.trim().length < 2) return res.json([]);
    const term = escapeLike(plainSearch(q.trim()));
    const authors = await query(`
        SELECT btrim(w.author) AS name, COUNT(*) AS catalog_count
        FROM works w
        WHERE ${plainText('w.author')} LIKE $1 AND btrim(w.author) <> ''
        GROUP BY btrim(w.author)
        ORDER BY ${plainText('btrim(w.author)')} LIKE $2 DESC, catalog_count DESC, name
        LIMIT $3
    `, [`%${term}%`, `${term}%`, SEARCH_LIMIT]);

    const seen = new Set(authors.map((author) => authorIdentity(author.name)));
    if (authors.length < SEARCH_LIMIT) {
        try {
            const response = await fetch(`https://openlibrary.org/search/authors.json?${new URLSearchParams({ q: q.trim(), limit: SEARCH_LIMIT })}`, {
                headers: { 'User-Agent': 'ALibraryOfUs/1.0' }, signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) throw new Error('Author search unavailable');
            const data = await response.json();
            if (!Array.isArray(data.docs)) throw new Error('Invalid author search response');
            for (const item of data.docs) {
                if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 120) continue;
                const name = item.name.trim();
                const identity = authorIdentity(name);
                if (seen.has(identity)) continue;
                authors.push({ name, catalogCount: 0 });
                seen.add(identity);
                if (authors.length === SEARCH_LIMIT) break;
            }
        } catch {
            if (!authors.length) return res.status(503).json({ error: msg(req, 'searchUnavailable') });
        }
    }
    res.json(authors);
});

app.get('/api/author-books', requireAuth, async (req, res) => {
    const { name, page = '0' } = req.query;
    if (typeof name !== 'string' || !name.trim() || name.length > 120
        || typeof page !== 'string' || !/^\d{1,3}$/.test(page) || Number(page) > 100) {
        return res.status(400).json({ error: msg(req, 'searchInputInvalid') });
    }
    const offset = Number(page) * AUTHOR_BOOK_PAGE_SIZE;
    const items = await query(`
        SELECT w.id AS book_id, w.open_library_key, ${TRANSLATED_TITLE} AS title,
               w.author, w.cover_image, w.first_published_year AS year
        FROM works w
        ${JOIN_TRANSLATION} = $2
        WHERE ${plainText('btrim(w.author)')} = $1
        ORDER BY title, w.id
        LIMIT $3 OFFSET $4
    `, [plainSearch(name.trim()), languageOf(req), AUTHOR_BOOK_PAGE_SIZE, offset]);
    const hasLocalMore = items.length === AUTHOR_BOOK_PAGE_SIZE;
    try {
        const params = new URLSearchParams({ author: name.trim(), limit: AUTHOR_BOOK_PAGE_SIZE, offset, fields: 'key,title,author_name,first_publish_year,cover_i' });
        const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
            headers: { 'User-Agent': 'ALibraryOfUs/1.0' }, signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error('Author books unavailable');
        const data = await response.json();
        if (!Array.isArray(data.docs)) throw new Error('Invalid author books response');
        const remote = data.docs.flatMap((book) => {
            if (typeof book.key !== 'string' || typeof book.title !== 'string') return [];
            const key = book.key.startsWith('/works/') ? book.key : `/works/${book.key}`;
            if (!/^\/works\/OL\d+W$/.test(key)) return [];
            return [{ bookId: null, openLibraryKey: key, title: book.title, author: book.author_name?.[0] || name.trim(), year: book.first_publish_year || null, coverImage: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null }];
        });
        const known = remote.length ? await query(`
            SELECT w.id AS book_id, w.open_library_key, ${TRANSLATED_TITLE} AS title,
                   w.author, w.cover_image, w.first_published_year AS year
            FROM works w ${JOIN_TRANSLATION} = $2
            WHERE w.open_library_key = ANY($1)
        `, [remote.map((book) => book.openLibraryKey), languageOf(req)]) : [];
        const byKey = new Map(known.map((book) => [book.openLibraryKey, book]));
        const seen = new Set(items.map((book) => book.openLibraryKey || `book-${book.bookId}`));
        for (const result of remote) {
            const book = byKey.get(result.openLibraryKey) || result;
            const key = book.openLibraryKey || `book-${book.bookId}`;
            if (!seen.has(key)) { items.push(book); seen.add(key); }
        }
        const total = Number(data.numFound ?? data.num_found ?? offset + data.docs.length);
        res.json({ items, hasMore: hasLocalMore || offset + AUTHOR_BOOK_PAGE_SIZE < total });
    } catch {
        if (!items.length) return res.status(503).json({ error: msg(req, 'searchUnavailable') });
        res.json({ items, hasMore: hasLocalMore, externalUnavailable: true });
    }
});


app.post('/api/user-books', requireAuth, async (req, res) => {
    const { bookId } = req.body;
    const status = req.body.status === 'want-to-read' ? 'want-to-read' : 'reading';
    if (!bookId) {
        return res.status(400).json({ error: msg(req, 'bookIdRequired') });
    }

    try {
        const [entry] = await query(`
            INSERT INTO user_books (user_id, work_id, status, started_at, last_read_at)
            VALUES ($1, $2, $3, CASE WHEN $3 = 'reading' THEN now() END, now())
            RETURNING id, user_id, work_id AS book_id, status
        `, [req.session.user.id, bookId, status]);
        res.status(201).json(entry);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: msg(req, 'alreadyAdded') });
        }
        if (error.code === '23503') {
            return res.status(404).json({ error: msg(req, 'bookNotFound') });
        }
        throw error;
    }
});

app.post('/api/user-books/from-search', requireAuth, async (req, res) => {
    const { openLibraryKey, title, author, coverImage } = req.body;

    if (!openLibraryKey || !title) {
        return res.status(400).json({ error: msg(req, 'searchDataRequired') });
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
            return res.status(400).json({ error: msg(req, 'alreadyAdded') });
        }
        throw error;
    }
});

app.post('/api/user-books/:id/like', requireAuth, async (req, res) => {
    const { id } = req.params;

    const [userBook] = await query('SELECT id, user_id, work_id FROM user_books WHERE id = $1', [id]);
    if (!userBook) {
        return res.status(404).json({ error: msg(req, 'reviewNotFound') });
    }
    if (userBook.userId === req.session.user.id) {
        return res.status(403).json({ error: msg(req, 'ownReviewLike') });
    }

    try {
        await query('INSERT INTO likes (user_id, user_book_id) VALUES ($1, $2)', [req.session.user.id, id]);
        await notify(userBook.userId, req.session.user.id, 'review_like', { userBookId: userBook.id, workId: userBook.workId });
        res.status(201).json({ message: 'Liked' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: msg(req, 'alreadyLiked') });
        }
        throw error;
    }
});

app.delete('/api/user-books/:id/like', requireAuth, async (req, res) => {
    const [like] = await query(`
        DELETE FROM likes l
        USING user_books ub
        WHERE l.user_id = $1 AND l.user_book_id = $2 AND ub.id = l.user_book_id
        RETURNING ub.user_id, ub.id
    `, [req.session.user.id, req.params.id]);

    if (like) {
        await unnotify(like.userId, req.session.user.id, 'review_like', { userBookId: like.id });
    }
    res.json({ message: 'Unliked' });
});

const keepOrSet = (value, current) => (value === undefined ? current : value);

const REVIEW_MAX_LENGTH = 5000;
const PROGRESS_NOTE_MAX_LENGTH = 280;

app.patch('/api/user-books/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status, progress, review, isFavorite, genre, currentPage, totalPages, currentChapter, rating, progressNote, reviewIsSpoiler } = req.body;

    const [userBook] = await query("SELECT *, to_char(finished_on, 'YYYY-MM-DD') AS finished_on FROM user_books WHERE id = $1", [id]);
    if (!userBook) {
        return res.status(404).json({ error: msg(req, 'notFound') });
    }
    if (userBook.userId !== req.session.user.id) {
        return res.status(403).json({ error: msg(req, 'cannotEdit') });
    }

    const pageFields = [currentPage, totalPages, currentChapter];
    const invalidNumber = pageFields.some(
        (value) => value !== undefined && value !== null && (!Number.isInteger(value) || value < 0)
    );
    if (invalidNumber) {
        return res.status(400).json({ error: msg(req, 'wholeNumbers') });
    }

    const badRating = typeof rating !== 'number' || !Number.isInteger(rating * 2) || rating < 0 || rating > 5;
    if (rating !== undefined && badRating) {
        return res.status(400).json({ error: msg(req, 'ratingRange') });
    }
    if (genre !== undefined && genre !== null && !GENRES.includes(genre)) {
        return res.status(400).json({ error: msg(req, 'invalidGenre') });
    }
    if (status !== undefined && !STATUSES.includes(status)) {
        return res.status(400).json({ error: msg(req, 'invalidStatus') });
    }
    if (typeof review === 'string' && review.length > REVIEW_MAX_LENGTH) {
        return res.status(400).json({ error: msg(req, 'reviewTooLong') });
    }
    if (reviewIsSpoiler !== undefined && typeof reviewIsSpoiler !== 'boolean') {
        return res.status(400).json({ error: msg(req, 'reviewSpoilerInvalid') });
    }
    if (progressNote !== undefined && progressNote !== null && typeof progressNote !== 'string') {
        return res.status(400).json({ error: msg(req, 'progressNoteTooLong') });
    }
    if (typeof progressNote === 'string' && progressNote.trim().length > PROGRESS_NOTE_MAX_LENGTH) {
        return res.status(400).json({ error: msg(req, 'progressNoteTooLong') });
    }

    const dates = resolveReadingDates(userBook, req.body);
    if (dates.error) {
        return res.status(400).json({ error: msg(req, dates.error) });
    }

    const newTotal = keepOrSet(totalPages, userBook.totalPages);
    const newPage = keepOrSet(currentPage, userBook.currentPage);
    const newChapter = keepOrSet(currentChapter, userBook.currentChapter);
    const newGenre = keepOrSet(genre, userBook.genre);
    const cleanReview = typeof review === 'string' ? review.trim() || null : review;
    const newReview = keepOrSet(cleanReview, userBook.review);
    const newReviewIsSpoiler = newReview ? keepOrSet(reviewIsSpoiler, userBook.reviewIsSpoiler) : false;
    const noteGiven = progressNote !== undefined;
    const cleanNote = typeof progressNote === 'string' ? progressNote.trim() || null : null;

    if (newTotal && newPage > newTotal) {
        return res.status(400).json({ error: msg(req, 'pageOverTotal') });
    }

    const statusChanged = status !== undefined && status !== userBook.status;
    const startedNow = statusChanged && status === 'reading' && (userBook.status === 'want-to-read' || !userBook.startedAt);
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
            review_is_spoiler = $18,
            review_updated_at = CASE
                WHEN review IS DISTINCT FROM $3 OR review_is_spoiler IS DISTINCT FROM $18
                    THEN CASE WHEN $3 IS NULL THEN NULL ELSE now() END
                ELSE review_updated_at END,
            is_favorite = COALESCE($4, is_favorite),
            genre = $5,
            current_page = $6,
            total_pages = $7,
            current_chapter = $8,
            rating = COALESCE($9, rating),
            read_year = $16,
            finished_on = $17::date,
            started_at = CASE WHEN $10 THEN now() ELSE started_at END,
            finished_at = CASE WHEN $11 THEN now() ELSE finished_at END,
            last_read_at = CASE WHEN $12 THEN now() ELSE last_read_at END,
            progress_note = CASE WHEN $14 THEN $15 ELSE progress_note END,
            progress_note_at = CASE WHEN $14 THEN (CASE WHEN $15::text IS NULL THEN NULL ELSE now() END)
                                    ELSE progress_note_at END
        WHERE id = $13
        RETURNING *, to_char(finished_on, 'YYYY-MM-DD') AS finished_on
    `, [status, progress, newReview, isFavorite, newGenre, newPage, newTotal, newChapter, rating, startedNow, finishedNow, readNow, id, noteGiven, cleanNote, dates.readYear, dates.finishedOn, newReviewIsSpoiler]);

    res.json(updated);
});

app.delete('/api/user-books/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    const [userBook] = await query('SELECT user_id FROM user_books WHERE id = $1', [id]);
    if (!userBook) {
        return res.status(404).json({ error: msg(req, 'notFound') });
    }
    if (userBook.userId !== req.session.user.id) {
        return res.status(403).json({ error: msg(req, 'cannotRemove') });
    }

    await query('DELETE FROM user_books WHERE id = $1', [id]);

    res.json({ message: 'Removed from library' });
});

async function findUserBooks(req, ownerId) {
    return query(`
        SELECT ub.id, ub.status, ub.review, ub.review_is_spoiler, ub.is_favorite, ub.genre, ub.rating,
               ub.current_page, ub.total_pages, ub.current_chapter,
               ub.started_at, ub.finished_at, ub.last_read_at, ub.created_at,
               ub.read_year, to_char(ub.finished_on, 'YYYY-MM-DD') AS finished_on,
               ub.progress_note, ub.progress_note_at,
               CASE WHEN ub.status = 'finished' THEN 100
                    WHEN ub.total_pages > 0
                    THEN LEAST(100, ROUND(COALESCE(ub.current_page, 0) * 100.0 / ub.total_pages))
                    ELSE ub.progress
               END AS progress,
               w.id AS book_id, ${TRANSLATED_TITLE} AS title, w.author,
               ${TRANSLATED_DESCRIPTION} AS description, w.cover_image, w.open_library_key,
               (SELECT COUNT(*) FROM likes WHERE likes.user_book_id = ub.id) AS like_count,
               (SELECT COUNT(*) FROM comments WHERE comments.user_book_id = ub.id) AS comment_count,
               EXISTS (
                    SELECT 1 FROM likes WHERE likes.user_book_id = ub.id AND likes.user_id = $3
               ) AS has_liked
        FROM user_books ub
        JOIN works w ON w.id = ub.work_id
        ${JOIN_TRANSLATION} = $2
        WHERE ub.user_id = $1
            `, [ownerId, languageOf(req), req.session.user.id]);
}

app.get('/api/user-books', requireAuth, async (req, res) => {
    res.json(await findUserBooks(req, req.session.user.id));
});

app.post('/api/user-books/:id/comments', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ error: msg(req, 'commentEmpty') });
    }
    if (text.length > COMMENT_MAX_LENGTH) {
        return res.status(400).json({ error: msg(req, 'commentTooLong') });
    }

    try {
        const [comment] = await query(
            'INSERT INTO comments (user_id, user_book_id, text) VALUES ($1, $2, $3) RETURNING id',
            [req.session.user.id, id, text.trim()]
        );

        const [review] = await query('SELECT id, user_id, work_id FROM user_books WHERE id = $1', [id]);
        await notify(review.userId, req.session.user.id, 'review_comment', {
            userBookId: review.id,
            commentId: comment.id,
            workId: review.workId,
        });

        const [newComment] = await query(`
            SELECT comments.id, comments.text, comments.created_at, users.username, 
                COALESCE(users.display_name, users.username) AS display_name, users.avatar_url
            FROM comments
            JOIN users ON comments.user_id = users.id
            WHERE comments.id = $1
        `, [comment.id]);

        res.status(201).json(newComment);
    } catch (error) {
        if (error.code === '23503') {
            return res.status(404).json({ error: msg(req, 'reviewNotFound') });
        }
        throw error;
    }
});

app.get('/api/user-books/:id/comments', async (req, res) => {
    const comments = await query(`
        SELECT comments.id, comments.text, comments.created_at, users.username, 
            COALESCE(users.display_name, users.username) AS display_name, users.avatar_url
        FROM comments
        JOIN users ON comments.user_id = users.id
        WHERE comments.user_book_id = $1
        ORDER BY comments.created_at DESC
    `, [req.params.id]);

    res.json(comments);
});

const POST_MAX_LENGTH = 2000;
const POST_MAX_BOOKS = 4;

function parseBookIds(value) {
    const list = Array.isArray(value) ? value : String(value ?? '').split(',');
    const ids = list
        .map((item) => Number(item))
        .filter((id) => Number.isInteger(id) && id > 0);
    return [...new Set(ids)];
}

const TAGS_MAX = 10;
const TAG_MAX_LENGTH = 40;

function slugify(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function parseTags(value) {
    const list = Array.isArray(value) ? value : String(value ?? '').split(',');
    const tags = [];
    const seen = new Set();

    for (const item of list) {
        const name = String(item).trim().replace(/^#+/, '').replace(/\s+/g, ' ');
        const slug = slugify(name);
        if (slug === '' || seen.has(slug)) continue;

        seen.add(slug);
        tags.push({ name, slug });
    }

    return tags;
}

async function findOrCreateTags(client, tags) {
    const ids = [];
    for (const tag of tags) {
        const result = await client.query(`
            INSERT INTO tags (name, slug) VALUES ($1, $2)
            ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
            RETURNING id
            `, [tag.name, tag.slug]);
        ids.push(result.rows[0].id);
    }

    return ids;
}

async function findPosts(req, condition, value) {
    return query(`
        SELECT p.id, p.text, p.image_url, p.is_spoiler, p.spotify_url, p.created_at, p.edited_at,
               u.id AS user_id, u.username, COALESCE(u.display_name, u.username) AS display_name, u.avatar_url,
               COALESCE(u.pinned_post_id = p.id, false) AS is_pinned,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
               (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comment_count,
               EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2) AS has_liked,
               EXISTS (SELECT 1 FROM saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = $2) AS has_saved,
               COALESCE((
                   SELECT json_agg(json_build_object(
                              'id', w.id,
                              'title', ${TRANSLATED_TITLE},
                              'author', w.author,
                              'coverImage', w.cover_image
                          ) ORDER BY pb.position)
                   FROM post_books pb
                   JOIN works w ON w.id = pb.work_id
                   ${JOIN_TRANSLATION} = $3
                   WHERE pb.post_id = p.id
        ), '[]') AS books,
                   COALESCE((
                   SELECT json_agg(json_build_object('name', tg.name, 'slug', tg.slug) ORDER BY pt.position)
                   FROM post_tags pt
                   JOIN tags tg ON tg.id = pt.tag_id
                   WHERE pt.post_id = p.id
               ), '[]') AS tags
        FROM posts p
        JOIN users u ON u.id = p.user_id
        WHERE ${condition}
        ORDER BY p.created_at DESC
    `, [value, req.session.user.id, languageOf(req)]);
}

const SPOTIFY_LINK = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]{22})(?:[/?#].*)?$/;

function cleanSpotifyUrl(value) {
    const link = String(value ?? '').trim();
    if (link === '') return null;

    const match = link.match(SPOTIFY_LINK);
    if (!match) return undefined;
    return `https://open.spotify.com/${match[1]}/${match[2]}`;
}

function postProblem(text, bookIds, tags) {
    if (text && text.length > POST_MAX_LENGTH) return 'postTooLong';
    if (bookIds.length > POST_MAX_BOOKS) return 'tooManyBooks';
    if (tags.length > TAGS_MAX) return 'tooManyTags';
    if (tags.some((tag) => tag.name.length > TAG_MAX_LENGTH)) return 'tagTooLong';
    return null;
}

async function savePostLinks(client, postId, bookIds, tags) {
    for (let i = 0; i < bookIds.length; i++) {
        await client.query(
            'INSERT INTO post_books (post_id, work_id, position) VALUES ($1, $2, $3)',
            [postId, bookIds[i], i]
        );
    }

    const tagIds = await findOrCreateTags(client, tags);
    for (let i = 0; i < tagIds.length; i++) {
        await client.query(
            'INSERT INTO post_tags (post_id, tag_id, position) VALUES ($1, $2, $3)',
            [postId, tagIds[i], i]
        );
    }
}

app.post('/api/posts', requireAuth, upload.single('image'), async (req, res) => {
    const text = req.body.text?.trim() || null;
    const bookIds = parseBookIds(req.body.bookIds);
    const tags = parseTags(req.body.tags);
    const isSpoiler = req.body.isSpoiler === 'true';

    const spotifyUrl = cleanSpotifyUrl(req.body.spotifyUrl);

    if (spotifyUrl === undefined) {
        return res.status(400).json({ error: msg(req, 'spotifyInvalid') });
    }
    if (!text && bookIds.length === 0 && !req.file && !spotifyUrl) {
        return res.status(400).json({ error: msg(req, 'postEmpty') });
    }
    const problem = postProblem(text, bookIds, tags);
    if (problem) {
        return res.status(400).json({ error: msg(req, problem) });
    }

    const imageUrl = req.file ? await uploadPostImage(req.file) : null;

    const client = await pool.connect();
    let postId;

    try {
        await client.query('BEGIN');

        const result = await client.query(
            'INSERT INTO posts (user_id, text, image_url, is_spoiler, spotify_url) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [req.session.user.id, text, imageUrl, isSpoiler, spotifyUrl]
        );
        postId = result.rows[0].id;
        await savePostLinks(client, postId, bookIds, tags);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        if (imageUrl) {
            await deletePostImage(imageUrl);
        }
        if (error.code === '23503') {
            return res.status(404).json({ error: msg(req, 'bookNotFound') });
        }
        throw error;
    } finally {
        client.release();
    }

    const [post] = await findPosts(req, 'p.id = $1', postId);
    res.status(201).json(post);
});

app.get('/api/posts/:id', requireAuth, async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }

    const [fullPost] = await findPosts(req, 'p.id = $1', post.id);
    res.json(fullPost);
});

app.get('/api/posts', requireAuth, async (req, res) => {
    const posts = await findPosts(req, 'p.user_id = $1', req.session.user.id);
    res.json(posts);
});

const FEED_TABS = ['for-you', 'following', 'recent'];
const FEED_PAGE_SIZE = 20;

const ACTIVITY_DATE = `CASE WHEN ub.status = 'finished' THEN COALESCE(ub.finished_at, ub.created_at)
                            ELSE COALESCE(ub.last_read_at, ub.started_at, ub.created_at) END`;

const FEED_ORDER = {
    'for-you': `(CASE WHEN i.from_followed THEN 3 ELSE 0 END
                + CASE WHEN i.followed_tag THEN 2 ELSE 0 END
                + LEAST(i.buzz, 10) * 0.3
                - EXTRACT(EPOCH FROM now() - i.happened_at) / 3600 * 0.25) DESC, i.happened_at DESC`,
    following: 'i.happened_at DESC',
    recent: 'i.happened_at DESC',
};

async function findActivity(req, ids) {
    return query(`
        SELECT ub.id, ub.user_id, ub.status, ub.rating, ub.review, ub.review_is_spoiler, ub.current_page, ub.total_pages, ub.progress_note,
               CASE WHEN ub.status = 'finished' THEN 'finished'
                    WHEN COALESCE(ub.current_page, 0) > 0 OR ub.progress > 0 THEN 'progress'
                    ELSE 'started'
               END AS kind,
               CASE WHEN ub.total_pages > 0
                    THEN LEAST(100, ROUND(COALESCE(ub.current_page, 0) * 100.0 / ub.total_pages))
                    ELSE ub.progress
               END AS progress,
               ${ACTIVITY_DATE} AS happened_at,
               w.id AS book_id, ${TRANSLATED_TITLE} AS title, w.author, w.cover_image,
               u.username, COALESCE(u.display_name, u.username) AS display_name, u.avatar_url,
               (SELECT COUNT(*) FROM likes l WHERE l.user_book_id = ub.id) AS like_count,
               (SELECT COUNT(*) FROM comments c WHERE c.user_book_id = ub.id) AS comment_count,
               EXISTS (SELECT 1 FROM likes l WHERE l.user_book_id = ub.id AND l.user_id = $3) AS has_liked
        FROM user_books ub
        JOIN works w ON w.id = ub.work_id
        ${JOIN_TRANSLATION} = $2
        JOIN users u ON u.id = ub.user_id
        WHERE ub.id = ANY($1)
    `, [ids, languageOf(req), req.session.user.id]);
}

app.get('/api/feed', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const tab = FEED_TABS.includes(req.query.tab) ? req.query.tab : 'for-you';
    const page = Math.max(0, parseInt(req.query.page, 10) || 0);
    const onlyFollowed = tab === 'following' ? 'WHERE i.from_followed' : '';

    const items = await query(`
        WITH items AS (
            SELECT 'post' AS type, p.id, p.user_id, p.created_at AS happened_at,
                   (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id)
                     + (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS buzz,
                   EXISTS (
                       SELECT 1 FROM post_tags pt
                       JOIN tag_follows tf ON tf.tag_id = pt.tag_id
                       WHERE pt.post_id = p.id AND tf.user_id = $1
                   ) AS followed_tag
            FROM posts p
            UNION ALL
            SELECT 'activity', ub.id, ub.user_id, ${ACTIVITY_DATE},
                   (SELECT COUNT(*) FROM likes l WHERE l.user_book_id = ub.id)
                     + (SELECT COUNT(*) FROM comments c WHERE c.user_book_id = ub.id),
                   false
            FROM user_books ub
            WHERE ub.status IN ('reading', 'finished')
        ),
        marked AS (
            SELECT items.*,
                   (items.user_id = $1 OR EXISTS (
                       SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = items.user_id
                   )) AS from_followed
            FROM items
        )
        SELECT i.type, i.id
        FROM marked i
        ${onlyFollowed}
        ORDER BY ${FEED_ORDER[tab]}, i.id DESC
        LIMIT $2 OFFSET $3
    `, [userId, FEED_PAGE_SIZE, page * FEED_PAGE_SIZE]);

    const postIds = items.filter((item) => item.type === 'post').map((item) => item.id);
    const activityIds = items.filter((item) => item.type === 'activity').map((item) => item.id);
    const [posts, activity] = await Promise.all([
        postIds.length > 0 ? findPosts(req, 'p.id = ANY($1)', postIds) : [],
        activityIds.length > 0 ? findActivity(req, activityIds) : [],
    ]);

    const found = new Map();
    posts.forEach((post) => found.set(`post-${post.id}`, { type: 'post', ...post }));
    activity.forEach((entry) => found.set(`activity-${entry.id}`, { type: 'activity', ...entry }));

    res.json({
        items: items.map((item) => found.get(`${item.type}-${item.id}`)).filter(Boolean),
        hasMore: items.length === FEED_PAGE_SIZE,
    });
});

const REVIEW_PAGE_SIZE = 24;

app.get('/api/reviews', requireAuth, async (req, res) => {
    const { scope = 'all', order = 'recent', page = '0', q = '' } = req.query;
    if (!['all', 'following'].includes(scope) || !['recent', 'popular'].includes(order)
        || typeof page !== 'string' || !/^\d{1,4}$/.test(page) || Number(page) > 500
        || typeof q !== 'string' || q.length > 120) {
        return res.status(400).json({ error: msg(req, 'reviewFiltersInvalid') });
    }

    const followed = scope === 'following'
        ? 'AND EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = ub.user_id)'
        : '';
    const ordering = order === 'popular' ? 'like_count DESC, ub.review_updated_at DESC NULLS LAST, ub.id DESC' : 'ub.review_updated_at DESC NULLS LAST, ub.id DESC';
    const term = `%${escapeLike(plainSearch(q.trim()))}%`;
    const items = await query(`
        SELECT ub.id, ub.review, ub.review_is_spoiler, ub.rating,
               COALESCE(ub.review_updated_at, ub.created_at) AS review_updated_at,
               w.id AS book_id, ${TRANSLATED_TITLE} AS title, w.author, w.cover_image,
               u.username, COALESCE(u.display_name, u.username) AS display_name, u.avatar_url,
               ub.user_id = $1 AS is_mine,
               (SELECT COUNT(*) FROM likes l WHERE l.user_book_id = ub.id) AS like_count,
               (SELECT COUNT(*) FROM comments c WHERE c.user_book_id = ub.id) AS comment_count,
               EXISTS (SELECT 1 FROM likes l WHERE l.user_book_id = ub.id AND l.user_id = $1) AS has_liked
        FROM user_books ub
        JOIN users u ON u.id = ub.user_id
        JOIN works w ON w.id = ub.work_id
        ${JOIN_TRANSLATION} = $2
        WHERE ub.review IS NOT NULL AND btrim(ub.review) <> ''
          AND ${plainText("concat_ws(' ', w.title, t.title, w.author, u.username, u.display_name)")} LIKE $3
          ${followed}
        ORDER BY ${ordering}
        LIMIT $4 OFFSET $5
    `, [req.session.user.id, languageOf(req), term, REVIEW_PAGE_SIZE + 1, Number(page) * REVIEW_PAGE_SIZE]);

    res.json({ items: items.slice(0, REVIEW_PAGE_SIZE), hasMore: items.length > REVIEW_PAGE_SIZE });
});


app.get('/api/tags', requireAuth, async (req, res) => {
    const slug = slugify(String(req.query.q ?? ''));
    if (slug === '') {
        return res.json([]);
    }

    const tags = await query(`
        SELECT tg.name, tg.slug,
               (SELECT COUNT(*) FROM post_tags pt WHERE pt.tag_id = tg.id)
             + (SELECT COUNT(*) FROM user_book_tags ut WHERE ut.tag_id = tg.id) AS uses
        FROM tags tg
        WHERE tg.slug LIKE $1 OR tg.slug LIKE $2
        ORDER BY uses DESC, tg.name
        LIMIT 8
    `, [slug + '%', '%-' + slug + '%']);

    res.json(tags);
});

app.get('/api/tags/popular', requireAuth, async (req, res) => {
    const tags = await query(`
        SELECT tg.name, tg.slug, COUNT(pt.post_id) AS post_count
        FROM tags tg
        JOIN post_tags pt ON pt.tag_id = tg.id
        GROUP BY tg.id
        ORDER BY post_count DESC, tg.name
        LIMIT 30
    `);
    res.json(tags);
});

app.get('/api/tags/followed', requireAuth, async (req, res) => {
    const tags = await query(`
        SELECT tg.name, tg.slug, COUNT(pt.post_id) AS post_count
        FROM tag_follows tf
        JOIN tags tg ON tg.id = tf.tag_id
        LEFT JOIN post_tags pt ON pt.tag_id = tg.id
        WHERE tf.user_id = $1
        GROUP BY tg.id, tf.created_at
        ORDER BY tf.created_at DESC, tg.name
    `, [req.session.user.id]);
    res.json(tags);
});

app.get('/api/genres', requireAuth, async (req, res) => {
    const counts = await query(`
        ${BOOK_GENRES}
        SELECT genre, COUNT(*) AS book_count
        FROM book_genre
        GROUP BY genre
    `);

    const genres = GENRES.map((name) => {
        const found = counts.find((row) => row.genre === name);
        return { name, slug: slugify(name), bookCount: found ? found.bookCount : 0 };
    });
    res.json(genres);
});

app.get('/api/genres/:slug', requireAuth, async (req, res) => {
    const genre = GENRES.find((name) => slugify(name) === slugify(req.params.slug));
    if (!genre) {
        return res.status(404).json({ error: msg(req, 'genreNotFound') });
    }

    const books = await query(`
        ${BOOK_GENRES}
        SELECT w.id, ${TRANSLATED_TITLE} AS title, w.author, w.cover_image,
               COUNT(ub.id) AS readers,
               ROUND(AVG(ub.rating) FILTER (WHERE ub.rating > 0), 1) AS average_rating
        FROM book_genre bg
        JOIN works w ON w.id = bg.work_id
        LEFT JOIN user_books ub ON ub.work_id = w.id
        ${JOIN_TRANSLATION} = $2
        WHERE bg.genre = $1
        GROUP BY w.id, t.title
        ORDER BY readers DESC, title
        LIMIT 60
    `, [genre, languageOf(req)]);

    res.json({ genre, slug: slugify(genre), books });
});

app.get('/api/tagged/:slug', requireAuth, async (req, res) => {
    const [tag] = await query('SELECT id, name, slug FROM tags WHERE slug = $1', [slugify(req.params.slug)]);
    if (!tag) {
        return res.status(404).json({ error: msg(req, 'tagNotFound') });
    }

    const posts = await findPosts(
        req,
        'EXISTS (SELECT 1 FROM post_tags x WHERE x.post_id = p.id AND x.tag_id = $1)',
        tag.id
    );

    const relatedTags = await query(`
        SELECT tg.name, tg.slug, COUNT(*) AS together
        FROM post_tags a
        JOIN post_tags b ON b.post_id = a.post_id AND b.tag_id <> a.tag_id
        JOIN tags tg ON tg.id = b.tag_id
        WHERE a.tag_id = $1
        GROUP BY tg.id
        ORDER BY together DESC, tg.name
        LIMIT 8
    `, [tag.id]);

    const books = await query(`
        SELECT w.id, ${TRANSLATED_TITLE} AS title, w.author, w.cover_image, COUNT(*) AS mentions
        FROM post_tags pt
        JOIN post_books pb ON pb.post_id = pt.post_id
        JOIN works w ON w.id = pb.work_id
        ${JOIN_TRANSLATION} = $2
        WHERE pt.tag_id = $1
        GROUP BY w.id, t.title
        ORDER BY mentions DESC, title
        LIMIT 5
    `, [tag.id, languageOf(req)]);

    const follow = await followState(req, tag.id);
    res.json({ tag: { id: tag.id, name: tag.name, slug: tag.slug, ...follow }, posts, relatedTags, books });
});

async function followState(req, tagId) {
    const [state] = await query(`
        SELECT (SELECT COUNT(*) FROM tag_follows WHERE tag_id = $1) AS follower_count,
               EXISTS (SELECT 1 FROM tag_follows WHERE tag_id = $1 AND user_id = $2) AS is_following
    `, [tagId, req.session.user.id]);
    return state;
}

async function tagFromUrl(req) {
    const [tag] = await query('SELECT id FROM tags WHERE slug = $1', [slugify(req.params.slug)]);
    return tag;
}

app.post('/api/tags/:slug/follow', requireAuth, async (req, res) => {
    const tag = await tagFromUrl(req);
    if (!tag) {
        return res.status(404).json({ error: msg(req, 'tagNotFound') });
    }

    await query(
        'INSERT INTO tag_follows (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.session.user.id, tag.id]
    );
    res.json(await followState(req, tag.id));
});

app.delete('/api/tags/:slug/follow', requireAuth, async (req, res) => {
    const tag = await tagFromUrl(req);
    if (!tag) {
        return res.status(404).json({ error: msg(req, 'tagNotFound') });
    }

    await query(
        'DELETE FROM tag_follows WHERE user_id = $1 AND tag_id = $2',
        [req.session.user.id, tag.id]
    );
    res.json(await followState(req, tag.id));
});

async function postFromUrl(req) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return undefined;

    const [post] = await query('SELECT id, user_id, image_url FROM posts WHERE id = $1', [id]);
    return post;
}

async function likeState(req, postId) {
    const [state] = await query(`
        SELECT (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) AS like_count,
               EXISTS (SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2) AS has_liked
    `, [postId, req.session.user.id]);
    return state;
}

app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }

    const [liked] = await query(
        'INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING post_id',
        [req.session.user.id, post.id]
    );

    if (liked) {
        await notify(post.userId, req.session.user.id, 'post_like', { postId: post.id });
    }
    res.json(await likeState(req, post.id));
});

app.delete('/api/posts/:id/like', requireAuth, async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }

    await query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [req.session.user.id, post.id]);
    await unnotify(post.userId, req.session.user.id, 'post_like', { postId: post.id });
    res.json(await likeState(req, post.id));
});

app.post('/api/posts/:id/save', requireAuth, async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }

    await query(
        'INSERT INTO saved_posts (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.session.user.id, post.id]
    );
    res.json({ hasSaved: true });
});

app.delete('/api/posts/:id/save', requireAuth, async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }

    await query('DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2', [req.session.user.id, post.id]);
    res.json({ hasSaved: false });
});

app.delete('/api/posts/:id', requireAuth, async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }
    if (post.userId !== req.session.user.id) {
        return res.status(403).json({ error: msg(req, 'cannotDeletePost') });
    }

    await query('DELETE FROM posts WHERE id = $1', [post.id]);

    if (post.imageUrl) {
        await deletePostImage(post.imageUrl);
    }
    res.json({ message: 'Post deleted' });
});

app.patch('/api/posts/:id', requireAuth, upload.single('image'), async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }
    if (post.userId !== req.session.user.id) {
        return res.status(403).json({ error: msg(req, 'cannotEditPost') });
    }

    const text = req.body.text?.trim() || null;
    const bookIds = parseBookIds(req.body.bookIds);
    const tags = parseTags(req.body.tags);
    const isSpoiler = req.body.isSpoiler === 'true';
    const keepsImage = Boolean(post.imageUrl) && req.body.removeImage !== 'true';

    const spotifyUrl = cleanSpotifyUrl(req.body.spotifyUrl);

    if (spotifyUrl === undefined) {
        return res.status(400).json({ error: msg(req, 'spotifyInvalid') });
    }
    if (!text && bookIds.length === 0 && !req.file && !keepsImage && !spotifyUrl) {
        return res.status(400).json({ error: msg(req, 'postEmpty') });
    }
    const problem = postProblem(text, bookIds, tags);
    if (problem) {
        return res.status(400).json({ error: msg(req, problem) });
    }

    const newImageUrl = req.file ? await uploadPostImage(req.file) : null;
    const imageUrl = newImageUrl || (keepsImage ? post.imageUrl : null);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE posts SET text = $1, image_url = $2, is_spoiler = $3, spotify_url = $4, edited_at = now() WHERE id = $5',
            [text, imageUrl, isSpoiler, spotifyUrl, post.id]
        );
        await client.query('DELETE FROM post_books WHERE post_id = $1', [post.id]);
        await client.query('DELETE FROM post_tags WHERE post_id = $1', [post.id]);
        await savePostLinks(client, post.id, bookIds, tags);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        if (newImageUrl) {
            await deletePostImage(newImageUrl);
        }
        if (error.code === '23503') {
            return res.status(404).json({ error: msg(req, 'bookNotFound') });
        }
        throw error;
    } finally {
        client.release();
    }

    if (post.imageUrl && post.imageUrl !== imageUrl) {
        await deletePostImage(post.imageUrl);
    }

    const [updated] = await findPosts(req, 'p.id = $1', post.id);
    res.json(updated);
});

app.post('/api/posts/:id/pin', requireAuth, async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }
    if (post.userId !== req.session.user.id) {
        return res.status(403).json({ error: msg(req, 'cannotPinPost') });
    }

    await query('UPDATE users SET pinned_post_id = $1 WHERE id = $2', [post.id, req.session.user.id]);
    res.json({ isPinned: true });
});

app.delete('/api/posts/:id/pin', requireAuth, async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }

    await query(
        'UPDATE users SET pinned_post_id = NULL WHERE id = $1 AND pinned_post_id = $2',
        [req.session.user.id, post.id]
    );
    res.json({ isPinned: false });
});

const COMMENT_MAX_LENGTH = 1000;

const POST_COMMENT_FIELDS = `
    c.id, c.text, c.created_at,
    u.id AS user_id, u.username, COALESCE(u.display_name, u.username) AS display_name, u.avatar_url
`;

app.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
    const text = req.body.text?.trim() || '';

    if (text === '') {
        return res.status(400).json({ error: msg(req, 'commentEmpty') });
    }
    if (text.length > COMMENT_MAX_LENGTH) {
        return res.status(400).json({ error: msg(req, 'commentTooLong') });
    }

    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }

    const [created] = await query(
        'INSERT INTO post_comments (user_id, post_id, text) VALUES ($1, $2, $3) RETURNING id',
        [req.session.user.id, post.id, text]
    );

    await notify(post.userId, req.session.user.id, 'post_comment', { postId: post.id, postCommentId: created.id });

    const [comment] = await query(`
        SELECT ${POST_COMMENT_FIELDS}
        FROM post_comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.id = $1
    `, [created.id]);

    res.status(201).json(comment);
});

app.get('/api/posts/:id/comments', requireAuth, async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }

    const comments = await query(`
        SELECT ${POST_COMMENT_FIELDS}
        FROM post_comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.post_id = $1
        ORDER BY c.created_at
    `, [post.id]);

    res.json(comments);
});

app.delete('/api/post-comments/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: msg(req, 'commentNotFound') });
    }

    const [comment] = await query(`
        SELECT c.id, c.user_id, p.user_id AS post_author_id
        FROM post_comments c
        JOIN posts p ON p.id = c.post_id
        WHERE c.id = $1
    `, [id]);

    if (!comment) {
        return res.status(404).json({ error: msg(req, 'commentNotFound') });
    }

    const me = req.session.user.id;
    if (comment.userId !== me && comment.postAuthorId !== me) {
        return res.status(403).json({ error: msg(req, 'cannotDeleteComment') });
    }

    await query('DELETE FROM post_comments WHERE id = $1', [comment.id]);
    res.json({ message: 'Comment deleted' });
});

const LIST_TITLE_MAX = 80;
const LIST_DESCRIPTION_MAX = 500;
const LIST_NOTE_MAX = 280;
const LIST_MAX_BOOKS = 100;
const MAX_ID = 2147483647;

function parseListBooks(value) {
    const list = Array.isArray(value) ? value : [];
    const books = [];
    const seen = new Set();

    for (const item of list) {
        const id = Number(item?.id);
        if (!Number.isInteger(id) || id <= 0 || id > MAX_ID || seen.has(id)) continue;

        seen.add(id);
        books.push({ id, note: String(item.note ?? '').trim() || null });
    }

    return books;
}

function readListForm(req) {
    return {
        title: String(req.body.title ?? '').trim(),
        description: String(req.body.description ?? '').trim() || null,
        isPublic: req.body.isPublic !== false,
        books: parseListBooks(req.body.books),
        tags: parseTags(Array.isArray(req.body.tags) ? req.body.tags : []),
    };
}

function listProblem(list) {
    if (list.title === '') return 'listTitleRequired';
    if (list.title.length > LIST_TITLE_MAX) return 'listTitleTooLong';
    if (list.description && list.description.length > LIST_DESCRIPTION_MAX) return 'listDescriptionTooLong';
    if (list.books.length > LIST_MAX_BOOKS) return 'listTooManyBooks';
    if (list.books.some((book) => book.note && book.note.length > LIST_NOTE_MAX)) return 'listNoteTooLong';
    if (list.tags.length > TAGS_MAX) return 'tooManyTags';
    if (list.tags.some((tag) => tag.name.length > TAG_MAX_LENGTH)) return 'tagTooLong';
    return null;
}

async function saveListLinks(client, listId, list) {
    for (let i = 0; i < list.books.length; i++) {
        await client.query(
            'INSERT INTO list_books (list_id, work_id, position, note) VALUES ($1, $2, $3, $4)',
            [listId, list.books[i].id, i, list.books[i].note]
        );
    }

    const tagIds = await findOrCreateTags(client, list.tags);
    for (let i = 0; i < tagIds.length; i++) {
        await client.query(
            'INSERT INTO list_tags (list_id, tag_id, position) VALUES ($1, $2, $3)',
            [listId, tagIds[i], i]
        );
    }
}

async function findLists(req, condition, value) {
    return query(`
        SELECT l.id, l.title, l.description, l.is_public, l.created_at, l.updated_at,
               u.id AS user_id, u.username, COALESCE(u.display_name, u.username) AS display_name, u.avatar_url,
               (SELECT COUNT(*) FROM list_books lb WHERE lb.list_id = l.id) AS book_count,
               (SELECT COUNT(*) FROM list_likes ll WHERE ll.list_id = l.id) AS like_count,
               (SELECT COUNT(*) FROM list_comments lc WHERE lc.list_id = l.id) AS comment_count,
               EXISTS (SELECT 1 FROM list_likes ll WHERE ll.list_id = l.id AND ll.user_id = $2) AS has_liked,
               EXISTS (SELECT 1 FROM saved_lists sl WHERE sl.list_id = l.id AND sl.user_id = $2) AS has_saved,
               COALESCE((
                   SELECT json_agg(json_build_object(
                              'id', first.id,
                              'title', first.title,
                              'author', first.author,
                              'coverImage', first.cover_image
                          ) ORDER BY first.position)
                   FROM (
                       SELECT w.id, ${TRANSLATED_TITLE} AS title, w.author, w.cover_image, lb.position
                       FROM list_books lb
                       JOIN works w ON w.id = lb.work_id
                       ${JOIN_TRANSLATION} = $3
                       WHERE lb.list_id = l.id
                       ORDER BY lb.position
                       LIMIT 4
                   ) first
               ), '[]') AS preview,
               COALESCE((
                   SELECT json_agg(json_build_object('name', tg.name, 'slug', tg.slug) ORDER BY lt.position)
                   FROM list_tags lt
                   JOIN tags tg ON tg.id = lt.tag_id
                   WHERE lt.list_id = l.id
               ), '[]') AS tags
        FROM lists l
        JOIN users u ON u.id = l.user_id
        WHERE ${condition} AND (l.is_public OR l.user_id = $2)
        ORDER BY l.updated_at DESC
    `, [value, req.session.user.id, languageOf(req)]);
}

async function findListBooks(req, listId) {
    return query(`
        SELECT w.id, ${TRANSLATED_TITLE} AS title, w.author, w.cover_image, lb.note, lb.position,
               (SELECT ROUND(AVG(ub.rating), 1) FROM user_books ub WHERE ub.work_id = w.id AND ub.rating > 0) AS average_rating,
               (SELECT COUNT(*) FROM user_books ub WHERE ub.work_id = w.id AND ub.rating > 0) AS rating_count,
               CASE WHEN owner_ub.status = 'finished' AND owner_ub.started_at IS NOT NULL AND owner_ub.finished_at >= owner_ub.started_at
                    THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM owner_ub.finished_at - owner_ub.started_at) / 86400))::int
               END AS days_to_finish
        FROM list_books lb
        JOIN lists l ON l.id = lb.list_id
        JOIN works w ON w.id = lb.work_id
        ${JOIN_TRANSLATION} = $2
        LEFT JOIN user_books owner_ub ON owner_ub.user_id = l.user_id AND owner_ub.work_id = w.id
        WHERE lb.list_id = $1
        ORDER BY lb.position
    `, [listId, languageOf(req)]);
}

async function listFromUrl(req) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0 || id > MAX_ID) return undefined;

    const [list] = await query('SELECT id, user_id, is_public FROM lists WHERE id = $1', [id]);
    if (!list) return undefined;
    if (!list.isPublic && list.userId !== req.session.user.id) return undefined;
    return list;
}

app.post('/api/lists', requireAuth, async (req, res) => {
    const list = readListForm(req);
    const problem = listProblem(list);
    if (problem) {
        return res.status(400).json({ error: msg(req, problem) });
    }

    const client = await pool.connect();
    let listId;

    try {
        await client.query('BEGIN');

        const result = await client.query(
            'INSERT INTO lists (user_id, title, description, is_public) VALUES ($1, $2, $3, $4) RETURNING id',
            [req.session.user.id, list.title, list.description, list.isPublic]
        );
        listId = result.rows[0].id;
        await saveListLinks(client, listId, list);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23503') {
            return res.status(404).json({ error: msg(req, 'bookNotFound') });
        }
        throw error;
    } finally {
        client.release();
    }

    const [created] = await findLists(req, 'l.id = $1', listId);
    res.status(201).json(created);
});

app.get('/api/lists/:id', requireAuth, async (req, res) => {
    const list = await listFromUrl(req);
    if (!list) {
        return res.status(404).json({ error: msg(req, 'listNotFound') });
    }

    const [fullList] = await findLists(req, 'l.id = $1', list.id);
    const books = await findListBooks(req, list.id);
    res.json({ ...fullList, books });
});

app.patch('/api/lists/:id', requireAuth, async (req, res) => {
    const current = await listFromUrl(req);
    if (!current) {
        return res.status(404).json({ error: msg(req, 'listNotFound') });
    }
    if (current.userId !== req.session.user.id) {
        return res.status(403).json({ error: msg(req, 'cannotEditList') });
    }

    const list = readListForm(req);
    const problem = listProblem(list);
    if (problem) {
        return res.status(400).json({ error: msg(req, problem) });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE lists SET title = $1, description = $2, is_public = $3, updated_at = now() WHERE id = $4',
            [list.title, list.description, list.isPublic, current.id]
        );
        await client.query('DELETE FROM list_books WHERE list_id = $1', [current.id]);
        await client.query('DELETE FROM list_tags WHERE list_id = $1', [current.id]);
        await saveListLinks(client, current.id, list);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23503') {
            return res.status(404).json({ error: msg(req, 'bookNotFound') });
        }
        throw error;
    } finally {
        client.release();
    }

    const [updated] = await findLists(req, 'l.id = $1', current.id);
    const books = await findListBooks(req, current.id);
    res.json({ ...updated, books });
});

app.delete('/api/lists/:id', requireAuth, async (req, res) => {
    const list = await listFromUrl(req);
    if (!list) {
        return res.status(404).json({ error: msg(req, 'listNotFound') });
    }
    if (list.userId !== req.session.user.id) {
        return res.status(403).json({ error: msg(req, 'cannotDeleteList') });
    }

    await query('DELETE FROM lists WHERE id = $1', [list.id]);
    res.json({ message: 'List deleted' });
});

async function listLikeState(req, listId) {
    const [state] = await query(`
        SELECT (SELECT COUNT(*) FROM list_likes WHERE list_id = $1) AS like_count,
               EXISTS (SELECT 1 FROM list_likes WHERE list_id = $1 AND user_id = $2) AS has_liked
    `, [listId, req.session.user.id]);
    return state;
}

app.post('/api/lists/:id/like', requireAuth, async (req, res) => {
    const list = await listFromUrl(req);
    if (!list) {
        return res.status(404).json({ error: msg(req, 'listNotFound') });
    }

    const [liked] = await query(
        'INSERT INTO list_likes (user_id, list_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING list_id',
        [req.session.user.id, list.id]
    );

    if (liked) {
        await notify(list.userId, req.session.user.id, 'list_like', { listId: list.id });
    }
    res.json(await listLikeState(req, list.id));
});

app.delete('/api/lists/:id/like', requireAuth, async (req, res) => {
    const list = await listFromUrl(req);
    if (!list) {
        return res.status(404).json({ error: msg(req, 'listNotFound') });
    }

    await query('DELETE FROM list_likes WHERE user_id = $1 AND list_id = $2', [req.session.user.id, list.id]);
    await unnotify(list.userId, req.session.user.id, 'list_like', { listId: list.id });
    res.json(await listLikeState(req, list.id));
});

app.post('/api/lists/:id/save', requireAuth, async (req, res) => {
    const list = await listFromUrl(req);
    if (!list) {
        return res.status(404).json({ error: msg(req, 'listNotFound') });
    }

    await query(
        'INSERT INTO saved_lists (user_id, list_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.session.user.id, list.id]
    );
    res.json({ hasSaved: true });
});

app.delete('/api/lists/:id/save', requireAuth, async (req, res) => {
    const list = await listFromUrl(req);
    if (!list) {
        return res.status(404).json({ error: msg(req, 'listNotFound') });
    }

    await query('DELETE FROM saved_lists WHERE user_id = $1 AND list_id = $2', [req.session.user.id, list.id]);
    res.json({ hasSaved: false });
});

app.get('/api/saved-lists', requireAuth, async (req, res) => {
    res.json(await findLists(
        req,
        'EXISTS (SELECT 1 FROM saved_lists s WHERE s.list_id = l.id AND s.user_id = $1)',
        req.session.user.id
    ));
});

async function userFromUrl(req) {
    const [user] = await query('SELECT id FROM users WHERE username = $1', [req.params.username]);
    return user;
}

async function userFollowState(req, userId) {
    const [state] = await query(`
        SELECT (SELECT COUNT(*) FROM follows WHERE following_id = $1) AS follower_count,
               (SELECT COUNT(*) FROM follows WHERE follower_id = $1) AS following_count,
               EXISTS (SELECT 1 FROM follows WHERE following_id = $1 AND follower_id = $2) AS is_following
        `, [userId, req.session.user.id]);
    return state;
}

app.post('/api/users/:username/follow', requireAuth, async (req, res) => {
    const user = await userFromUrl(req);
    if (!user) {
        return res.status(404).json({ error: msg(req, 'userNotFound') });
    }
    if (user.id === req.session.user.id) {
        return res.status(400).json({ error: msg(req, 'cannotFollowSelf') });
    }

    const [followed] = await query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING following_id',
        [req.session.user.id, user.id]
    );

    if (followed) {
        await notify(user.id, req.session.user.id, 'follow');
    }
    res.json(await userFollowState(req, user.id));
});

app.delete('/api/users/:username/follow', requireAuth, async (req, res) => {
    const user = await userFromUrl(req);
    if (!user) {
        return res.status(404).json({ error: msg(req, 'userNotFound') });
    }

    await query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [req.session.user.id, user.id]
    );
    await unnotify(user.id, req.session.user.id, 'follow');
    res.json(await userFollowState(req, user.id));
});


app.get('/api/users/:username/followers', requireAuth, async (req, res) => {
    const user = await userFromUrl(req);
    if (!user) {
        return res.status(404).json({ error: msg(req, 'userNotFound') });
    }

    const people = await query(`
        SELECT u.id, u.username, COALESCE(u.display_name, u.username) AS display_name, u.avatar_url,
               EXISTS (SELECT 1 FROM follows mine WHERE mine.follower_id = $2 AND mine.following_id = u.id) AS is_following
        FROM follows f
        JOIN users u ON u.id = f.follower_id
        WHERE f.following_id = $1
        ORDER BY f.created_at DESC
    `, [user.id, req.session.user.id]);
    res.json(people);
});

app.get('/api/users/:username/following', requireAuth, async (req, res) => {
    const user = await userFromUrl(req);
    if (!user) {
        return res.status(404).json({ error: msg(req, 'userNotFound') });
    }

    const people = await query(`
        SELECT u.id, u.username, COALESCE(u.display_name, u.username) AS display_name, u.avatar_url, u.bio,
               EXISTS (SELECT 1 FROM follows mine WHERE mine.follower_id = $2 AND mine.following_id = u.id) AS is_following
        FROM follows f
        JOIN users u ON u.id = f.following_id
        WHERE f.follower_id = $1
        ORDER BY f.created_at DESC
    `, [user.id, req.session.user.id]);
    res.json(people);
});

const USER_SEARCH_LIMIT = 6;

app.get('/api/users', requireAuth, async (req, res) => {
    const term = escapeLike(plainSearch(String(req.query.q ?? '').trim()));
    if (term === '') {
        return res.json([]);
    }

    const users = await query(`
        SELECT u.id, u.username, COALESCE(u.display_name, u.username) AS display_name, u.avatar_url,
                EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $3 AND f.following_id = u.id) AS is_following
        FROM users u
        WHERE u.id <> $3
            AND (${plainText('u.username')} LIKE $1 OR ${plainText("COALESCE(u.display_name, '')")} LIKE $1)
        ORDER BY ${plainText('u.username')} LIKE $2 DESC, u.username
        LIMIT ${USER_SEARCH_LIMIT}
        `, [`%${term}%`, `${term}%`, req.session.user.id]);

    res.json(users);
});

app.get('/api/users/:username', requireAuth, async (req, res) => {
    const [user] = await query(`
        SELECT id, username, COALESCE(display_name, username) AS display_name, bio, avatar_url,
                about_me, favorite_quote, favorite_things, location, instagram_url, tiktok_url, reading_goal, created_at, staff_role, 
               (SELECT COUNT(*) FROM user_books
               WHERE user_books.user_id = users.id AND user_books.status = 'finished') AS books_read,
               (SELECT COUNT(*) FROM user_books
               WHERE user_books.user_id = users.id AND user_books.review IS NOT NULL) AS reviews_count,
               (SELECT COUNT(*) FROM user_books
                WHERE user_books.user_id = users.id AND user_books.status = 'reading') AS currently_reading,
                                                                                            (SELECT milestone_key FROM user_milestones
                                                                                            WHERE user_milestones.user_id = users.id AND claimed_at IS NOT NULL LIMIT 1) AS badge
        FROM users
        WHERE username = $1
    `, [req.params.username]);

    if (!user) {
        return res.status(404).json({ error: msg(req, 'userNotFound') });
    }

    const follow = await userFollowState(req, user.id);
    res.json({ ...user, ...follow, isMe: user.id === req.session.user.id });
});

app.get('/api/users/:username/posts', requireAuth, async (req, res) => {
    const user = await userFromUrl(req);
    if (!user) {
        return res.status(404).json({ error: msg(req, 'userNotFound') });
    }
    res.json(await findPosts(req, 'p.user_id = $1', user.id));
});

app.get('/api/users/:username/books', requireAuth, async (req, res) => {
    const user = await userFromUrl(req);
    if (!user) {
        return res.status(404).json({ error: msg(req, 'userNotFound') });
    }
    res.json(await findUserBooks(req, user.id));
});

app.get('/api/users/:username/lists', requireAuth, async (req, res) => {
    const user = await userFromUrl(req);
    if (!user) {
        return res.status(404).json({ error: msg(req, 'userNotFound') });
    }
    res.json(await findLists(req, 'l.user_id = $1', user.id));
});

const SIMILAR_LIMIT = 3;

app.get('/api/users/:username/similar', requireAuth, async (req, res) => {
    const user = await userFromUrl(req);
    if (!user) {
        return res.status(404).json({ error: msg(req, 'userNotFound') });
    }

    const readers = await query(`
        WITH owner_books AS (
            SELECT DISTINCT work_id FROM user_books WHERE user_id = $1
        ),
        all_tags AS (
            SELECT p.user_id, pt.tag_id FROM post_tags pt JOIN posts p ON p.id = pt.post_id
            UNION
            SELECT user_id, tag_id FROM tag_follows
        ),
        owner_tags AS (
            SELECT tag_id FROM all_tags WHERE user_id = $1
        ),
        matches AS (
            SELECT ub.user_id, COUNT(DISTINCT ub.work_id) AS shared_books, 0 AS shared_tags
            FROM user_books ub
            JOIN owner_books ob ON ob.work_id = ub.work_id
            GROUP BY ub.user_id
            UNION ALL
            SELECT at.user_id, 0, COUNT(DISTINCT at.tag_id)
            FROM all_tags at
            JOIN owner_tags ot ON ot.tag_id = at.tag_id
            GROUP BY at.user_id
        )
        SELECT u.id, u.username, COALESCE(u.display_name, u.username) AS display_name, u.avatar_url,
               SUM(m.shared_books) AS shared_books,
               SUM(m.shared_tags) AS shared_tags
        FROM matches m
        JOIN users u ON u.id = m.user_id
        WHERE u.id <> $1
          AND u.id <> $2
          AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $2 AND f.following_id = u.id)
        GROUP BY u.id
        ORDER BY SUM(m.shared_books) + SUM(m.shared_tags) DESC, u.username
        LIMIT $3
    `, [user.id, req.session.user.id, SIMILAR_LIMIT]);

    res.json(readers);
});

app.get('/api/users/:username/milestones', requireAuth, async (req, res) => {
    const user = await userFromUrl(req);
    if (!user) {
        return res.status(404).json({ error: msg(req, 'userNotFound') });
    }

    const milestones = await syncMilestones(user.id);

    if (user.id === req.session.user.id) {
        return res.json(milestones);
    }

    res.json(
        milestones
            .filter((milestone) => milestone.achieved)
            .map(({ key, achievedAt, claimed }) => ({ key, achieved: true, achievedAt, claimed }))
    );
});

app.post('/api/milestones/seen', requireAuth, async (req, res) => {
    const keys = Array.isArray(req.body.keys) ? req.body.keys.filter((key) => typeof key === 'string') : [];

    if (keys.length > 0) {
        await query(
            `UPDATE user_milestones SET seen_at = now()
             WHERE user_id = $1 AND milestone_key = ANY($2::text[]) AND seen_at IS NULL`,
            [req.session.user.id, keys]
        );
    }
    res.json({ ok: true });
});

app.put('/api/milestones/badge', requireAuth, async (req, res) => {
    const key = req.body.key ?? null;

    if (key !== null) {
        const [reached] = await query(
            'SELECT 1 FROM user_milestones WHERE user_id = $1 AND milestone_key = $2',
            [req.session.user.id, String(key)]
        );
        if (!reached) {
            return res.status(400).json({ error: msg(req, 'milestoneNotReached') });
        }
    }

    await query(
        `UPDATE user_milestones
        SET claimed_at = CASE WHEN milestone_key = $2 THEN now() ELSE NULL END
        WHERE user_id = $1`,
        [req.session.user.id, key]
    );

    res.json({ badge: key });
});

const passwordProblem = (password) => {
    if (typeof password !== 'string' || password.length < 8) {
        return 'passwordLength';
    }

    if (!/\d/.test(password)) {
        return 'passwordNumber';
    }
    if (!/[a-z]/i.test(password)) {
        return 'passwordLetter';
    }
    return null;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;

app.post('/api/register', authLimiter, async (req, res) => {
    const invite = typeof req.body.invite === 'string' ? req.body.invite.trim() : '';

    if (process.env.SIGNUP_OPEN !== 'true' && !invite) {
        return res.status(403).json({ error: msg(req, 'signupClosed') });
    }
    const { username, email, password } = req.body;
    const language = LANGUAGES.includes(req.body.language) ? req.body.language : 'en';

    if (!username || !email || !password) {
        return res.status(400).json({ error: msg(req, 'registerFieldsRequired') });
    }
    if (!USERNAME_PATTERN.test(username)) {
        return res.status(400).json({ error: msg(req, 'usernameInvalid') });
    }

    const problem = passwordProblem(password);
    if (problem) {
        return res.status(400).json({ error: msg(req, problem) });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (invite) {
            const claimed = await client.query(
                `UPDATE invites i SET used_at = now()
                 WHERE i.code = $1 AND i.used_at IS NULL AND i.status = 'approved' AND ${INVITE_EXPIRES} > now()
                 RETURNING i.code`,
                [invite]
            );
            if (claimed.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(403).json({ error: msg(req, 'inviteInvalid') });
            }
        }

        const result = await client.query(
            'INSERT INTO users (username, email, password_hash, language) VALUES ($1, $2, $3, $4) RETURNING id, username, email',
            [username, email, passwordHash, language]
        );
        const user = result.rows[0];

        if (invite) {
            await client.query('UPDATE invites SET used_by = $1 WHERE code = $2', [user.id, invite]);
        }

        await client.query('COMMIT');
        res.status(201).json(user);
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(400).json({ error: msg(req, 'userTaken') });
        }
        throw error;
    } finally {
        client.release();
    }
});

app.post('/api/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: msg(req, 'loginFieldsRequired') });
    }

    const [user] = await query(
        `SELECT id, username, email, password_hash, avatar_url, display_name, reading_goal, reader_type, language, theme
         FROM users WHERE email = $1`,
        [email]
    );

    if (!user) {
        return res.status(401).json({ error: msg(req, 'invalidLogin') });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
        return res.status(401).json({ error: msg(req, 'invalidLogin') });
    }

    req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
    };

    res.json(await findMe(user.id));
});

app.get('/api/me', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: msg(req, 'notLoggedIn') });
    }

    const me = await findMe(req.session.user.id);

    if (!me) {
        return res.status(401).json({ error: msg(req, 'notLoggedIn') });
    }

    res.json(me);
});

app.patch('/api/me/language', requireAuth, async (req, res) => {
    const { language } = req.body;

    if (!LANGUAGES.includes(language)) {
        return res.status(400).json({ error: msg(req, 'languageInvalid') });
    }

    await query('UPDATE users SET language = $1 WHERE id = $2', [language, req.session.user.id]);
    res.json({ language });
});

const THEMES = ['light', 'dark'];

app.patch('/api/me/theme', requireAuth, async (req, res) => {
    const { theme } = req.body;

    if (!THEMES.includes(theme)) {
        return res.status(400).json({ error: msg(req, 'themeInvalid') });
    }

    await query('UPDATE users SET theme = $1 WHERE id = $2', [theme, req.session.user.id]);
    res.json({ theme });
});

const SEASON_THEMES = ['classic', 'christmas', 'valentine', 'sage', 'lavender', 'amber', 'teal', 'grimm'];
const FREE_SEASON_THEMES = ['classic', 'christmas', 'valentine'];
const PAID_SEASON_THEMES = ['sage', 'lavender', 'amber', 'teal'];

function hasPlus(user) {
    return user.staffRole === 'admin' || (user.plusUntil !== null && user.plusUntil > new Date());
}

async function findUnlockedThemes(user) {
    if (user.staffRole === 'admin') return SEASON_THEMES;
    if (['moderator', 'designer'].includes(user.staffRole)) return [...FREE_SEASON_THEMES, ...PAID_SEASON_THEMES];
    if (hasPlus(user)) return [...FREE_SEASON_THEMES, ...PAID_SEASON_THEMES];

    const rows = await query('SELECT theme FROM theme_unlocks WHERE user_id = $1', [user.id]);
    return [...FREE_SEASON_THEMES, ...rows.map((row) => row.theme)];
}

async function findMe(userId) {
    const [user] = await query(
        `SELECT id, username, email, avatar_url, reading_goal, reader_type, language, theme,
            season_theme, plus_until, staff_role, gender_identity,
            COALESCE(display_name, username) AS display_name
         FROM users WHERE id = $1`,
        [userId]
    );

    if (!user) return null;

    const unlockedThemes = await findUnlockedThemes(user);
    const seasonTheme = unlockedThemes.includes(user.seasonTheme) ? user.seasonTheme : 'classic';
    return { ...user, seasonTheme, isPlus: hasPlus(user), unlockedThemes };
}

app.patch('/api/me/season-theme', requireAuth, async (req, res) => {
    const { seasonTheme } = req.body;

    if (!SEASON_THEMES.includes(seasonTheme)) {
        return res.status(400).json({ error: msg(req, 'seasonThemeInvalid') });
    }

    const me = await findMe(req.session.user.id);

    if (!me.unlockedThemes.includes(seasonTheme)) {
        return res.status(403).json({ error: msg(req, 'themeLocked') });
    }

    await query('UPDATE users SET season_theme = $1 WHERE id = $2', [seasonTheme, me.id]);
    res.json({ seasonTheme });
});

const INVITE_DAYS = 14;
const INVITE_EXPIRES = `COALESCE(i.reviewed_at, i.created_at) + make_interval(days => ${INVITE_DAYS})`;

const INVITE_FIELDS = `
    i.id, i.note, i.status, i.created_at, i.used_at,
    ${INVITE_EXPIRES} AS expires_at,
    i.status = 'approved' AND i.used_at IS NULL AND ${INVITE_EXPIRES} <= now() AS expired,
    requester.username AS requested_by,
    COALESCE(requester.display_name, requester.username) AS created_by_name,
    used.username AS used_by,
    CASE WHEN i.status = 'approved' AND ${INVITE_EXPIRES} > now() THEN i.code END AS code
`;

const INVITE_JOINS = `
    LEFT JOIN users requester ON requester.id = i.created_by
    LEFT JOIN users used ON used.id = i.used_by
`;

async function findInvite(id) {
    const [invite] = await query(`SELECT ${INVITE_FIELDS} FROM invites i ${INVITE_JOINS} WHERE i.id = $1`, [id]);
    return invite;
}

app.get('/api/admin/invites', requireStaff('moderator'), async (req, res) => {
    const onlyFrom = req.staffRole === 'admin' ? null : req.session.user.id;

    const invites = await query(`
        SELECT ${INVITE_FIELDS}
        FROM invites i
        ${INVITE_JOINS}
        WHERE $1::int IS NULL OR i.created_by = $1
        ORDER BY i.status = 'pending' DESC, i.created_at DESC
        LIMIT 50
    `, [onlyFrom]);

    const [counts] = await query(`
        SELECT
            COUNT(*) FILTER (WHERE i.status = 'approved' AND i.used_at IS NULL AND ${INVITE_EXPIRES} > now()) AS unused,
            COUNT(*) FILTER (WHERE i.used_at IS NOT NULL) AS used,
            COUNT(*) FILTER (WHERE i.status = 'approved' AND i.used_at IS NULL AND ${INVITE_EXPIRES} <= now()) AS expired,
            COUNT(*) FILTER (WHERE i.status = 'pending') AS pending
        FROM invites i
    `);

    res.json({
        invites,
        counts,
        expiryDays: INVITE_DAYS,
        signupOpen: process.env.SIGNUP_OPEN === 'true',
    });
});

app.post('/api/admin/invites', requireStaff('moderator'), async (req, res) => {
    const note = (req.body.note || '').trim().slice(0, 80) || null;
    const code = crypto.randomBytes(16).toString('base64url');
    const isAdmin = req.staffRole === 'admin';

    const [created] = await query(`
        INSERT INTO invites (code, note, created_by, status, reviewed_by, reviewed_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `, [
        code,
        note,
        req.session.user.id,
        isAdmin ? 'approved' : 'pending',
        isAdmin ? req.session.user.id : null,
        isAdmin ? new Date() : null,
    ]);
    await logAction(req, isAdmin ? 'invite_created' : 'invite_requested', note);
    res.status(201).json(await findInvite(created.id));
});

app.patch('/api/admin/invites/:id/review', requireStaff('admin'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: msg(req, 'inviteInvalid') });
    }

    const status = req.body.approve === true ? 'approved' : 'rejected';

    const [reviewed] = await query(`
        UPDATE invites SET status = $1, reviewed_by = $2, reviewed_at = now()
        WHERE id = $3 AND status = 'pending'
        RETURNING id, note
    `, [status, req.session.user.id, id]);

    if (!reviewed) {
        return res.status(404).json({ error: msg(req, 'inviteInvalid') });
    }
    await logAction(req, status === 'approved' ? 'invite_approved' : 'invite_rejected', reviewed.note);
    res.json(await findInvite(id));
});

app.delete('/api/admin/invites/:id', requireStaff('admin'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: msg(req, 'inviteInvalid') });
    }

    const [invite] = await query('DELETE FROM invites WHERE id = $1 AND used_at IS NULL RETURNING id, note', [id]);

    if (!invite) {
        return res.status(404).json({ error: msg(req, 'inviteInvalid') });
    }
    await logAction(req, 'invite_deleted', invite.note);
    res.json(invite);
});

const BETA_TRACKING = ['goodreads', 'storygraph', 'mistbook', 'notes', 'instagram', 'none'];
const BETA_FOUND_VIA = ['instagram', 'dm', 'friend', 'discord', 'other'];
const BETA_STATUSES = ['new', 'invited', 'declined'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function pickList(value, allowed) {
    return Array.isArray(value) ? [...new Set(value.filter((item) => allowed.includes(item)))] : [];
}

app.post('/api/beta-applications', applyLimiter, async (req, res) => {
    if (cleanText(req.body.website, 200)) {
        return res.status(201).json({ ok: true });
    }

    const name = cleanText(req.body.name, 80);
    const email = cleanText(req.body.email, 160).toLowerCase();
    const age = Number(req.body.age);
    const social = cleanText(req.body.social, 60) || null;
    const appLanguage = LANGUAGES.includes(req.body.appLanguage) ? req.body.appLanguage : null;
    const genres = pickList(req.body.genres, GENRES);
    const tracking = pickList(req.body.tracking, BETA_TRACKING);
    const foundVia = BETA_FOUND_VIA.includes(req.body.foundVia) ? req.body.foundVia : null;
    const phrase = cleanText(req.body.phrase, 140);
    const confirmed = req.body.isAdult === true && req.body.willGiveFeedback === true && req.body.acceptsEmail === true;

    if (Number.isInteger(age) && age < 18) {
        return res.status(400).json({ error: msg(req, 'betaTooYoung') });
    }
    if (!name || !EMAIL_PATTERN.test(email) || !Number.isInteger(age) || age > 120 || !appLanguage || genres.length === 0 || phrase.length < 5 || !confirmed) {
        return res.status(400).json({ error: msg(req, 'betaFieldsInvalid') });
    }

    try {
        await query(`
            INSERT INTO beta_applications (name, email, age, social, app_language, genres, tracking, found_via, phrase)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [name, email, age, social, appLanguage, genres, tracking, foundVia, phrase]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: msg(req, 'betaAlreadyApplied') });
        }
        throw error;
    }

    res.status(201).json({ ok: true });
});

const APPLICATION_FIELDS = `
    a.id, a.name, a.email, a.age, a.social, a.app_language, a.genres, a.tracking, a.found_via, a.phrase,
    a.status, a.created_at, a.reviewed_at,
    reviewer.username AS reviewed_by,
    i.id AS invite_id, i.status AS invite_status, i.used_at AS invite_used_at,
    CASE WHEN i.status = 'approved' AND i.used_at IS NULL AND ${INVITE_EXPIRES} > now() THEN i.code END AS invite_code
`;

const APPLICATION_JOINS = `
    LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by
    LEFT JOIN invites i ON i.id = a.invite_id
`;

async function findApplication(id) {
    const [application] = await query(`SELECT ${APPLICATION_FIELDS} FROM beta_applications a ${APPLICATION_JOINS} WHERE a.id = $1`, [id]);
    return application;
}

app.get('/api/admin/beta-applications', requireStaff('moderator'), async (req, res) => {
    const status = BETA_STATUSES.includes(req.query.status) ? req.query.status : 'new';

    const applications = await query(`
        SELECT ${APPLICATION_FIELDS}
        FROM beta_applications a
        ${APPLICATION_JOINS}
        WHERE a.status = $1
        ORDER BY a.created_at ${status === 'new' ? 'ASC' : 'DESC'}
        LIMIT 200
    `, [status]);

    const [counts] = await query(`
        SELECT
            COUNT(*) FILTER (WHERE status = 'new') AS new,
            COUNT(*) FILTER (WHERE status = 'invited') AS invited,
            COUNT(*) FILTER (WHERE status = 'declined') AS declined
        FROM beta_applications
    `);

    res.json({ applications, counts });
});

app.post('/api/admin/beta-applications/:id/invite', requireStaff('moderator'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: msg(req, 'applicationNotFound') });
    }

    const isAdmin = req.staffRole === 'admin';
    const client = await pool.connect();
    let application;

    try {
        await client.query('BEGIN');

        const found = await client.query(
            "SELECT id, name, email FROM beta_applications WHERE id = $1 AND status <> 'invited' FOR UPDATE",
            [id]
        );
        application = found.rows[0];

        if (!application) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: msg(req, 'applicationNotFound') });
        }

        const note = `${application.name} · ${application.email}`.slice(0, 80);
        const created = await client.query(`
            INSERT INTO invites (code, note, created_by, status, reviewed_by, reviewed_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [
            crypto.randomBytes(16).toString('base64url'),
            note,
            req.session.user.id,
            isAdmin ? 'approved' : 'pending',
            isAdmin ? req.session.user.id : null,
            isAdmin ? new Date() : null,
        ]);

        await client.query(`
            UPDATE beta_applications
            SET status = 'invited', invite_id = $1, reviewed_by = $2, reviewed_at = now()
            WHERE id = $3
        `, [created.rows[0].id, req.session.user.id, id]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    await logAction(req, 'application_invited', application.name);
    res.status(201).json(await findApplication(id));
});

app.patch('/api/admin/beta-applications/:id', requireStaff('moderator'), async (req, res) => {
    const id = Number(req.params.id);
    const status = req.body.status === 'declined' ? 'declined' : req.body.status === 'new' ? 'new' : null;

    if (!Number.isInteger(id) || !status) {
        return res.status(404).json({ error: msg(req, 'applicationNotFound') });
    }

    const [updated] = await query(`
        UPDATE beta_applications
        SET status = $1, reviewed_by = $2, reviewed_at = now()
        WHERE id = $3 AND status <> 'invited' AND status <> $1
        RETURNING id, name
    `, [status, req.session.user.id, id]);

    if (!updated) {
        return res.status(404).json({ error: msg(req, 'applicationNotFound') });
    }

    await logAction(req, status === 'declined' ? 'application_declined' : 'application_restored', updated.name);
    res.json(await findApplication(id));
});

app.get('/api/admin/summary', requireStaff('moderator'), async (req, res) => {
    const [counts] = await query(`
        SELECT
            (SELECT COUNT(*) FROM users) AS readers,
            (SELECT COUNT(*) FROM users WHERE created_at > now() - interval '7 days') AS new_readers,
            (SELECT COUNT(*) FROM posts) AS posts,
            (SELECT COUNT(*) FROM (
                SELECT user_id FROM posts WHERE created_at > now() - interval '7 days'
                UNION SELECT user_id FROM post_comments WHERE created_at > now() - interval '7 days'
                UNION SELECT user_id FROM post_likes WHERE created_at > now() - interval '7 days'
                UNION SELECT user_id FROM comments WHERE created_at > now() - interval '7 days'
                UNION SELECT user_id FROM likes WHERE created_at > now() - interval '7 days'
                UNION SELECT user_id FROM user_books WHERE last_read_at > now() - interval '7 days'
            ) active) AS active_readers,
            (SELECT COUNT(*) FROM invites WHERE status = 'pending') AS pending_invites,
            (SELECT COUNT(DISTINCT (target_type, target_id)) FROM reports WHERE status = 'pending') AS pending_reports,
            (SELECT COUNT(*) FROM invites i WHERE i.status = 'approved' AND i.used_at IS NULL AND ${INVITE_EXPIRES} > now()) AS unused_invites
    `);

    const team = await query(`
        SELECT staff_role AS role, COUNT(*) AS count
        FROM users
        WHERE staff_role IS NOT NULL
        GROUP BY staff_role
    `);

    const pendingRequests = req.staffRole === 'admin'
        ? await query(`
            SELECT i.id, i.note, i.created_at, u.username AS requested_by
            FROM invites i
            LEFT JOIN users u ON u.id = i.created_by
            WHERE i.status = 'pending'
            ORDER BY i.created_at
            LIMIT 5
        `)
        : [];

    res.json({
        ...counts,
        signupOpen: process.env.SIGNUP_OPEN === 'true',
        team: Object.fromEntries(team.map((row) => [row.role, row.count])),
        pendingRequests,
    });
});

app.get('/api/admin/activity', requireStaff('moderator'), async (req, res) => {
    const days = req.query.days === '30' ? 30 : 7;

    const actions = await query(`
        SELECT a.id, a.action, a.target, a.detail, a.created_at,
               COALESCE(u.display_name, u.username) AS actor
        FROM staff_actions a
        LEFT JOIN users u ON u.id = a.actor_id
        WHERE a.created_at > now() - make_interval(days => $1)
        ORDER BY a.created_at DESC
        LIMIT 100
    `, [days]);
    res.json(actions);
});

const NOTIFICATIONS_PAGE_SIZE = 20;

app.get('/api/notifications', requireAuth, async (req, res) => {
    const unreadOnly = req.query.filter === 'unread';
    const page = Math.max(Number(req.query.page) || 0, 0);

    const rows = await query(`
        SELECT n.id, n.type, n.read_at, n.created_at, n.post_id, n.work_id, n.list_id,
               nl.title AS list_title,
               u.username AS actor_username, COALESCE(u.display_name, u.username) AS actor_name,
               u.avatar_url AS actor_avatar, u.bio AS actor_bio,
               ${TRANSLATED_TITLE} AS book_title,
               COALESCE(pc.text, c.text) AS comment_text
        FROM notifications n
        LEFT JOIN users u ON u.id = n.actor_id
        LEFT JOIN works w ON w.id = n.work_id
        ${JOIN_TRANSLATION} = $2
        LEFT JOIN post_comments pc ON pc.id = n.post_comment_id
        LEFT JOIN comments c ON c.id = n.comment_id
        LEFT JOIN lists nl ON nl.id = n.list_id
        WHERE n.user_id = $1 AND (NOT $3 OR n.read_at IS NULL)
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT $4 OFFSET $5
    `, [
        req.session.user.id,
        languageOf(req),
        unreadOnly,
        NOTIFICATIONS_PAGE_SIZE + 1,
        page * NOTIFICATIONS_PAGE_SIZE,
    ]);

    res.json({
        items: rows.slice(0, NOTIFICATIONS_PAGE_SIZE),
        hasMore: rows.length > NOTIFICATIONS_PAGE_SIZE,
    });
});

app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
    const [row] = await query(
        'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
        [req.session.user.id]
    );
    res.json(row);
});

app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
    await query(
        'UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL',
        [req.session.user.id]
    );
    res.json({ message: 'Read' });
});

app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: msg(req, 'notFound') });
    }

    await query(
        'UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL',
        [id, req.session.user.id]
    );
    res.json({ id });
});

const REPORT_TYPES = ['post', 'post_comment', 'review', 'review_comment', 'profile', 'tag'];
const REPORT_REASONS = ['spoiler', 'offensive', 'harassment', 'spam', 'other'];
const REPORT_ACTIONS = { dismiss: 'dismissed', spoiler: 'spoiler', remove: 'removed' };

const REPORT_TARGETS = {
    post: `
        SELECT p.id, p.text, p.image_url, p.is_spoiler, u.id AS author_id, u.username AS author
        FROM posts p JOIN users u ON u.id = p.user_id
        WHERE p.id = $1`,
    post_comment: `
        SELECT c.id, c.text, u.id AS author_id, u.username AS author
        FROM post_comments c JOIN users u ON u.id = c.user_id
        WHERE c.id = $1`,
    review: `
        SELECT ub.id, ub.review AS text, ub.work_id, w.title AS book_title, u.id AS author_id, u.username AS author
        FROM user_books ub JOIN users u ON u.id = ub.user_id JOIN works w ON w.id = ub.work_id
        WHERE ub.id = $1 AND ub.review IS NOT NULL`,
    review_comment: `
        SELECT c.id, c.text, ub.work_id, w.title AS book_title, u.id AS author_id, u.username AS author
        FROM comments c
        JOIN users u ON u.id = c.user_id
        JOIN user_books ub ON ub.id = c.user_book_id
        JOIN works w ON w.id = ub.work_id
        WHERE c.id = $1`,
    profile: `
        SELECT u.id, u.bio AS text, u.display_name, u.about_me, u.avatar_url, u.id AS author_id, u.username AS author
        FROM users u
        WHERE u.id = $1`,
    tag: `
        SELECT t.id, t.name AS text, t.slug, NULL::int AS author_id, NULL AS author
        FROM tags t
        WHERE t.id = $1`,
};

async function findReportTarget(type, id) {
    const [target] = await query(REPORT_TARGETS[type], [id]);
    return target || null;
}

async function removeReportedContent(type, target) {
    if (type === 'post') {
        await query('DELETE FROM posts WHERE id = $1', [target.id]);
        if (target.imageUrl) await deletePostImage(target.imageUrl);
    } else if (type === 'post_comment') {
        await query('DELETE FROM post_comments WHERE id = $1', [target.id]);
    } else if (type === 'review') {
        await query('UPDATE user_books SET review = NULL, review_is_spoiler = false, review_updated_at = NULL WHERE id = $1', [target.id]);
    } else if (type === 'review_comment') {
        await query('DELETE FROM comments WHERE id = $1', [target.id]);
    } else if (type === 'profile') {
        await query(`
            UPDATE users
            SET display_name = NULL, bio = NULL, about_me = NULL, favorite_quote = NULL,
                favorite_things = NULL, location = NULL, avatar_url = NULL
            WHERE id = $1
        `, [target.id]);
        if (target.avatarUrl) await deleteAvatar(target.avatarUrl);
    } else if (type === 'tag') {
        await query('DELETE FROM tags WHERE id = $1', [target.id]);
    }
}

app.post('/api/reports', requireAuth, async (req, res) => {
    const { targetType, reason } = req.body;
    const targetId = Number(req.body.targetId);
    const details = (req.body.details || '').trim().slice(0, 500) || null;

    if (!REPORT_TYPES.includes(targetType) || !Number.isInteger(targetId) || !REPORT_REASONS.includes(reason)) {
        return res.status(400).json({ error: msg(req, 'reportInvalid') });
    }

    const target = await findReportTarget(targetType, targetId);
    if (!target) {
        return res.status(404).json({ error: msg(req, 'notFound') });
    }
    if (target.authorId === req.session.user.id) {
        return res.status(400).json({ error: msg(req, 'reportOwn') });
    }

    await query(`
        INSERT INTO reports (target_type, target_id, reason, details, reported_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (target_type, target_id, reported_by) DO NOTHING
    `, [targetType, targetId, reason, details, req.session.user.id]);

    res.status(201).json({ message: 'Reported' });
});

app.get('/api/admin/reports/count', requireStaff('moderator'), async (req, res) => {
    const [row] = await query(`
        SELECT COUNT(DISTINCT (target_type, target_id)) AS count
        FROM reports
        WHERE status = 'pending'
    `);
    res.json(row);
});

app.get('/api/admin/reports', requireStaff('moderator'), async (req, res) => {
    const type = REPORT_TYPES.includes(req.query.type) ? req.query.type : null;

    const groups = await query(`
        SELECT r.target_type, r.target_id, COUNT(*) AS reports, MIN(r.created_at) AS first_reported_at,
               mode() WITHIN GROUP (ORDER BY r.reason) AS reason,
               json_agg(json_build_object(
                   'reason', r.reason, 'details', r.details, 'username', u.username, 'createdAt', r.created_at
               ) ORDER BY r.created_at) AS entries
        FROM reports r
        LEFT JOIN users u ON u.id = r.reported_by
        WHERE r.status = 'pending' AND ($1::text IS NULL OR r.target_type = $1)
        GROUP BY r.target_type, r.target_id
        ORDER BY COUNT(*) DESC, MIN(r.created_at)
        LIMIT 50
    `, [type]);

    for (const group of groups) {
        group.target = await findReportTarget(group.targetType, group.targetId);
    }
    res.json(groups);
});

app.post('/api/admin/reports/resolve', requireStaff('moderator'), async (req, res) => {
    const { targetType, action } = req.body;
    const targetId = Number(req.body.targetId);
    const note = (req.body.note || '').trim().slice(0, 500);

    if (!REPORT_TYPES.includes(targetType) || !Number.isInteger(targetId) || !REPORT_ACTIONS[action]) {
        return res.status(400).json({ error: msg(req, 'reportInvalid') });
    }
    if (action === 'spoiler' && targetType !== 'post') {
        return res.status(400).json({ error: msg(req, 'reportInvalid') });
    }
    if (!note) {
        return res.status(400).json({ error: msg(req, 'reportNoteRequired') });
    }

    const [pending] = await query(`
        SELECT COUNT(*) AS count FROM reports
        WHERE target_type = $1 AND target_id = $2 AND status = 'pending'
    `, [targetType, targetId]);

    if (Number(pending.count) === 0) {
        return res.status(404).json({ error: msg(req, 'notFound') });
    }

    const target = await findReportTarget(targetType, targetId);

    if (target && action === 'spoiler') {
        await query('UPDATE posts SET is_spoiler = true WHERE id = $1', [target.id]);
    }
    if (target && action === 'remove') {
        await removeReportedContent(targetType, target);
    }

    await query(`
        UPDATE reports SET status = $1, resolution_note = $2, resolved_by = $3, resolved_at = now()
        WHERE target_type = $4 AND target_id = $5 AND status = 'pending'
    `, [REPORT_ACTIONS[action], note, req.session.user.id, targetType, targetId]);

    const label = target?.author ? `@${target.author}` : target ? `#${target.text}` : null;
    await logAction(req, `report_${REPORT_ACTIONS[action]}`, label, targetType);
    res.json({ status: REPORT_ACTIONS[action] });
});

const STAFF_ROLES = ['editor', 'moderator', 'designer'];

app.get('/api/admin/users', requireStaff('moderator'), async (req, res) => {
    const search = (req.query.q || '').trim();
    const users = await query(`
        SELECT id, username, COALESCE(display_name, username) AS display_name, avatar_url, staff_role
        FROM users
        WHERE username ILIKE $1 OR display_name ILIKE $1
        ORDER BY staff_role IS NULL, username
        LIMIT 20
    `, [`%${search}%`]);
    res.json(users);
});

app.patch('/api/admin/users/:id/staff-role', requireStaff('admin'), async (req, res) => {
    const userId = Number(req.params.id);
    const { staffRole } = req.body;

    if (staffRole !== null && !STAFF_ROLES.includes(staffRole)) {
        return res.status(400).json({ error: msg(req, 'staffRoleInvalid') });
    }
    if (userId === req.session.user.id) {
        return res.status(400).json({ error: msg(req, 'ownStaffRole') });
    }

    const [user] = await query(
        `UPDATE users SET staff_role = $1
         WHERE id = $2 AND staff_role IS DISTINCT FROM 'admin'
         RETURNING id, username, staff_role`,
        [staffRole, userId]
    );

    if (!user) {
        return res.status(404).json({ error: msg(req, 'notFound') });
    }
    await logAction(req, staffRole ? 'role_given' : 'role_removed', user.username, staffRole);
    res.json(user);
});

const BOOK_LANGUAGES = ['en', 'es', 'other'];
const TRANSLATION_LANGUAGES = ['en', 'es'];

function readBookForm(req) {
    const text = (field, max) => (req.body[field] || '').trim().slice(0, max);
    const rawYear = text('year', 10);
    const rawIsbn = text('isbn', 30);

    return {
        title: text('title', 200),
        author: text('author', 120),
        year: rawYear === '' ? null : Number(rawYear),
        isbn: rawIsbn === '' ? null : rawIsbn.replace(/[\s-]/g, ''),
        language: text('language', 10) || 'en',
        genre: text('genre', 40) || null,
        description: text('description', 3000) || null,
        translations: {
            en: { title: text('titleEn', 200) || null, description: text('descriptionEn', 3000) || null },
            es: { title: text('titleEs', 200) || null, description: text('descriptionEs', 3000) || null },
        },
    };
}

function bookFormProblem(book) {
    if (!book.title || !book.author) return 'bookFieldsRequired';

    const maxYear = new Date().getFullYear() + 5;
    if (book.year !== null && (!Number.isInteger(book.year) || book.year < 1 || book.year > maxYear)) {
        return 'bookYearInvalid';
    }
    if (book.isbn !== null && !/^\d{13}$/.test(book.isbn)) return 'isbnInvalid';
    if (!BOOK_LANGUAGES.includes(book.language)) return 'bookLanguageInvalid';
    if (book.genre !== null && !GENRES.includes(book.genre)) return 'bookGenreInvalid';
    return null;
}

async function saveTranslations(workId, book) {
    for (const language of TRANSLATION_LANGUAGES) {
        const translation = book.translations[language];

        if (language === book.language || (!translation.title && !translation.description)) {
            await query('DELETE FROM work_translations WHERE work_id = $1 AND language = $2', [workId, language]);
            continue;
        }

        await query(`
            INSERT INTO work_translations (work_id, language, title, description)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (work_id, language)
            DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
        `, [workId, language, translation.title || book.title, translation.description]);
    }
}

async function isbnUsedElsewhere(isbn, workId) {
    if (!isbn) return false;

    const [edition] = await query('SELECT work_id FROM editions WHERE isbn_13 = $1', [isbn]);
    return Boolean(edition) && edition.workId !== workId;
}

async function saveIsbn(workId, book) {
    if (!book.isbn) return;

    const [edition] = await query(
        'SELECT id FROM editions WHERE work_id = $1 ORDER BY isbn_13 IS NULL, id LIMIT 1',
        [workId]
    );

    if (edition) {
        await query('UPDATE editions SET isbn_13 = $1 WHERE id = $2', [book.isbn, edition.id]);
    } else {
        await query(
            'INSERT INTO editions (work_id, title, language, isbn_13, published_year) VALUES ($1, $2, $3, $4, $5)',
            [workId, book.title, book.language, book.isbn, book.year]
        );
    }
}

app.get('/api/editor/books', requireStaff('editor'), async (req, res) => {
    const term = escapeLike(plainSearch((req.query.q || '').trim()));

    const books = await query(`
        SELECT w.id, w.title, w.author, w.first_published_year AS year, w.cover_image,
               u.username AS added_by,
               EXISTS (SELECT 1 FROM work_translations t WHERE t.work_id = w.id AND t.language = 'es') AS has_spanish,
               (SELECT COUNT(*) FROM user_books ub WHERE ub.work_id = w.id) AS readers
        FROM works w
        LEFT JOIN users u ON u.id = w.added_by
        WHERE ${plainText('w.title')} LIKE $1
           OR ${plainText('w.author')} LIKE $1
           OR EXISTS (
               SELECT 1 FROM work_translations any_t
               WHERE any_t.work_id = w.id AND ${plainText('any_t.title')} LIKE $1
           )
        ORDER BY w.created_at DESC, w.id DESC
        LIMIT 30
    `, [`%${term}%`]);
    res.json(books);
});

app.get('/api/editor/books/:id', requireStaff('editor'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: msg(req, 'bookNotFound') });
    }

    const [book] = await query(`
        SELECT w.id, w.title, w.author, w.description, w.cover_image, w.first_published_year AS year,
               w.language, w.genre,
               (SELECT e.isbn_13 FROM editions e WHERE e.work_id = w.id ORDER BY e.isbn_13 IS NULL, e.id LIMIT 1) AS isbn,
               en.title AS title_en, en.description AS description_en,
               es.title AS title_es, es.description AS description_es
        FROM works w
        LEFT JOIN work_translations en ON en.work_id = w.id AND en.language = 'en'
        LEFT JOIN work_translations es ON es.work_id = w.id AND es.language = 'es'
        WHERE w.id = $1
    `, [id]);

    if (!book) {
        return res.status(404).json({ error: msg(req, 'bookNotFound') });
    }
    res.json(book);
});

app.post('/api/editor/books', requireStaff('editor'), upload.single('cover'), async (req, res) => {
    const book = readBookForm(req);
    const problem = bookFormProblem(book);
    if (problem) {
        return res.status(400).json({ error: msg(req, problem) });
    }
    if (await isbnUsedElsewhere(book.isbn, null)) {
        return res.status(400).json({ error: msg(req, 'isbnTaken') });
    }

    const coverImage = req.file ? await uploadCover(req.file) : null;

    const [work] = await query(`
        INSERT INTO works (title, author, description, cover_image, first_published_year, language, genre, added_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `, [book.title, book.author, book.description, coverImage, book.year, book.language, book.genre, req.session.user.id]);

    await saveTranslations(work.id, book);
    await saveIsbn(work.id, book);
    await markRequestAdded(req.body.requestId, work.id, req.session.user.id);
    await logAction(req, 'book_added', book.title);
    res.status(201).json(work);
});

app.patch('/api/editor/books/:id', requireStaff('editor'), upload.single('cover'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: msg(req, 'bookNotFound') });
    }

    const book = readBookForm(req);
    const problem = bookFormProblem(book);
    if (problem) {
        return res.status(400).json({ error: msg(req, problem) });
    }

    const [current] = await query('SELECT cover_image FROM works WHERE id = $1', [id]);
    if (!current) {
        return res.status(404).json({ error: msg(req, 'bookNotFound') });
    }
    if (await isbnUsedElsewhere(book.isbn, id)) {
        return res.status(400).json({ error: msg(req, 'isbnTaken') });
    }

    const coverImage = req.file ? await uploadCover(req.file) : current.coverImage;

    await query(`
        UPDATE works
        SET title = $1, author = $2, description = $3, cover_image = $4,
            first_published_year = $5, language = $6, genre = $7, updated_at = now()
        WHERE id = $8
    `, [book.title, book.author, book.description, coverImage, book.year, book.language, book.genre, id]);

    await saveTranslations(id, book);
    await saveIsbn(id, book);

    if (req.file) {
        await deleteCover(current.coverImage);
    }
    await logAction(req, 'book_updated', book.title);
    res.json({ id });
});

app.post('/api/book-requests', requireAuth, async (req, res) => {
    const title = (req.body.title || '').trim().slice(0, 200);
    const author = (req.body.author || '').trim().slice(0, 120) || null;

    if (!title) {
        return res.status(400).json({ error: msg(req, 'requestTitleRequired') });
    }

    let [request] = await query(`
        SELECT id FROM book_requests
        WHERE status = 'pending' AND ${plainText('title')} = $1
    `, [plainSearch(title)]);

    if (!request) {
        [request] = await query(
            'INSERT INTO book_requests (title, author, created_by) VALUES ($1, $2, $3) RETURNING id',
            [title, author, req.session.user.id]
        );
    }

    await query(
        'INSERT INTO book_request_votes (request_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [request.id, req.session.user.id]
    );

    res.status(201).json({ id: request.id });
});

app.get('/api/editor/book-requests', requireStaff('editor'), async (req, res) => {
    const requests = await query(`
        SELECT r.id, r.title, r.author, r.created_at, u.username AS requested_by,
               (SELECT COUNT(*) FROM book_request_votes v WHERE v.request_id = r.id) AS votes
        FROM book_requests r
        LEFT JOIN users u ON u.id = r.created_by
        WHERE r.status = 'pending'
        ORDER BY votes DESC, r.created_at
        LIMIT 30
    `);
    res.json(requests);
});

app.patch('/api/editor/book-requests/:id', requireStaff('editor'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: msg(req, 'notFound') });
    }

    const [request] = await query(`
        UPDATE book_requests SET status = 'rejected', resolved_by = $1, resolved_at = now()
        WHERE id = $2 AND status = 'pending'
        RETURNING id, title
    `, [req.session.user.id, id]);

    if (!request) {
        return res.status(404).json({ error: msg(req, 'notFound') });
    }
    await logAction(req, 'request_rejected', request.title);
    res.json(request);
});

async function markRequestAdded(requestId, workId, userId) {
    const id = Number(requestId);
    if (!Number.isInteger(id)) return;

    const [request] = await query(`
        UPDATE book_requests SET status = 'added', work_id = $1, resolved_by = $2, resolved_at = now()
        WHERE id = $3 AND status = 'pending'
        RETURNING id
    `, [workId, userId, id]);

    if (!request) return;

    await query(`
        INSERT INTO notifications (user_id, type, work_id)
        SELECT user_id, 'book_added', $1 FROM book_request_votes WHERE request_id = $2
    `, [workId, id]);
}

app.delete('/api/editor/books/:id', requireStaff('editor'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: msg(req, 'bookNotFound') });
    }

    const [book] = await query(`
        SELECT title, cover_image,
               (SELECT COUNT(*) FROM user_books WHERE work_id = $1)
             + (SELECT COUNT(*) FROM post_books WHERE work_id = $1) AS uses
        FROM works
        WHERE id = $1
    `, [id]);

    if (!book) {
        return res.status(404).json({ error: msg(req, 'bookNotFound') });
    }
    if (book.uses > 0) {
        return res.status(409).json({ error: msg(req, 'bookInUse') });
    }

    await query('DELETE FROM works WHERE id = $1', [id]);
    await deleteCover(book.coverImage);
    await logAction(req, 'book_deleted', book.title);
    res.json({ id });
});

app.get('/api/profile', requireAuth, async (req, res) => {
    const [user] = await query(`
        SELECT id, username, email, bio, avatar_url, instagram_url, tiktok_url, about_me, favorite_quote,
    favorite_things, location, reading_goal, reader_type, created_at, staff_role,
    COALESCE(display_name, username) AS display_name,
        (SELECT COUNT(*) FROM user_books
                   WHERE user_books.user_id = users.id AND user_books.status = 'finished') AS books_read,
    (SELECT COUNT(*) FROM user_books
                   WHERE user_books.user_id = users.id AND user_books.review IS NOT NULL) AS reviews_count,
    (SELECT COUNT(*) FROM user_books
                   WHERE user_books.user_id = users.id AND user_books.status = 'reading') AS currently_reading,
                                                                                                (SELECT milestone_key FROM user_milestones
                                                                                                WHERE user_milestones.user_id = users.id AND claimed_at IS NOT NULL LIMIT 1) AS badge
        FROM users
        WHERE users.id = $1
    `, [req.session.user.id]);

    const follow = await userFollowState(req, user.id);
    res.json({ ...user, ...follow });
});

const READER_TYPES = ['first-time', 'casual', 'avid'];

app.patch('/api/profile', requireAuth, upload.single('avatar'), async (req, res) => {
    const { readerType } = req.body;
    const bio = req.body.bio?.slice(0, 160);
    const location = req.body.location?.slice(0, 60);
    const instagramUrl = req.body.instagramUrl?.slice(0, 200);
    const tiktokUrl = req.body.tiktokUrl?.slice(0, 200);
    if (readerType !== undefined && !READER_TYPES.includes(readerType)) {
        return res.status(400).json({ error: msg(req, 'readerTypeInvalid') });
    }
    const aboutMe = req.body.aboutMe?.trim().slice(0, 600) || null;
    const favoriteQuote = req.body.favoriteQuote?.trim().slice(0, 200) || null;
    const favoriteThings = req.body.favoriteThings?.trim().slice(0, 300) || null;
    const displayName = req.body.displayName?.trim().slice(0, 40) || null;
    const goal = parseInt(req.body.readingGoal, 10);
    const readingGoal = goal >= 1 && goal <= 365 ? goal : null;
    const avatarUrl = req.file ? await uploadAvatar(req.file) : null;

    let oldAvatarUrl = null;
    if (avatarUrl) {
        const [current] = await query('SELECT avatar_url FROM users WHERE id = $1', [req.session.user.id]);
        oldAvatarUrl = current?.avatarUrl || null;
    }

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

    if (oldAvatarUrl && oldAvatarUrl !== avatarUrl) {
        await deleteAvatar(oldAvatarUrl);
    }

    res.json(user);
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: msg(req, 'logoutFailed') });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get(/^(?!\/api\/).*/, (req, res) => {
        res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
}

app.use((error, req, res, next) => {
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: msg(req, 'photoSize') });
    }
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ error: msg(req, 'requestTooLarge') });
    }
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: msg(req, 'invalidRequest') });
    }
    if (error.status === 400) {
        return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: msg(req, 'serverError') });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
