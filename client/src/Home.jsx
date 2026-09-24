import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from './Icon';
import { timeAgo, quoteOfTheDay, sortByLastRead, pageSummary } from './utils';

const QUICK_LINKS = [
    { to: './profile?tab=library', label: 'My Library', icon: 'library' },
    { to: '/profile?tab=favorites', label: 'Favorites', icon: 'favorites' },
    { to: '/profile?tab=reviews', label: 'Reviews', icon: 'reviews' },
    { to: '/profile?tab=following', label: 'Following', icon: 'following' },
]

function ContinueReading({ book }) {
    const [coverFailed, setCoverFailed] = useState(false);
    const hasCover = book.coverImage && book.coverImage.startsWith('http') && !coverFailed;


    return (
        <div className="card continue-card">
            {hasCover ? (
                <img className="continue-cover" src={book.coverImage} alt="" onError={() => setCoverFailed(true)} />
            ) : (
                <div className="continue-cover continue-cover-empty"></div>
            )}

            <div className="continue-info">
                <div className="display continue-title">{book.title}</div>
                <div className="continue-author">{book.author}</div>

                <div className="progress">
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${book.progress || 0}%` }}></div>
                    </div>
                    <div className="progress-label">{book.progress || 0}%</div>
                </div>

                <div className="continue-meta">
                    <Icon name="library" size={15} />
                    <span>{pageSummary(book)}</span>
                </div>

                {book.lastReadAt && (
                    <div className="continue-last">Last read {timeAgo(book.lastReadAt)}</div>
                )}
            </div>
            <Link to="/reading" className="pill continue-button">Continue reading</Link>
        </div>
    );
}

function RecentCard({ book, onAdd }) {
    const [coverFailed, setCoverFailed] = useState(false);
    const hasCover = book.coverImage && book.coverImage.startsWith('http') && !coverFailed;

    return (
        <div className="card recent-card">
            {hasCover ? (
                <img className="recent-cover" src={book.coverImage} alt="" onError={() => setCoverFailed(true)} />
            ) : (
                <div className="recent-cover recent-cover-empty"></div>
            )}

            <div className="display recent-title">{book.title}</div>
            <div className="recent-author">{book.author}</div>

            {book.inLibrary ? (
                <span className="recent-added">In your library</span>
            ) : (
                <button className="recent-add" onClick={() => onAdd(book.id)}>+ Add to library</button>
            )}
        </div>
    );
}

function Home({ books, currentUser, onUpdate }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const q = searchParams.get('q') || '';

    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [recentBooks, setRecentBooks] = useState([]);

    useEffect(() => {
        fetch('http://localhost:3000/api/books/recent', {
            credentials: 'include',
        })

            .then((res) => {
                if (!res.ok) throw new Error('Could not load recent books');
                return res.json();
            })
            .then((data) => setRecentBooks(data))
            .catch((error) => console.error(error));
    }, [books]);

    useEffect(() => {
        if (q.trim() === '') {
            setSearchResults([]);
            setSearchError('');
            return;
        }

        let ignore = false;
        setIsSearching(true);
        setSearchError('');

        fetch(`http://localhost:3000/api/search-books?q=${encodeURIComponent(q)}`)
            .then((res) => {
                if (!res.ok) throw new Error('Search failed');
                return res.json();
            })
            .then((data) => {
                if (!ignore) setSearchResults(data);
            })
            .catch(() => {
                if (!ignore) {
                    setSearchResults([]);
                    setSearchError("We couldn't reach the book catalog. Please try again in a moment.");
                }
            })
            .finally(() => {
                if (!ignore) setIsSearching(false);
            });

        return () => {
            ignore = true;
        };
    }, [q]);

    const handleAddBook = (book) => {
        fetch('http://localhost:3000/api/user-books/from-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                openLibraryKey: book.openLibraryKey,
                title: book.title,
                author: book.author,
                coverImage: book.coverImage,
            }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Could not add book');
                onUpdate();
            })
            .catch(() => {
                setSearchError("We couldn't add that book. Please try again.");
            });
    };

    const handleAddToLibrary = (bookId) => {
        fetch('http://localhost:3000/api/user-books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ bookId }),
        })

            .then((res) => {
                if (!res.ok) throw new Error('Could not add book');
                onUpdate();
            })
            .catch((error) => console.error(error));
    };

    const alreadyAddedKeys = books.map((b) => b.openLibraryKey);
    const readingBooks = books.filter((book) => book.status === 'reading');
    const continueBook = sortByLastRead(readingBooks)[0];
    const thisYear = String(new Date().getFullYear());
    const booksThisYear = books.filter(
        (book) => book.status === 'finished' && book.finishedAt?.startsWith(thisYear)).length;
    const goal = currentUser.readingGoal;
    const goalPercent = goal ? Math.min(100, Math.round((booksThisYear * 100) / goal)) : 0;
    const quote = quoteOfTheDay();

    return (
        <main className="page home">
            <div className="home-main">
                <section className="home-hero">
                    <div className="display home-hero-welcome">Welcome, {currentUser.displayName}</div>
                    <h1 className="display home-hero-title">Good books,<br />better days</h1>
                    <p className="home-hero-text">Another chapter, another great day.</p>
                </section>

                {q && (
                    <section className="card home-search">
                        <div className="home-search-head">
                            <div className="section-label">Results for "{q}"</div>
                            <button className="home-search-clear" onClick={() => setSearchParams({})}>
                                Clear
                            </button>
                        </div>

                        {isSearching && <div className="search-empty">Searching...</div>}
                        {searchError && <div className="search-empty">{searchError}</div>}
                        {!isSearching && !searchError && searchResults.length === 0 && (
                            <div className="search-empty">No books found.</div>
                        )}

                        {!isSearching && searchResults.map((book) => (
                            <div key={book.openLibraryKey} className="search-result">
                                {book.coverImage ? (
                                    <img className="search-cover" src={book.coverImage} alt={book.title} />
                                ) : (
                                    <div className="search-cover search-cover-empty"></div>
                                )}

                                <div className="search-info">
                                    <div className="search-title">{book.title}</div>
                                    <div className="search-author">
                                        {book.author}{book.year ? ` · ${book.year}` : ''}
                                    </div>
                                </div>

                                {alreadyAddedKeys.includes(book.openLibraryKey) ? (
                                    <span className="search-added">Added</span>
                                ) : (
                                    <button className="comment-button" onClick={() => handleAddBook(book)}>Add</button>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                <section className="home-section">
                    <div className="home-section-head">
                        <h2 className="display home-section-title">Continue Reading</h2>
                        <Link to="/reading" className="home-section-link">View all →</Link>
                    </div>

                    {continueBook ? (
                        <ContinueReading key={continueBook.id} book={continueBook} />
                    ) : (
                        <div className="card home-empty">
                            Nothing on your nightstand yet. Search for a book to get started.
                        </div>
                    )}
                </section>
                <section className="home-section">
                    <div className="home-section-head">
                        <h2 className="display home-section-title">Recently Added</h2>
                        <span className="home-section-note">New in the community</span>
                    </div>

                    {recentBooks.length === 0 ? (
                        <div className="card home-empty">No books in the catalog yet.</div>
                    ) : (
                        <div className="recent-row">
                            {recentBooks.map((book) => (
                                <RecentCard key={book.id} book={book} onAdd={handleAddToLibrary} />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <aside className="home-side">
                <div className="card home-card">
                    <div className="home-card-head">
                        <Icon name="reading" size={18} />
                        <h3 className="display home-card-title">Current goal</h3>
                    </div>

                    {goal ? (
                        <>
                            <div className="progress">
                                <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${goalPercent}%` }}></div>
                                </div>
                                <div className="progress-label">{booksThisYear}/{goal}</div>
                            </div>
                            <div className="home-muted">Books this year</div>
                        </>
                    ) : (
                        <Link to="/profile/edit" className="home-goal-link">Set a reading goal for this year →</Link>
                    )}

                    <div className="home-note">
                        <Icon name="sparkle" size={14} />
                        Small steps still move you forward.
                    </div>
                </div>

                <div className="card home-card">
                    <div className="home-card-head">
                        <Icon name="sparkle" size={18} />
                        <h3 className="display home-card-title">Today's motivation</h3>
                    </div>
                    <p className="display home-quote">"{quote.text}"</p>
                    <div className="home-muted">— {quote.author}</div>
                </div>

                <div className="card home-card">
                    <h3 className="display home-card-title">Quick access</h3>
                    <nav className="home-links">
                        {QUICK_LINKS.map((link) => (
                            <Link key={link.to} to={link.to} className="home-link">
                                <Icon name={link.icon} size={17} />
                                <span>{link.label}</span>
                                <span className="home-link-arrow">›</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="home-cozy">
                    <span className="display">Just one more chapter...</span>
                    <Icon name="favorites" size={16} />
                </div>
            </aside>
        </main>
    );
}

export default Home