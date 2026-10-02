import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BookModal from './BookModal';
import Icon from './Icon';
import BookCover from './BookCover';
import { timeAgo, formatDate, sortByLastRead, pageSummary, nightstandMessage, genreLabel } from './utils';

function FeaturedBook({ book, onOpen }) {
    const { t } = useTranslation();
    const progress = book.progress || 0;

    return (
        <section className="card reading-featured">
            <div className="reading-featured-book">
                <BookCover src={book.coverImage} className="reading-featured-cover" />

                <div className="reading-featured-info">
                    <h2 className="display reading-featured-title">{book.title}</h2>
                    <div className="reading-featured-author">{t('reading.by', { author: book.author })}</div>
                    {book.genre && <span className="pill reading-genre">{genreLabel(book.genre)}</span>}
                    {book.description && <p className="reading-description">"{book.description}"</p>}
                </div>
            </div>

            <div className="reading-featured-progress">
                <div className="reading-progress-label">{t('reading.progress')}</div>

                <div className="progress">
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="progress-label">{progress}%</div>
                </div>

                <ul className="reading-facts">
                    <li>
                        <Icon name="library" size={16} />
                        {pageSummary(book)}
                    </li>
                    {book.startedAt && (
                        <li>
                            <Icon name="reading" size={16} />
                            {t('reading.startedOn', { date: formatDate(book.startedAt) })}
                        </li>
                    )}
                    {book.lastReadAt && (
                        <li>
                            <Icon name="sparkle" size={16} />
                            {t('home.lastRead', { time: timeAgo(book.lastReadAt) })}
                        </li>
                    )}
                </ul>
                <button type="button" className="pill reading-add reading-update" onClick={onOpen}>
                    {t('home.updateProgress')}
                </button>
            </div>
        </section>
    );
}

function ProgressCard({ book, onOpen }) {
    const { t } = useTranslation();
    const progress = book.progress || 0;

    return (
        <div className="card recent-card">
            <BookCover src={book.coverImage} className="recent-cover" />
            <div className="display recent-title">{book.title}</div>
            <div className="recent-author">{book.author}</div>

            <div className="progress reading-card-progress">
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="progress-label">{progress}%</div>
            </div>
            <button type="button" className="read-more reading-card-open" onClick={onOpen}>
                {t('home.updateProgress')}
            </button>
        </div>
    );
}

function ReadingPage({ books, onUpdate, booksStatus }) {
    const { t } = useTranslation();
    const readingBooks = sortByLastRead(books.filter((book) => book.status === 'reading'));
    const [featured, ...others] = readingBooks;
    const [selectedId, setSelectId] = useState(null);
    const selectedBook = books.find((book) => book.id === selectedId);
    const emptyMessage = nightstandMessage(booksStatus, books);

    const focusSearch = () => {
        document.querySelector('.topbar-search input')?.focus();
    };

    return (
        <main className="page reading-page">
            <section className="card reading-head">
                <div>
                    <h1 className="display reading-title">{t('reading.title')}</h1>
                    <p className="reading-lead">{t('reading.lead')}</p>
                </div>
                <button className="pill reading-add" onClick={focusSearch}>{t('reading.addBook')}</button>
            </section>
            {!featured ? (
                emptyMessage && <div className="card home-empty">{emptyMessage}</div>
            ) : (
                <>
                    <FeaturedBook key={featured.id} book={featured} onOpen={() => setSelectId(featured.id)} />

                    {others.length > 0 && (
                        <section className="home-section">
                            <h2 className="display home-section-title">{t('reading.otherBooks')}</h2>
                            <div className="recent-row">
                                {others.map((book) => (
                                    <ProgressCard key={book.id} book={book} onOpen={() => setSelectId(book.id)} />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
            {selectedBook && (
                <BookModal
                    book={selectedBook}
                    onClose={() => setSelectId(null)}
                    onUpdate={onUpdate}
                />
            )}
        </main>
    );
}

export default ReadingPage