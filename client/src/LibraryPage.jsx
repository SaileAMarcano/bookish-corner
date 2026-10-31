import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import BookModal from './BookModal';
import StarRating from './StarRating';
import Icon from './Icon';
import ReadingNow from './ReadingNow';
import LibraryYearChallenge from './LibraryYearChallenge';
import YearShelf from './YearShelf';
import { nightstandMessage } from './utils';
import { groupReadBooks } from './libraryUtils';

const STATUS_FILTERS = ['all', 'reading', 'want-to-read', 'finished', 'paused', 'dnf'];
const SORTS = ['recent', 'title', 'author', 'rating'];

function byRecent(a, b) {
    return new Date(b.lastReadAt || b.createdAt) - new Date(a.lastReadAt || a.createdAt);
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

function LibraryTile({ book, isSelected, onEdit, onChoose }) {
    const { t } = useTranslation();

    return (
        <article className={`library-grid-tile ${isSelected ? 'selected' : ''}`}>
            <div className="library-grid-cover-wrap">
                <Link to={`/book/${book.bookId}`} className="library-grid-cover-link" aria-label={book.title}>
                    <BookCover
                        src={book.coverImage}
                        className="library-grid-cover"
                        title={book.title}
                        author={book.author}
                        bookId={book.bookId}
                    />
                </Link>
                <span className="library-grid-status">{t(`library.counters.${book.status}`)}</span>
            </div>

            <div className="library-grid-caption">
                <h3 className="display"><Link to={`/book/${book.bookId}`}>{book.title}</Link></h3>
                <button type="button" className="library-grid-more" onClick={onEdit} aria-label={t('library.edit', { title: book.title })}>
                    <Icon name="more" size={18} />
                </button>
            </div>
            <div className="library-grid-author">{book.author}</div>
            {book.rating > 0 && <StarRating value={book.rating} size={15} />}
            {book.status !== 'finished' && book.totalPages > 0 && (
                <small className="library-grid-pages">
                    {t('library.pages', { current: book.currentPage || 0, total: book.totalPages })}
                </small>
            )}
            {book.status !== 'finished' && (
                <button type="button" className="library-grid-update" onClick={onChoose} aria-haspopup="dialog">
                    {t('library.updateThis')}
                </button>
            )}
        </article>
    );
}

function LibraryPage({ books, onUpdate, booksStatus, readingGoal, username }) {
    const { t } = useTranslation();
    const [selectedId, setSelectedId] = useState(null);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [activeId, setActiveId] = useState(null);
    const [view, setView] = useState('grid');
    const selectedBook = books.find((book) => book.id === selectedId);

    function openBook(book) {
        setActiveId(book.id);
        setSelectedId(book.id);
    }

    const counts = books.reduce((totals, book) => {
        totals.all += 1;
        totals[book.status] = (totals[book.status] || 0) + 1;
        return totals;
    }, { all: 0 });
    const words = simplify(search.trim());
    const shown = books
        .filter((book) => status === 'all' || book.status === status)
        .filter((book) => !words || simplify(`${book.title} ${book.author}`).includes(words))
        .sort(SORTERS[sortBy]);
    const otherBooks = shown.filter((book) => book.status !== 'finished');
    const yearGroups = groupReadBooks(shown);
    const currentYear = new Date().getFullYear();
    const finishedThisYear = groupReadBooks(books).find((group) => group.year === currentYear)?.books.length || 0;
    const currentYearBooks = yearGroups.find((group) => group.year === currentYear)?.books || [];
    const pastYearGroups = yearGroups.filter((group) => group.year !== currentYear);
    const emptyMessage = nightstandMessage(booksStatus, books);

    function renderGrid(items) {
        return (
            <div className="library-grid">
                {items.map((book) => (
                    <LibraryTile
                        key={book.id}
                        book={book}
                        isSelected={activeId === book.id}
                        onEdit={() => openBook(book)}
                        onChoose={() => openBook(book)}
                    />
                ))}
            </div>
        );
    }

    return (
        <main className="page library-page">
            <h1 className="display library-heading">{t('nav.library')}</h1>
            <ReadingNow books={books} booksStatus={booksStatus} onOpen={openBook} />

            <div className="library-view-switch" role="group" aria-label={t('library.shelf.viewLabel')}>
                <button type="button" className={'book-filter-chip ' + (view === 'grid' ? 'active' : '')}
                    aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
                    {t('library.shelf.covers')}
                </button>
                <button type="button" className={'book-filter-chip ' + (view === 'shelf' ? 'active' : '')}
                    aria-pressed={view === 'shelf'} onClick={() => setView('shelf')}>
                    {t('library.shelf.title')}
                </button>
            </div>

            {view === 'grid' ? (
                <div className="library-layout">
                    {booksStatus === 'ready' && (
                        <aside className="library-side library-challenge-side" aria-label={t('profileSide.challenge', { year: currentYear })}>
                            <LibraryYearChallenge year={currentYear} count={finishedThisYear} readingGoal={readingGoal} />
                        </aside>
                    )}

                    <div className="library-main">
                        <div className="library-tools">
                            <div className="book-filter library-status-tabs" role="group" aria-label={t('profileBooks.filterLabel')}>
                                {STATUS_FILTERS.map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={`book-filter-chip ${status === key ? 'active' : ''}`}
                                        onClick={() => setStatus(key)}
                                        aria-pressed={status === key}
                                    >
                                        {key === 'all' ? t('profileBooks.all') : t(`library.counters.${key}`)}
                                        <span className="book-filter-count">{counts[key] || 0}</span>
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
                                    {SORTS.map((key) => <option key={key} value={key}>{t(`library.sort.${key}`)}</option>)}
                                </select>
                            </div>
                        </div>

                        {books.length === 0 && emptyMessage && (
                            <div className="card home-empty">{emptyMessage}</div>
                        )}
                        {books.length > 0 && shown.length === 0 && (
                            <div className="card profile-empty">{t('library.noMatches')}</div>
                        )}

                        {otherBooks.length > 0 && (
                            <section className="library-book-group" aria-labelledby="library-current-heading">
                                <h2 className="display library-year-heading" id="library-current-heading">
                                    {status === 'all' ? t('library.onShelf') : t('library.counters.' + status)}
                                    <span>· {t('library.bookCount', { count: otherBooks.length })}</span>
                                </h2>
                                {renderGrid(otherBooks)}
                            </section>
                        )}

                        {currentYearBooks.length > 0 && (
                            <section className="library-book-group" aria-labelledby={'library-read-year-' + currentYear}>
                                <h2 className="display library-year-heading" id={'library-read-year-' + currentYear}>
                                    {currentYear}
                                    <span>· {t('library.bookCount', { count: currentYearBooks.length })}</span>
                                </h2>
                                {renderGrid(currentYearBooks)}
                            </section>
                        )}

                        {pastYearGroups.map(({ year, books: yearBooks }) => (
                            <section className="library-book-group" key={year ?? 'undated'} aria-labelledby={'library-year-' + (year ?? 'undated')}>
                                <h2 className="display library-year-heading" id={'library-year-' + (year ?? 'undated')}>
                                    {year ?? t('library.undated')}
                                    <span>· {t('library.bookCount', { count: yearBooks.length })}</span>
                                </h2>
                                {renderGrid(yearBooks)}
                            </section>
                        ))}
                    </div>
                </div>
            ) : (
                <YearShelf key={username} books={books} booksStatus={booksStatus} readingGoal={readingGoal} username={username} />
            )}

            {selectedBook && <BookModal key={selectedBook.id} book={selectedBook} onClose={() => setSelectedId(null)} onUpdate={onUpdate} />}
        </main>
    );
}

export default LibraryPage;