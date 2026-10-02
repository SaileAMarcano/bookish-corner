'use strict';
const fs = require('fs');
const path = require('path');
const { descriptionFrom, coverUrl } = require('../openLibrary');
const { query, pool } = require('../database');

const SEED_FILE = path.join(__dirname, 'seed-books.csv');
const REPORT_FILE = path.join(__dirname, 'import-report.txt');
const USER_AGENT = 'BookishCorner/1.0 (catalog import script)';
const MIN_DELAY_MS = 1000;
const SEARCH_FIELDS = 'key,title,author_name,first_publish_year,cover_i,cover_edition_key';

let lastRequestAt = 0;

function readSeedList() {
    const text = fs.readFileSync(SEED_FILE, 'utf8');
    const lines = text.split(/\r?\n/);
    const books = [];

    lines.forEach((rawLine, index) => {
        const line = rawLine.trim();

        if (index === 0 || line === '' || line.startsWith('#')) return;

        const [title = '', author = '', isbn = ''] = line.split(';').map((part) => part.trim());

        if (!title || !author) {
            console.warn(`Line ${index + 1} skipped: it needs a title and an author`);
            return;
        }

        books.push({ line: index + 1, title, author, isbn: isbn || null });
    });

    return books;
}


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


async function openLibraryGet(pathAndQuery) {
    const wait = lastRequestAt + MIN_DELAY_MS - Date.now();
    if (wait > 0) {
        await sleep(wait);
    }
    lastRequestAt = Date.now();

    const response = await fetch(`https://openlibrary.org${pathAndQuery}`, {
        headers: { 'User-Agent': USER_AGENT },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
        throw new Error(`Open Library answered ${response.status} for ${pathAndQuery}`);
    }
    return response.json();
}

async function findBook(book) {
    let match = null;
    let foundBy = null;

    if (book.isbn) {
        const data = await openLibraryGet(`/search.json?q=isbn:${book.isbn}&limit=1&fields=${SEARCH_FIELDS}`);
        match = data.docs[0] || null;
        foundBy = 'isbn';
    }

    if (!match) {
        const params = new URLSearchParams({
            title: book.title,
            author: book.author,
            limit: 1,
            fields: SEARCH_FIELDS,
        });
        const data = await openLibraryGet(`/search.json?${params}`);
        match = data.docs[0] || null;
        foundBy = 'title';
    }

    if (!match) return null;

    const work = await openLibraryGet(`${match.key}.json`);

    let edition = null;
    if (foundBy === 'isbn') {
        edition = await openLibraryGet(`/isbn/${book.isbn}.json`);
    }
    if (!edition && match.cover_edition_key) {
        edition = await openLibraryGet(`/books/${match.cover_edition_key}.json`);
    }

    return { foundBy, match, work, edition };
}

function yearFrom(text) {
    const found = String(text || '').match(/\d{4}/);
    return found ? Number(found[0]) : null;
}

function toRows(book, found) {
    const { match, work, edition } = found;

    const workRow = {
        title: book.title,
        author: match.author_name?.[0] || book.author,
        description: descriptionFrom(work),
        coverImage: coverUrl(match.cover_i ?? work.covers?.[0]),
        firstPublishedYear: match.first_publish_year || null,
        openLibraryKey: match.key,
    };

    if (!edition) {
        return { workRow, editionRow: null };
    }

    const isbn = edition.isbn_13?.includes(book.isbn) ? book.isbn : edition.isbn_13?.[0];
    const pages = edition.number_of_pages;

    const editionRow = {
        title: edition.title || workRow.title,
        language: edition.languages?.[0]?.key?.split('/').pop() || null,
        isbn13: /^\d{13}$/.test(isbn || '') ? isbn : null,
        publisher: edition.publishers?.[0] || null,
        publishedYear: yearFrom(edition.publish_date),
        pageCount: Number.isInteger(pages) && pages > 0 && pages < 32768 ? pages : null,
        coverImage: coverUrl(edition.covers?.[0]),
        openLibraryKey: edition.key,
    };

    return { workRow, editionRow };
}

async function saveBook({ workRow, editionRow }) {
    const [savedWork] = await query(`
        INSERT INTO works (title, author, description, cover_image, first_published_year, open_library_key)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (open_library_key) DO UPDATE
        SET title = EXCLUDED.title,
            description = COALESCE(works.description, EXCLUDED.description),
            cover_image = COALESCE(works.cover_image, EXCLUDED.cover_image),
            first_published_year = COALESCE(works.first_published_year, EXCLUDED.first_published_year)
        RETURNING id, description
    `, [workRow.title, workRow.author, workRow.description, workRow.coverImage, workRow.firstPublishedYear, workRow.openLibraryKey]);

    let savedEdition = null;
    if (editionRow) {
        [savedEdition] = await query(`
            INSERT INTO editions(work_id, title, language, isbn_13, publisher, published_year, page_count, cover_image, open_library_key)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT DO NOTHING
            RETURNING id
        `, [savedWork.id, editionRow.title, editionRow.language, editionRow.isbn13, editionRow.publisher, editionRow.publishedYear, editionRow.pageCount, editionRow.coverImage, editionRow.openLibraryKey]);
    }

    return {
        workId: savedWork.id,
        editionId: savedEdition?.id ?? null,
        hasDescription: savedWork.description !== null,

    };
}

function simplify(title) {
    return title
        .split(':')[0]
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/^(the|a|an) /, '');
}

function sameTitle(a, b) {
    const first = simplify(a);
    const second = simplify(b);
    return first.includes(second) || second.includes(first);
}

function writeReport(report) {
    const section = (title, items) => [`${title}: ${items.length}`, ...items.map((item) => `  - ${item}`), ''];

    const lines = [
        `Catalog import - ${new Date().toLocaleString()}`,
        `New editions saved: ${report.newEditions}`,
        `Already saved before: ${report.alreadySaved}`,
        '',
        ...section('NOT FOUND in Open Library', report.notFound),
        ...section('TITLE DOES NOT MATCH (check the ISBN)', report.titleMismatch),
        ...section('Without description', report.noDescription),
        ...section('Without edition', report.noEdition),
        ...section('ERRORS (run the script again later)', report.failed),
    ];

    fs.writeFileSync(REPORT_FILE, lines.join('\n'), 'utf8');

    console.log('');
    console.log(lines.filter((line) => !line.startsWith('  - ')).join('\n'));
    console.log(`Full report: ${REPORT_FILE}`);
}

async function main() {
    const books = readSeedList();
    console.log(`Seed list: ${books.length} books. This takes about 15 minutes.`);

    const report = {
        newEditions: 0,
        alreadySaved: 0,
        notFound: [],
        titleMismatch: [],
        noDescription: [],
        noEdition: [],
        failed: [],
    };

    for (const [index, book] of books.entries()) {
        const label = `[${index + 1}/${books.length}] ${book.title}`;

        try {
            const found = await findBook(book);

            if (!found) {
                report.notFound.push(`${book.title} - ${book.author} (line ${book.line})`);
                console.log(`${label} -> NOT FOUND`);
                continue;
            }

            const rows = toRows(book, found);
            const saved = await saveBook(rows);

            if (!rows.editionRow) {
                report.noEdition.push(rows.workRow.title);
            } else if (saved.editionId) {
                report.newEditions++;
            } else {
                report.alreadySaved++;
            }

            const openLibraryTitle = found.work.title || found.match.title;
            if (!sameTitle(book.title, openLibraryTitle)) {
                report.titleMismatch.push(`${book.title} -> ${openLibraryTitle} (line ${book.line})`);
            }

            if (!saved.hasDescription) {
                report.noDescription.push(rows.workRow.title);
            }

            console.log(`${label} -> ok`);
        } catch (error) {
            report.failed.push(`${book.title} (line ${book.line}): ${error.message}`);
            console.log(`${label} -> ERROR: ${error.message}`);
        }
    }

    writeReport(report);
}

main()
    .catch((error) => {
        console.error('Import failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());