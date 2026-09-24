import Icon from './Icon';
import BookCover from './BookCover';
import { timeAgo, formatDate, sortByLastRead, pageSummary } from './utils';

function FeaturedBook({ book }) {
    const progress = book.progress || 0;

    return (
        <section className="card reading-featured">
            <div className="reading-featured-book">
                <BookCover src={book.coverImage} className="reading-featured-cover" />

                <div className="reading-featured-info">
                    <h2 className="display reading-featured-title">{book.title}</h2>
                    <div className="reading-featured-author">by {book.author}</div>
                    {book.genre && <span className="pill reading-genre">{book.genre}</span>}
                    {book.description && <p className="reading-description">"{book.description}"</p>}
                </div>
            </div>

            <div className="reading-featured-progress">
                <div className="reading-progress-label">Reading progress</div>

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
                            Started on {formatDate(book.startedAt)}
                        </li>
                    )}
                    {book.lastReadAt && (
                        <li>
                            <Icon name="sparkle" size={16} />
                            Last read {timeAgo(book.lastReadAt)}
                        </li>
                    )}
                </ul>
            </div>
        </section>
    );
}

function ProgressCard({ book }) {
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
        </div>
    );
}

function ReadingPage({ books }) {
    const readingBooks = sortByLastRead(books.filter((book) => book.status === 'reading'));
    const [featured, ...others] = readingBooks;

    const focusSearch = () => {
        document.querySelector('.topbar-search input')?.focus();
    };

    return (
        <main className="page reading-page">
            <section className="card reading-head">
                <div>
                    <h1 className="display reading-title">Currently Reading</h1>
                    <p className="reading-lead">The books you're reading right now.</p>
                </div>
                <button className="pill reading-add" onClick={focusSearch}>+ Add book</button>
            </section>

            {!featured ? (
                <div className="card home-empty">
                    Nothing on your nightstand yet. Search for a book to get started.
                </div>
            ) : (
                <>
                    <FeaturedBook key={featured.id} book={featured} />

                    {others.length > 0 && (
                        <section className="home-section">
                            <h2 className="display home-section-title">Other books in progress</h2>
                            <div className="recent-row">
                                {others.map((book) => (
                                    <ProgressCard key={book.id} book={book} />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </main>
    );
}

export default ReadingPage