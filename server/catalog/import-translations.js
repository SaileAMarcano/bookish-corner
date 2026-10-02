'use strict';
// Loads the Spanish titles (translations-es.csv) and our own descriptions
// (descriptions.json) into the database. It does not call Open Library,
// so it takes a few seconds. Safe to run again after editing the files.
//
//   node catalog/import-translations.js
const fs = require('fs');
const path = require('path');
const { pool } = require('../database');

const TITLES_FILE = path.join(__dirname, 'translations-es.csv');
const DESCRIPTIONS_FILE = path.join(__dirname, 'descriptions.json');

// "English title" -> "Spanish title". Lines that start with # (also #?) are skipped.
function readSpanishTitles() {
    const lines = fs.readFileSync(TITLES_FILE, 'utf8').split(/\r?\n/);
    const titles = new Map();

    lines.forEach((rawLine, index) => {
        const line = rawLine.trim();
        if (index === 0 || line === '' || line.startsWith('#')) return;

        const [title = '', titleEs = ''] = line.split(';').map((part) => part.trim());
        if (!title || !titleEs) {
            console.warn(`translations-es.csv line ${index + 1} skipped: it needs two columns`);
            return;
        }
        titles.set(title, titleEs);
    });

    return titles;
}

// "English title" -> { en: '...', es: '...' }
function readDescriptions() {
    if (!fs.existsSync(DESCRIPTIONS_FILE)) return new Map();
    return new Map(Object.entries(JSON.parse(fs.readFileSync(DESCRIPTIONS_FILE, 'utf8'))));
}

async function main() {
    const spanishTitles = readSpanishTitles();
    const descriptions = readDescriptions();
    const allTitles = new Set([...spanishTitles.keys(), ...descriptions.keys()]);

    const report = { titles: 0, descriptions: 0, notFound: [], repeated: [] };

    // One transaction: if something fails, nothing is saved half-way.
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const title of allTitles) {
            const { rows } = await client.query('SELECT id, title FROM works WHERE title = $1', [title]);

            if (rows.length === 0) {
                report.notFound.push(title);
                continue;
            }
            if (rows.length > 1) {
                report.repeated.push(title);
                continue;
            }

            const work = rows[0];
            const description = descriptions.get(title) || {};

            // Our own English description replaces the one from Open Library.
            if (description.en) {
                await client.query('UPDATE works SET description = $1 WHERE id = $2', [description.en, work.id]);
            }

            // Spanish row: Spanish title if we have one, if not the original title.
            const titleEs = spanishTitles.get(title);
            if (titleEs || description.es) {
                await client.query(`
                    INSERT INTO work_translations (work_id, language, title, description)
                    VALUES ($1, 'es', $2, $3)
                    ON CONFLICT (work_id, language) DO UPDATE
                    SET title = EXCLUDED.title,
                        description = COALESCE(EXCLUDED.description, work_translations.description)
                `, [work.id, titleEs || work.title, description.es || null]);
            }

            if (titleEs) report.titles++;
            if (description.en || description.es) report.descriptions++;
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    console.log(`Spanish titles saved: ${report.titles}`);
    console.log(`Own descriptions saved: ${report.descriptions}`);
    if (report.notFound.length > 0) {
        console.log(`Not in the catalog (check the title is EXACTLY as in seed-books.csv): ${report.notFound.length}`);
        report.notFound.forEach((title) => console.log(`  - ${title}`));
    }
    if (report.repeated.length > 0) {
        console.log(`More than one book with this title, skipped: ${report.repeated.length}`);
        report.repeated.forEach((title) => console.log(`  - ${title}`));
    }
}

main()
    .catch((error) => {
        console.error('Import failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
