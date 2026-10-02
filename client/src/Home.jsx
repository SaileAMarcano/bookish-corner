import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { timeAgo, quoteOfTheDay, sortByLastRead, pageSummary, nightstandMessage } from './utils';
import { apiFetch } from './api';
import BookModal from './BookModal';
import Notice from './Notice';
import BookCover from './BookCover';

const QUICK_LINKS = [
    { to: '/profile?tab=library', label: 'nav.library', icon: 'library' },
    { to: '/profile?tab=favorites', label: 'nav.favorites', icon: 'favorites' },
    { to: '/profile?tab=reviews', label: 'nav.reviews', icon: 'reviews' },
    { to: '/profile?tab=following', label: 'nav.following', icon: 'following' },
]

function ContinueReading({ book, onOpen }) {
    const { t } = useTranslation();

    return (
        <div className="card continue-card">
            <BookCover src={book.coverImage} className="continue-cover" />

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
                    <div className="continue-last">{t('home.lastRead', { time: timeAgo(book.lastReadAt) })}</div>
                )}
            </div>
            <button type="button" className="pill continue-button" onClick={onOpen}>
                {t('home.updateProgress')}
            </button>
        </div>
    );
}

function RecentCard({ book, onAdd }) {
    const { t } = useTranslation();

    return (
        <div className="card recent-card">
            <BookCover src={book.coverImage} className="recent-cover" />

            <div className="display recent-title">{book.title}</div>
            <div className="recent-author">{book.author}</div>

            {book.inLibrary ? (
                <span className="recent-added">{t('home.inLibrary')}</span>
            ) : (
                <button className="recent-add" onClick={() => onAdd(book.id)}>{t('home.addToLibrary')}</button>
            )}
        </div>
    );
}

function Home({ books, currentUser, onUpdate, onError, booksStatus }) {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const q = searchParams.get('q') || '';

    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [recentBooks, setRecentBooks] = useState([]);
    const [recentError, setRecentError] = useState('');

    useEffect(() => {
        apiFetch('/api/books/recent')
            .then((data) => {
                setRecentBooks(data);
                setRecentError('');
            })
            .catch((error) => setRecentError(error.message));
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

        apiFetch(`/api/search-books?q=${encodeURIComponent(q)}`)
            .then((data) => {
                if (!ignore) setSearchResults(data);
            })
            .catch((error) => {
                if (!ignore) {
                    setSearchResults([]);
                    setSearchError(error.message);
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
        apiFetch('/api/user-books/from-search', {
            method: 'POST',
            body: {
                openLibraryKey: book.openLibraryKey,
                title: book.title,
                author: book.author,
                coverImage: book.coverImage,
            },
        })
            .then(() => onUpdate())
            .catch((error) => onError(error.message));
    };

    const handleAddToLibrary = (bookId) => {
        apiFetch('/api/user-books', { method: 'POST', body: { bookId } })
            .then(() => onUpdate())
            .catch((error) => onError(error.message));
    };

    const alreadyAddedKeys = books.map((b) => b.openLibraryKey);
    const readingBooks = books.filter((book) => book.status === 'reading');
    const continueBook = sortByLastRead(readingBooks)[0];
    const [selectedId, setSelectedId] = useState(null);
    const selectedBook = books.find((book) => book.id === selectedId);
    const thisYear = String(new Date().getFullYear());
    const booksThisYear = books.filter(
        (book) => book.status === 'finished' && book.finishedAt?.startsWith(thisYear)).length;
    const goal = currentUser.readingGoal;
    const goalPercent = goal ? Math.min(100, Math.round((booksThisYear * 100) / goal)) : 0;
    const quote = quoteOfTheDay();
    const emptyMessage = nightstandMessage(booksStatus, books);

    return (
        <main className="page home">
            <div className="home-main">
                <section className="home-hero">
                    <div className="display home-hero-welcome">{t('home.welcome', { name: currentUser.displayName })}</div>
                    <h1 className="display home-hero-title">{t('home.heroLine1')}<br />{t('home.heroLine2')}</h1>
                    <p className="home-hero-text">{t('home.heroText')}</p>
                </section>

                {q && (
                    <section className="card home-search">
                        <div className="home-search-head">
                            <div className="section-label">{t('home.resultsFor', { q })}</div>
                            <button className="home-search-clear" onClick={() => setSearchParams({})}>
                                {t('home.clear')}
                            </button>
                        </div>

                        {isSearching && <div className="search-empty">{t('home.searching')}</div>}
                        {searchError && <div className="search-empty">{searchError}</div>}
                        {!isSearching && !searchError && searchResults.length === 0 && (
                            <div className="search-empty">{t('home.noBooks')}</div>
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
                                    <span className="search-added">{t('home.added')}</span>
                                ) : (
                                    <button className="comment-button" onClick={() => handleAddBook(book)}>{t('home.add')}</button>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                <section className="home-section">
                    <div className="home-section-head">
                        <h2 className="display home-section-title">{t('home.continueReading')}</h2>
                        <Link to="/reading" className="home-section-link">{t('common.viewAll')}</Link>
                    </div>

                    {continueBook ? (
                        <ContinueReading key={continueBook.id} book={continueBook} onOpen={() => setSelectedId(continueBook.id)} />
                    ) : (
                        emptyMessage && <div className="card home-empty">{emptyMessage}</div>
                    )}
                </section>
                <section className="home-section">
                    <div className="home-section-head">
                        <h2 className="display home-section-title">{t('home.recentlyAdded')}</h2>
                        <span className="home-section-note">{t('home.newInCommunity')}</span>
                    </div>

                    {recentError && <Notice message={recentError} />}

                    {!recentError && recentBooks.length === 0 && (
                        <div className="card home-empty">{t('home.noCatalog')}</div>
                    )}

                    {recentBooks.length > 0 && (
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
                        <h3 className="display home-card-title">{t('home.currentGoal')}</h3>
                    </div>

                    {goal ? (
                        <>
                            <div className="progress">
                                <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${goalPercent}%` }}></div>
                                </div>
                                <div className="progress-label">{booksThisYear}/{goal}</div>
                            </div>
                            <div className="home-muted">{t('home.booksThisYear')}</div>
                        </>
                    ) : (
                        <Link to="/profile/edit" className="home-goal-link">{t('home.setGoal')}</Link>
                    )}

                    <div className="home-note">
                        <Icon name="sparkle" size={14} />
                        {t('home.smallSteps')}
                    </div>
                </div>

                <div className="card home-card">
                    <div className="home-card-head">
                        <Icon name="sparkle" size={18} />
                        <h3 className="display home-card-title">{t('home.motivation')}</h3>
                    </div>
                    <p className="display home-quote">"{quote.text}"</p>
                    <div className="home-muted">— {quote.author}</div>
                </div>

                <div className="card home-card">
                    <h3 className="display home-card-title">{t('home.quickAccess')}</h3>
                    <nav className="home-links">
                        {QUICK_LINKS.map((link) => (
                            <Link key={link.to} to={link.to} className="home-link">
                                <Icon name={link.icon} size={17} />
                                <span>{t(link.label)}</span>
                                <span className="home-link-arrow">›</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="home-cozy">
                    <span className="display">{t('home.cozy')}</span>
                    <Icon name="favorites" size={16} />
                </div>
            </aside>
            {selectedBook && (<BookModal book={selectedBook} onClose={() => setSelectedId(null)}
                onUpdate={onUpdate}
            />
            )}
        </main>
    );
}

export default Home