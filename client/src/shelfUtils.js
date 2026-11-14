import { SPINE_COLORS, genreLook } from './shelfSpines';
import { layoutCases } from './bookcases';

export const DECORATIONS = [
    { name: 'candle', milestone: 'first-chapter' },
    { name: 'quill', milestone: 'thoughtful-reader' },
    { name: 'stars', milestone: 'bookworm' },
    { name: 'flowers', milestone: 'genre-wanderer' },
    { name: 'tea', milestone: 'goal-reached' },
];
export const SHELF_POSES = ['upright', 'lean', 'flat'];
export const SPINE_FACES = ['cover', 'solid'];
export const SHELF_TONES = SPINE_COLORS.map((color, index) => index);

const BOOK_SIZES = 5;
const PILE_EVERY = 7;
const PILE_AT = 3;
const PILE_SIZE = 3;

function hashOf(book) {
    let hash = 2166136261;
    for (const character of String(book.bookId || book.title || '')) {
        hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0;
    }
    return hash;
}

function startsPile(index, total) {
    return index % PILE_EVERY === PILE_AT && total - index >= 2;
}

export function bookItem(book, pose = 'upright', tone = null, motif = null, face = null, shelf = null) {
    return { type: 'book', key: 'book-' + book.id, book, pose, tone, motif, face, shelf };
}

export function decorationItem(name, pose = 'upright', shelf = null) {
    return { type: 'decoration', key: 'decoration-' + name, name, pose, shelf };
}

export function autoItems(books) {
    const items = [];
    let previousLeans = false;

    for (let index = 0; index < books.length; index++) {
        const book = books[index];
        const hash = hashOf(book);

        if (startsPile(index, books.length)) {
            const size = books.length - index >= 3 && hash % 2 === 0 ? 3 : 2;
            for (const item of books.slice(index, index + size)) {
                items.push(bookItem(item, 'flat'));
            }
            index += size - 1;
            previousLeans = false;
            continue;
        }

        const nextIsPile = startsPile(index + 1, books.length);
        const leans = index < books.length - 1 && !nextIsPile && !previousLeans && hash % 5 === 0;
        previousLeans = leans;
        items.push(bookItem(book, leans ? 'lean' : 'upright'));
    }

    return items;
}

export function savedItems(books, rows, unlockedNames) {
    const booksById = new Map(books.map((book) => [book.id, book]));
    const placed = new Set();
    const items = [];

    for (const row of rows) {
        if (row.decoration) {
            if (unlockedNames.includes(row.decoration)) items.push(decorationItem(row.decoration, row.pose, row.shelf));
            continue;
        }

        const book = booksById.get(row.userBookId);
        if (book && !placed.has(book.id)) {
            placed.add(book.id);
            items.push(bookItem(book, row.pose, row.tone, row.motif, row.face, row.shelf));
        }
    }

    for (const book of books) {
        if (!placed.has(book.id)) items.push(bookItem(book));
    }

    return items;
}

export function groupItems(items) {
    const groups = [];

    for (const item of items) {
        if (item.type === 'decoration') {
            const last = groups[groups.length - 1];

            if (item.pose === 'flat' && last && last.type === 'pile' && !last.top && last.shelf === item.shelf) {
                last.top = item;
            } else {
                groups.push(item);
            }
            continue;
        }

        const hash = hashOf(item.book);
        const shaped = { ...item, size: (hash >>> 8) % BOOK_SIZES, shape: (hash >>> 4) % 3, look: genreLook(item.book, hash) };

        if (item.pose === 'flat') {
            const flat = shaped;
            const last = groups[groups.length - 1];

            if (last && last.type === 'pile' && !last.top && last.items.length < PILE_SIZE && last.shelf === item.shelf) {
                last.items.push(flat);
            } else {
                groups.push({ type: 'pile', key: 'pile-' + item.key, shelf: item.shelf, items: [flat] });
            }
            continue;
        }

        groups.push(shaped);
    }

    return groups;
}

export function canSitOnPile(items, key) {
    const index = items.findIndex((item) => item.key === key);
    const previous = items[index - 1];
    return index > 0 && previous.type === 'book' && previous.pose === 'flat' && previous.shelf === items[index].shelf;
}

function putOnPile(rest, moving, targetKey) {
    const pile = groupItems(rest).find((group) =>
        group.type === 'pile' && group.items.some((item) => item.key === targetKey)
    );
    const lastKey = pile.items[pile.items.length - 1].key;
    const next = rest.map((item) => (pile.top && item.key === pile.top.key ? { ...item, pose: 'upright' } : item));
    const index = next.findIndex((item) => item.key === lastKey);

    next.splice(index + 1, 0, { ...moving, pose: 'flat', shelf: pile.shelf });
    return next;
}

export function moveItem(items, fromKey, toKey, before) {
    const moving = items.find((item) => item.key === fromKey);
    const rest = items.filter((item) => item.key !== fromKey);
    const index = rest.findIndex((item) => item.key === toKey);

    if (!moving || index < 0) return items;

    const target = rest[index];
    const ontoPile = target.type === 'book' && target.pose === 'flat';

    if (moving.type === 'decoration' && ontoPile) {
        return putOnPile(rest, moving, target.key);
    }

    let dropped = { ...moving, shelf: target.shelf };
    if (moving.type === 'book' && ontoPile) dropped.pose = 'flat';
    if (moving.type === 'decoration') dropped.pose = 'upright';

    rest.splice(before ? index : index + 1, 0, dropped);
    return rest;
}

export function moveBy(items, key, step) {
    const index = items.findIndex((item) => item.key === key);
    const target = index + step;

    if (index < 0 || target < 0 || target >= items.length) return items;

    const next = [...items];
    [next[index], next[target]] = [next[target], { ...next[index], shelf: next[target].shelf }];
    return next;
}

export function moveToShelf(items, key, shelf) {
    const moving = items.find((item) => item.key === key);
    if (!moving) return items;

    const rest = items.filter((item) => item.key !== key);
    const dropped = { ...moving, shelf, pose: moving.type === 'decoration' ? 'upright' : moving.pose };
    let index = rest.length;

    for (let position = rest.length - 1; position >= 0; position--) {
        if ((rest[position].shelf ?? 0) <= shelf) {
            index = position + 1;
            break;
        }
        index = position;
    }

    rest.splice(index, 0, dropped);
    return rest;
}

export function pinShelves(items, model) {
    const shelves = new Map();

    layoutCases(groupItems(items), model).forEach((rows) => {
        rows.forEach((row) => {
            row.groups.forEach((group) => {
                const members = group.type === 'pile' ? [...group.items, ...(group.top ? [group.top] : [])] : [group];
                members.forEach((member) => shelves.set(member.key, row.index));
            });
        });
    });

    return items.map((item) => ({ ...item, shelf: shelves.get(item.key) ?? item.shelf }));
}

export function toPayload(items) {
    return items.map((item) =>
        item.type === 'book'
            ? { bookId: item.book.id, pose: item.pose, tone: item.tone, motif: item.motif, face: item.face, shelf: item.shelf }
            : { decoration: item.name, pose: item.pose === 'flat' ? 'flat' : 'upright', shelf: item.shelf }
    );
}
