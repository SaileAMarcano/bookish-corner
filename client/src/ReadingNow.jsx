import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Icon from './Icon';
import { formatDate, nightstandMessage, pageSummary, sortByLastRead, timeAgo } from './utils';

function ReadingNow({ books, booksStatus, onOpen }) {
    const { t } = useTranslation();
    const readingBooks = sortByLastRead(books.filter((book) => book.status === 'reading'));
    const [featured, ...others] = readingBooks;
    const progress = Math.min(100, Math.max(0, Number(featured?.progress) || 0));
    const emptyMessage = nightstandMessage(booksStatus, books);

    function focusSearch() {
        document.querySelector('.topbar-search input')?.focus();
    }

    return (
        <section className="library-now" id="reading-now" aria-labelledby="library-now-heading">
            <header className="library-now-head">
                <div>
                    <h2 className="display" id="library-now-heading">{t('reading.title')}</h2>
                    {booksStatus === 'ready' && (
                        <p className="library-now-count">{t('reading.count', { count: readingBooks.length })}</p>
                    )}
                </div>
                <button type="button" className="pill reading-add" onClick={focusSearch}>
                    {t('reading.addBook')}
                </button>
            </header>

            {featured ? (
                <>
                    <article className="card library-now-featured">
                        <Link to={`/book/${featured.bookId}`} aria-label={featured.title}>
                            <BookCover src={featured.coverImage} className="library-now-cover" />
                        </Link>

                        <div className="library-now-info">
                            <Link to={`/book/${featured.bookId}`} className="display library-now-title">
                                {featured.title}
                            </Link>
                            <div className="library-now-author">{featured.author}</div>

                            <div className="progress">
                                <div
                                    className="progress-track"
                                    role="progressbar"
                                    aria-label={t('reading.progress')}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={progress}
                                >
                                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="progress-label">{progress}%</div>
                            </div>

                            <ul className="library-now-meta">
                                <li><Icon name="library" size={15} />{pageSummary(featured)}</li>
                                {featured.startedAt && (
                                    <li>{t('reading.startedOn', { date: formatDate(featured.startedAt) })}</li>
                                )}
                                {featured.lastReadAt && (
                                    <li>{t('home.lastRead', { time: timeAgo(featured.lastReadAt) })}</li>
                                )}
                            </ul>
                        </div>

                        <button
                            type="button"
                            className="profile-edit library-now-update"
                            onClick={() => onOpen(featured)}
                        >
                            <Icon name="sparkle" size={16} />
                            {t('home.updateProgress')}
                        </button>
                    </article>

                    {others.length > 0 && (
                        <div className="library-now-others" role="group" aria-label={t('reading.otherBooks')}>
                            {others.map((book) => (
                                <button
                                    key={book.id}
                                    type="button"
                                    className="library-now-other"
                                    onClick={() => onOpen(book)}
                                    aria-label={t('reading.updateBook', { title: book.title })}
                                >
                                    <BookCover src={book.coverImage} className="library-now-small-cover" />
                                    <span>
                                        <strong className="display">{book.title}</strong>
                                        <small>{book.author}</small>
                                        <small>{pageSummary(book)}</small>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                emptyMessage && <div className="card library-now-empty" role="status">{emptyMessage}</div>
            )}
        </section>
    );
}

export default ReadingNow;