import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import BookModal from './BookModal';
import StarRating from './StarRating';
import Icon from './Icon';
import { nightstandMessage } from './utils';

const STATUS_COUNTERS = ['finished', 'reading', 'want-to-read', 'paused', 'dnf'];

function byRecent(a, b) {
    const dateA = a.lastReadAt || a.createdAt;
    const dateB = b.lastReadAt || b.createdAt;
    return new Date(dateB) - new Date(dateA);
}

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
    const selectedBook = books.find((book) => book.id === selectedId);

    const sorted = [...books].sort(byRecent);
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

            {books.length === 0 ? (
                emptyMessage && <div className="card home-empty">{emptyMessage}</div>
            ) : (
                <div className="library-list">
                    {sorted.map((book) => (
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