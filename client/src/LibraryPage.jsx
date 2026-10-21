import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import BookModal from './BookModal';
import StarRating from './StarRating';
import Icon from './Icon';
import { nightstandMessage } from './utils';

const STATUS_COUNTERS = ['finished', 'reading', 'want-to-read', 'paused', 'dnf'];
const SORTS = ['recent', 'title', 'author', 'rating'];

function byRecent(a, b) {
    const dateA = a.lastReadAt || a.createdAt;
    const dateB = b.lastReadAt || b.createdAt;
    return new Date(dateB) - new Date(dateA);
}

function simplify(text) {
    return (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const SORTERS = {
    recent: byRecent,
    title: (a, b) => a.title.localeCompare(b.title),
    author: (a, b) => (a.author || '').localeCompare(b.author || ''),
    rating: (a, b) => b.rating - a.rating || byRecent(a, b),
};

function LibraryRow({ book, onEdit }) {
    const { t } = useTranslation();
    const percent = book.totalPages ? Math.round(((book.currentPage || 0) * 100) / book.totalPages) : null;
    const shownPercent = book.status === 'finished' ? 100 : percent;

    return (
        <article className="library-row">
            <Link to={`/book/${book.bookId}`} className="library-cover-link">
                <BookCover src={book.coverImage} className="library-cover" />
            </Link>

            <div className="library-info">
                <Link to={`/book/${book.bookId}`} className="display library-title">{book.title}</Link>
                <div className="library-author">{book.author}</div>

                {book.rating > 0 && <StarRating value={book.rating} size={16} />}

                {book.review && <p className="library-review">{book.review}</p>}

                <div className="library-status-row">
                    <span className={`pill book-status status-${book.status}`}>{t(`status.${book.status}`)}</span>

                    {book.totalPages ? (
                        <div className="progress library-progress">
                            <span className="library-pages">
                                {t('library.pages', { current: book.status === 'finished' ? book.totalPages : book.currentPage || 0, total: book.totalPages })}
                            </span>
                            <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${shownPercent}%` }}></div>
                            </div>
                            <div className="progress-label">{shownPercent}%</div>
                        </div>
                    ) : (
                        <span className="library-pages">{t('library.noPages')}</span>
                    )}
                </div>
            </div>

            <button type="button" className="library-more" onClick={onEdit} aria-label={t('library.edit', { title: book.title })}>
                <Icon name="more" size={18} />
            </button>
        </article>
    );
}

function LibraryPage({ books, onUpdate, booksStatus }) {
    const { t } = useTranslation();
    const [selectedId, setSelectedId] = useState(null);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const selectedBook = books.find((book) => book.id === selectedId);

    const words = simplify(search.trim());
    const shown = books
        .filter((book) => status === 'all' || book.status === status)
        .filter((book) => !words || simplify(`${book.title} ${book.author}`).includes(words))
        .sort(SORTERS[sortBy]);
    const emptyMessage = nightstandMessage(booksStatus, books);

    return (
        <main className="page library-page">
            <h1 className="display library-heading">{t('nav.library')}</h1>

            <div className="library-counters">
                {STATUS_COUNTERS.map((status) => (
                    <div key={status} className="library-counter">
                        <div className="library-counter-number">{books.filter((book) => book.status === status).length}</div>
                        <div className="library-counter-label">{t(`library.counters.${status}`)}</div>
                    </div>
                ))}
            </div>

            <div className="library-tools">
                <div className="book-filter" role="group" aria-label={t('profileBooks.filterLabel')}>
                    {['all', ...STATUS_COUNTERS].map((key) => (
                        <button
                            key={key}
                            type="button"
                            className={`book-filter-chip ${status === key ? 'active' : ''}`}
                            onClick={() => setStatus(key)}
                            aria-pressed={status === key}
                        >
                            {key === 'all' ? t('profileBooks.all') : t(`library.counters.${key}`)}
                        </button>
                    ))}
                </div>

                <div className="library-search-sort">
                    <label className="library-search">
                        <Icon name="search" size={16} />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('library.search')}
                            aria-label={t('library.search')}
                        />
                    </label>

                    <select className="library-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label={t('library.sortBy')}>
                        {SORTS.map((key) => (
                            <option key={key} value={key}>{t(`library.sort.${key}`)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {books.length === 0 ? (
                emptyMessage && <div className="card home-empty">{emptyMessage}</div>
            ) : shown.length === 0 ? (
                <div className="card profile-empty">{t('library.noMatches')}</div>
            ) : (
                <div className="library-list">
                    {shown.map((book) => (
                        <LibraryRow key={book.id} book={book} onEdit={() => setSelectedId(book.id)} />
                    ))}
                </div>
            )}

            {selectedBook && (
                <BookModal book={selectedBook} onClose={() => setSelectedId(null)} onUpdate={onUpdate} />
            )}
        </main>
    );
}

export default LibraryPage