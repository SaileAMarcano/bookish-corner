const path = require('path');
const Database = require('better-sqlite3');
const { pool } = require('./database');

const sqlite = new Database(path.join(__dirname, 'books.db'), { readonly: true });
const utc = (text) => (text ? text.replace(' ', 'T') + 'Z' : null);

async function insert(client, table, row) {
    const columns = Object.keys(row);
    const placeholders = columns.map((column, index) => `$${index + 1}`);
    await client.query(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
        Object.values(row)
    );
}

async function copyEverything(client) {
    const copied = { users: 0, works: 0, userBooks: 0, likes: 0, comments: 0, skipped: 0 };

    const userIds = new Set();
    for (const user of sqlite.prepare('SELECT * FROM users').all()) {
        const goal = user.readingGoal >= 1 && user.readingGoal <= 365 ? user.readingGoal : null;
        await insert(client, 'users', {
            id: user.id,
            username: user.username,
            email: user.email,
            password_hash: user.passwordHash,
            display_name: user.displayName,
            bio: user.bio,
            about_me: user.aboutMe,
            favorite_quote: user.favoriteQuote,
            favorite_things: user.favoriteThings,
            location: user.location,
            avatar_url: user.avatarUrl,
            instagram_url: user.instagramUrl,
            tiktok_url: user.tiktokUrl,
            reading_goal: goal,
            reader_type: user.readerType,
            created_at: utc(user.createdAt),
        });
        userIds.add(user.id);
        copied.users++;
    }

    const workIds = new Set();
    for (const book of sqlite.prepare('SELECT * FROM books').all()) {
        await insert(client, 'works', {
            id: book.id,
            title: book.title,
            author: book.author,
            description: book.description,
            cover_image: book.coverImage,
            open_library_key: book.openLibraryKey,
        });
        workIds.add(book.id);
        copied.works++;
    }

    const userBookIds = new Set();
    for (const entry of sqlite.prepare('SELECT * FROM user_books').all()) {
        if (!userIds.has(entry.userId) || !workIds.has(entry.bookId)) {
            copied.skipped++;
            continue;
        }
        await insert(client, 'user_books', {
            id: entry.id,
            user_id: entry.userId,
            work_id: entry.bookId,
            status: entry.status,
            progress: Math.min(100, Math.max(0, entry.progress || 0)),
            current_page: entry.currentPage,
            total_pages: entry.totalPages || null,
            current_chapter: entry.currentChapter,
            review: entry.review && entry.review.trim() ? entry.review : null,
            rating: entry.rating || 0,
            genre: entry.genre || null,
            is_favorite: entry.isFavorite === 1,
            started_at: utc(entry.startedAt),
            finished_at: utc(entry.finishedAt),
            last_read_at: utc(entry.lastReadAt),
            created_at: utc(entry.createdAt),
        });
        userBookIds.add(entry.id);
        copied.userBooks++;
    }

    for (const like of sqlite.prepare('SELECT * FROM likes').all()) {
        if (!userIds.has(like.userId) || !userBookIds.has(like.userBookId)) {
            copied.skipped++;
            continue;
        }
        await insert(client, 'likes', {
            id: like.id,
            user_id: like.userId,
            user_book_id: like.userBookId,
            created_at: utc(like.createdAt),
        });
        copied.likes++;
    }

    for (const comment of sqlite.prepare('SELECT * FROM comments').all()) {
        if (!userIds.has(comment.userId) || !userBookIds.has(comment.userBookId)) {
            copied.skipped++;
            continue;
        }
        await insert(client, 'comments', {
            id: comment.id,
            user_id: comment.userId,
            user_book_id: comment.userBookId,
            text: comment.text,
            created_at: utc(comment.createdAt),
        });
        copied.comments++;
    }

    // We wrote the ids by hand, so each table's counter must jump past the highest one.
    for (const table of ['users', 'works', 'user_books', 'likes', 'comments']) {
        await client.query(
            `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM ${table}`
        );
    }

    return copied;
}

async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const copied = await copyEverything(client);
        await client.query('COMMIT');
        console.log('Migration finished:', copied);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed, nothing was saved:', error.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
        sqlite.close();
    }
}

main();