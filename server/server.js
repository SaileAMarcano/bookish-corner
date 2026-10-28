const express = require('express');
const { query, pool } = require('./database');
const { descriptionFrom } = require('./openLibrary');
const { uploadAvatar, deleteAvatar, uploadPostImage, deletePostImage } = require('./storage');
const { LANGUAGES, languageOf, msg } = require('./messages');
const { syncMilestones } = require('./milestones');
const cors = require('cors');
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
        sameSite: 'lax';
        maxAge: 1000 * 60 * 60 * 24,
    },
}));

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

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

const PORT = process.env.PORT || 3000;
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: msg(req, 'loginRequired') });
    }
    next();
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
               w.cover_image, w.first_published_year AS year, wg.genre,
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
        SELECT ub.id, ub.review, ub.rating, ub.status, ub.created_at,
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
        headers: { 'User-Agent': 'BookishCorner/1.0' },
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

    if (results.length >= limit) {
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

    const [userBook] = await query('SELECT user_id FROM user_books WHERE id = $1', [id]);
    if (!userBook) {
        return res.status(404).json({ error: msg(req, 'reviewNotFound') });
    }
    if (userBook.userId === req.session.user.id) {
        return res.status(403).json({ error: msg(req, 'ownReviewLike') });
    }

    try {
        await query('INSERT INTO likes (user_id, user_book_id) VALUES ($1, $2)', [req.session.user.id, id]);
        res.status(201).json({ message: 'Liked' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: msg(req, 'alreadyLiked') });
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

const REVIEW_MAX_LENGTH = 5000;
const PROGRESS_NOTE_MAX_LENGTH = 280;

app.patch('/api/user-books/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status, progress, review, isFavorite, genre, currentPage, totalPages, currentChapter, rating, progressNote } = req.body;

    const [userBook] = await query('SELECT * FROM user_books WHERE id = $1', [id]);
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
    if (progressNote !== undefined && progressNote !== null && typeof progressNote !== 'string') {
        return res.status(400).json({ error: msg(req, 'progressNoteTooLong') });
    }
    if (typeof progressNote === 'string' && progressNote.trim().length > PROGRESS_NOTE_MAX_LENGTH) {
        return res.status(400).json({ error: msg(req, 'progressNoteTooLong') });
    }

    const newTotal = keepOrSet(totalPages, userBook.totalPages);
    const newPage = keepOrSet(currentPage, userBook.currentPage);
    const newChapter = keepOrSet(currentChapter, userBook.currentChapter);
    const newGenre = keepOrSet(genre, userBook.genre);
    const cleanReview = typeof review === 'string' ? review.trim() || null : review;
    const newReview = keepOrSet(cleanReview, userBook.review);
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
            is_favorite = COALESCE($4, is_favorite),
            genre = $5,
            current_page = $6,
            total_pages = $7,
            current_chapter = $8,
            rating = COALESCE($9, rating),
            started_at = CASE WHEN $10 THEN now() ELSE started_at END,
            finished_at = CASE WHEN $11 THEN now() ELSE finished_at END,
            last_read_at = CASE WHEN $12 THEN now() ELSE last_read_at END,
            progress_note = CASE WHEN $14 THEN $15 ELSE progress_note END,
            progress_note_at = CASE WHEN $14 THEN (CASE WHEN $15::text IS NULL THEN NULL ELSE now() END)
                                    ELSE progress_note_at END
        WHERE id = $13
        RETURNING *
    `, [status, progress, newReview, isFavorite, newGenre, newPage, newTotal, newChapter, rating, startedNow, finishedNow, readNow, id, noteGiven, cleanNote]);

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
        SELECT ub.id, ub.status, ub.review, ub.is_favorite, ub.genre, ub.rating,
               ub.current_page, ub.total_pages, ub.current_chapter,
               ub.started_at, ub.finished_at, ub.last_read_at, ub.created_at,
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
                - EXTRACT(EPOCH FROM now() - i.happened_at) / 86400 * 0.5) DESC, i.happened_at DESC`,
    following: 'i.happened_at DESC',
    recent: 'i.happened_at DESC',
};

async function findActivity(req, ids) {
    return query(`
        SELECT ub.id, ub.user_id, ub.status, ub.rating, ub.review, ub.current_page, ub.total_pages, ub.progress_note,
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
        ${WORK_GENRES}
        SELECT genre, COUNT(*) AS book_count
        FROM work_genre
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
        ${WORK_GENRES}
        SELECT w.id, ${TRANSLATED_TITLE} AS title, w.author, w.cover_image,
               COUNT(ub.id) AS readers,
               ROUND(AVG(ub.rating) FILTER (WHERE ub.rating > 0), 1) AS average_rating
        FROM work_genre wg
        JOIN works w ON w.id = wg.work_id
        JOIN user_books ub ON ub.work_id = w.id
        ${JOIN_TRANSLATION} = $2
        WHERE wg.genre = $1
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
    res.json({ tag: { name: tag.name, slug: tag.slug, ...follow }, posts, relatedTags, books });
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

    await query(
        'INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.session.user.id, post.id]
    );
    res.json(await likeState(req, post.id));
});

app.delete('/api/posts/:id/like', requireAuth, async (req, res) => {
    const post = await postFromUrl(req);
    if (!post) {
        return res.status(404).json({ error: msg(req, 'postNotFound') });
    }

    await query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [req.session.user.id, post.id]);
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

    await query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.session.user.id, user.id]
    );
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
               about_me, favorite_quote, favorite_things, location, instagram_url, tiktok_url, reading_goal, created_at, 
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

const USERNAME_MAX_LENGTH = 30;

app.post('/api/register', authLimiter, async (req, res) => {
    const { username, email, password } = req.body;
    const language = LANGUAGES.includes(req.body.language) ? req.body.language : 'en';

    if (!username || !email || !password) {
        return res.status(400).json({ error: msg(req, 'registerFieldsRequired') });
    }
    if (username.length > USERNAME_MAX_LENGTH) {
        return res.status(400).json({ error: msg(req, 'usernameTooLong') });
    }

    const problem = passwordProblem(password);
    if (problem) {
        return res.status(400).json({ error: msg(req, problem) });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const [user] = await query(
            'INSERT INTO users (username, email, password_hash, language) VALUES ($1, $2, $3, $4) RETURNING id, username, email',
            [username, email, passwordHash, language]
        );
        res.status(201).json(user);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: msg(req, 'userTaken') });
        }
        throw error;
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
    return user.isAdmin || (user.plusUntil !== null && user.plusUntil > new Date());
}

async function findUnlockedThemes(user) {
    if (user.isAdmin) return SEASON_THEMES;
    if (hasPlus(user)) return [...FREE_SEASON_THEMES, ...PAID_SEASON_THEMES];

    const rows = await query('SELECT theme FROM theme_unlocks WHERE user_id = $1', [user.id]);
    return [...FREE_SEASON_THEMES, ...rows.map((row) => row.theme)];
}

async function findMe(userId) {
    const [user] = await query(
        `SELECT id, username, email, avatar_url, reading_goal, reader_type, language, theme,
            season_theme, plus_until, is_admin, gender_identity,
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

app.get('/api/profile', requireAuth, async (req, res) => {
    const [user] = await query(`
        SELECT id, username, email, bio, avatar_url, instagram_url, tiktok_url, about_me, favorite_quote,
    favorite_things, location, reading_goal, reader_type, created_at,
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

app.use(express.static(CLIENT_DIST));
app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

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
