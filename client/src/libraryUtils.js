export function getReadYear(book) {
    if (book.status !== 'finished' || !book.finishedAt) return null;
    const date = new Date(book.finishedAt);
    return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

export function groupReadBooks(books) {
    const groups = new Map();

    for (const book of books) {
        if (book.status !== 'finished') continue;
        const year = getReadYear(book);
        if (!groups.has(year)) groups.set(year, []);
        groups.get(year).push(book);
    }

    return [...groups]
        .sort(([yearA], [yearB]) => {
            if (yearA === yearB) return 0;
            if (yearA === null) return 1;
            if (yearB === null) return -1;
            return yearB - yearA;
        })
        .map(([year, items]) => ({ year, books: items }));
}

export function getCoverTone(value = '') {
    let hash = 0;
    for (const character of String(value)) {
        hash = (hash * 31 + character.codePointAt(0)) >>> 0;
    }
    return hash % 6;
}