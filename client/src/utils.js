import { API_URL } from './api';
import i18n from './i18n';

export function getAvatarSrc(url) {
    if (!url) return '/default-avatar.png';
    return url.startsWith('http') ? url : `${API_URL}${url}`;
}

export function parseDbDate(dateString) {
    return new Date(dateString);
}

export function timeAgo(dateString) {
    if (!dateString) return '';

    const seconds = Math.round((parseDbDate(dateString) - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });

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

    return i18n.t('time.justNow');
}

export function formatDate(dateString) {
    if (!dateString) return '';

    return parseDbDate(dateString).toLocaleDateString(i18n.language, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function pagePercent(currentPage, totalPages) {
    if (!totalPages || totalPages <= 0) return null;
    return Math.min(100, Math.round(((currentPage || 0) * 100) / totalPages));
}

export function quoteOfTheDay() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / 86400000);

    // The quotes live in the translation files, so they change with the language.
    const quotes = i18n.t('quotes', { returnObjects: true });
    return quotes[dayOfYear % quotes.length];
}

export function sortByLastRead(books) {
    return [...books].sort((a, b) =>
        (b.lastReadAt || b.createdAt).localeCompare(a.lastReadAt || a.createdAt)
    );
}

export function pageSummary(book) {
    const pages = book.totalPages
        ? i18n.t('pages.progress', { current: book.currentPage || 0, total: book.totalPages })
        : i18n.t('pages.addCount');
    const chapter = book.currentChapter ? i18n.t('pages.chapter', { chapter: book.currentChapter }) : '';
    return pages + chapter;
}

export function nightstandMessage(booksStatus, books) {
    if (booksStatus === 'loading') return i18n.t('nightstand.loading');
    if (booksStatus === 'error') return '';
    if (books.length === 0) return i18n.t('nightstand.emptyShelf');
    return i18n.t('nightstand.nothing');
}

// Genre label in the current language. The database keeps the English name ("Fantasy").
export function genreLabel(genre) {
    return i18n.t(`genres.${genre}`, { defaultValue: genre });
}
