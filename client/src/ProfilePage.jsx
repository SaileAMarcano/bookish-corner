import { useState, useEffect } from 'react'
import BookItem from './BookItem';
import { Link } from 'react-router-dom'
import Icon from './Icon';

const TABS = [
    { key: 'library', label: 'My Library' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'about', label: 'About me' },
    { key: 'posts', label: 'Posts' },
    { key: 'following', label: 'Following' },
];

const THING_ICONS = [
    <path d="M5 8h11v5.5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16 9.5h1.5a2.5 2.5 0 0 1 0 5H16" />,
    <path d="M6 4h8l4 4v12H6z M14 4v4h4" />,
    <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />,
    <path d="M12 3l2 6.6L20 12l-6 2.4L12 21l-2-6.6L4 12l6-2.4z" />,
];

function FavoriteCard({ book, onToggleFavorite }) {
    const [coverFailed, setCoverFailed] = useState(false);
    const hasCover =
        book.coverImage && book.coverImage.startsWith('http') && !coverFailed;

    return (
        <div className="fav-card">
            {hasCover ? (
                <img
                    className="fav-cover"
                    src={book.coverImage}
                    alt=""
                    onError={() => setCoverFailed(true)}
                />
            ) : (
                <div className="fav-cover fav-cover-empty"></div>
            )}

            {book.genre && <span className="pill fav-genre">{book.genre}</span>}

            <div className="fav-title">{book.title}</div>

            <div className="fav-foot">
                <span className="fav-author">{book.author}</span>
                <button
                    className="fav-heart"
                    onClick={() => onToggleFavorite(book.id, book.isFavorite)}
                    aria-label="Remove from favorites"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

function ProfilePage({ books, onLike, onUpdate, onToggleFavorite }) {
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('library');

    useEffect(() => {
        fetch('http://localhost:3000/api/profile', {
            credentials: 'include',
        })
            .then((res) => res.json())
            .then((data) => setProfile(data));
    }, []);

    if (!profile) {
        return (
            <main className="page">
                <div className="section-label">Loading profile...</div>
            </main>
        );
    }

    const renderBookGrid = (list, emptyText) => {
        if (list.length === 0) {
            return <div className="card profile-empty">{emptyText}</div>;
        }

        return (
            <div className="grid">
                {list.map((book) => (
                    <BookItem key={book.id} book={book} onLike={onLike} onUpdate={onUpdate} />
                ))}
            </div>
        );
    };

    const renderTabContent = () => {
        if (activeTab === 'library') {
            return renderBookGrid(
                books,
                'No books yet. Search for one from the home page to get started.'
            );
        }

        if (activeTab === 'reviews') {
            const reviewed = books.filter(
                (book) => book.review && book.review.trim() !== ''
            );

            return renderBookGrid(
                reviewed,
                "No reviews yet. Open a book from your library and write what you thought."
            );
        }

        if (activeTab === 'favorites') {
            const favorites = books.filter((book) => book.isFavorite);
            const genres = [...new Set(favorites.map((book) => book.genre).filter(Boolean))];
            const authors = [...new Set(favorites.map((book) => book.author).filter(Boolean))];

            return (
                <div className="profile-fav-layout">
                    <div className="card profile-about">
                        <h2 className="display profile-about-title">My favorites</h2>
                        <p className="profile-about-lead">Books I never get tired of recommending</p>

                        {favorites.length === 0 ? (
                            <p className="profile-about-empty">
                                No favorites yet. Tap the heart on any book cover to add it here.
                            </p>
                        ) : (
                            <div className="fav-row">
                                {favorites.map((book) => (
                                    <FavoriteCard key={book.id} book={book} onToggleFavorite={onToggleFavorite}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card profile-side">
                        <h3 className="display profile-side-title">Favorite genres</h3>
                        {genres.length === 0 ? (
                            <p className="profile-about-empty">Pick a genre when you edit a review.</p>
                        ) : (
                            <ul className="fav-dot-list">
                                {genres.map((genre) => (
                                    <li key={genre}>{genre}</li>
                                ))}
                            </ul>
                        )}

                        <h3 className="display profile-side-title fav-second-title">Favorite authors</h3>
                        {authors.length === 0 ? (
                            <p className="profile-about-empty">Nothing yet.</p>
                        ) : (
                            <div className="fav-author-list">
                                {authors.map((author) => (
                                    <div key={author}>{author}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (activeTab === 'about') {
            const things = (profile.favoriteThings || '')
                .split('\n')
                .map((thing) => thing.trim())
                .filter((thing) => thing !== '');

            const currentBook = books.find((book) => book.status === 'reading');
            const hasCover =
                currentBook && currentBook.coverImage && currentBook.coverImage.startsWith('http');

            return (
                <div className="profile-columns">
                    <div className="card profile-about">
                        <h2 className="display profile-about-title">About {profile.displayName}</h2>
                        {profile.bio && <p className="profile-about-lead">{profile.bio}</p>}

                        {profile.aboutMe ? (
                            <p className="profile-about-text">{profile.aboutMe}</p>
                        ) : (
                            <p className="profile-about-text profile-about-empty">
                                Nothing here yet. Use "Edit profile" to introduce yourself.
                            </p>
                        )}

                        {profile.favoriteQuote && (
                            <div className="profile-quote">
                                <div className="profile-quote-label">Favorite quote from a book</div>
                                <p className="profile-quote-text">{profile.favoriteQuote}</p>
                            </div>
                        )}
                    </div>

                    <div className="card profile-things">
                        <h3 className="display profile-side-title">A few favorite things</h3>

                        {things.length === 0 ? (
                            <p className="profile-about-empty">Nothing added yet.</p>
                        ) : (
                            <ul className="profile-things-list">
                                {things.map((thing, index) => (
                                    <li key={index}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" strokeWidth="1.6"
                                            strokeLinecap="round" strokeLinejoin="round">
                                            {THING_ICONS[index % THING_ICONS.length]}
                                        </svg>
                                        {thing}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {currentBook && (
                            <div className="profile-now">
                                <div className="profile-now-label">Currently reading</div>
                                <div className="profile-now-title">{currentBook.title}</div>
                                <div className="profile-now-author">{currentBook.author}</div>
                            </div>
                        )}
                    </div>

                    <div className="card profile-side">
                        {hasCover && (
                            <img className="profile-side-cover" src={currentBook.coverImage} alt="" />
                        )}
                        <h3 className="display profile-side-title">Bookish at heart</h3>
                        <div className="profile-side-line">{profile.booksRead} books read</div>
                        <div className="profile-side-line">{profile.reviewsCount} reviews shared</div>
                        <div className="profile-side-line">
                            {profile.currentlyReading} books on the nightstand
                        </div>
                    </div>
                </div>
            );
        }

        return <div className="card profile-empty">Coming soon.</div>
    }

    const avatarSrc = profile.avatarUrl
        ? `http://localhost:3000${profile.avatarUrl}`
        : '/default-avatar.png';

    return (
        <main className="page profile-view">
            <div className="profile-banner">
                <img className="profile-banner-image" src="/default-banner.png" alt="" />
            </div>

            <div className="card profile-view-card">
                <div className="profile-view-avatar">
                    <img src={avatarSrc} alt="" />
                </div>

                <div className="profile-info">
                    <h1 className="display profile-name">{profile.displayName}</h1>
                    <div className="profile-username">@{profile.username}</div>

                    {profile.bio && <p className="profile-bio">{profile.bio}</p>}

                    <div className="profile-stats">
                        <div className="profile-stat">
                            <div className="profile-stat-number">{profile.booksRead}</div>
                            <div className="profile-stat-label">Books read</div>
                        </div>
                        <div className="profile-stat">
                            <div className="profile-stat-number">{profile.reviewsCount}</div>
                            <div className="profile-stat-label">Reviews</div>
                        </div>
                        <div className="profile-stat">
                            <div className="profile-stat-number">{profile.currentlyReading}</div>
                            <div className="profile-stat-label">Currently reading</div>
                        </div>
                    </div>
                </div>

                <Link to="/profile/edit" className="profile-edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                    Edit profile
                </Link>
            </div>

            <div className="card profile-tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        className={`profile-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <Icon name={tab.key} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {renderTabContent()}
        </main>
    );
}

export default ProfilePage