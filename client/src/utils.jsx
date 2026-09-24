export function parseDbDate(dateString) {
    return new Date(dateString.replace(' ', 'T') + 'Z');
}

export function timeAgo(dateString) {
    if (!dateString) return '';

    const seconds = Math.round((parseDbDate(dateString) - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    const units = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];

    for (const [unit, unitSeconds] of units) {
        if (Math.abs(seconds) >= unitSeconds) {
            return rtf.format(Math.round(seconds / unitSeconds), unit);
        }
    }

    return 'just now';
}

export function formatDate(dateString) {
    if (!dateString) return '';

    return parseDbDate(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function pagePercent(currentPage, totalPages) {
    if (!totalPages || totalPages <= 0) return null;
    return Math.min(100, Math.round(((currentPage || 0) * 100) / totalPages));
}

export const QUOTES = [
    { text: 'I declare after all there is no enjoyment like reading!', author: 'Jane Austen' },
    { text: 'Once you learn to read, you will be forever free.', author: 'Frederick Douglass' },
    { text: 'Reading is to the mind what exercise is to the body.', author: 'Joseph Addison' },
    { text: 'Books are the quietest and most constant of friends.', author: 'Charles W. Eliot' },
    { text: 'A book is a garden, an orchard, a storehouse, a party.', author: 'Henry Ward Beecher' },
    { text: 'A room without books is like a body without a soul.', author: 'Cicero' },
    { text: 'Books are the treasured wealth of the world.', author: 'Henry David Thoreau' },
];

export function quoteOfTheDay() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / 86400000);

    return QUOTES[dayOfYear % QUOTES.length];
}

export function sortByLastRead(books) {
    return [...books].sort((a, b) =>
        (b.lastReadAt || b.createdAt).localeCompare(a.lastReadAt || a.createdAt)
    );
}

export function pageSummary(book) {
    const pages = book.totalPages
        ? `Page ${book.currentPage || 0} of ${book.totalPages}`
        : 'Add the page count to track your progress';
    const chapter = book.currentChapter ? ` · Chapter ${book.currentChapter}` : '';
    return pages + chapter;
}