import { useState, useEffect } from 'react'
import BookItem from './BookItem';
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { apiFetch } from './api';
import { getAvatarSrc, genreLabel } from './utils';
import Notice from './Notice';
import BookCover from './BookCover';
import PostCard from './PostCard';

const TABS = [
    { key: 'library' },
    { key: 'reviews' },
    { key: 'favorites' },
    { key: 'about' },
    { key: 'posts' },
    { key: 'following' },
];

const THING_ICONS = [
    <path d="M5 8h11v5.5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16 9.5h1.5a2.5 2.5 0 0 1 0 5H16" />,
    <path d="M6 4h8l4 4v12H6z M14 4v4h4" />,
    <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />,
    <path d="M12 3l2 6.6L20 12l-6 2.4L12 21l-2-6.6L4 12l6-2.4z" />,
];

function FavoriteCard({ book, onToggleFavorite }) {
    const { t } = useTranslation();

    return (
        <div className="fav-card">

            <BookCover src={book.coverImage} className="fav-cover" />

            {book.genre && <span className="pill fav-genre">{genreLabel(book.genre)}</span>}

            <div className="fav-title">{book.title}</div>

            <div className="fav-foot">
                <span className="fav-author">{book.author}</span>
                <button
                    className="fav-heart"
                    onClick={() => onToggleFavorite(book.id, book.isFavorite)}
                    aria-label={t('book.removeFavorite')}
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
    const { t, i18n } = useTranslation();
    const [profile, setProfile] = useState(null);
    const [profileError, setProfileError] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'library';
    const [posts, setPosts] = useState(null);
    const [postsError, setPostsError] = useState('');

    const loadProfile = () => {
        setProfileError('');
        apiFetch('/api/profile')
            .then((data) => setProfile(data))
            .catch((error) => setProfileError(error.message));
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const loadPosts = () => {
        setPostsError('');
        apiFetch('/api/posts')
            .then((data) => setPosts(data))
            .catch((error) => setPostsError(error.message));
    };

    useEffect(() => {
        loadPosts();
    }, [i18n.language]);

    const handlePostChange = (postId, changes) => {
        setPosts((current) =>
            current.map((post) => (post.id === postId ? { ...post, ...changes } : post))
        );
    };

    if (profileError) {
        return (
            <main className="page">
                <Notice message={profileError} onRetry={loadProfile} />
            </main>
        );
    }

    if (!profile) {
        return (
            <main className="page">
                <div className="section-label">{t('profile.loading')}</div>
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
                    <BookItem key={book.id} book={book} onLike={onLike} onUpdate={onUpdate} onToggleFavorite={onToggleFavorite} />
                ))}
            </div>
        );
    };

    const renderTabContent = () => {
        if (activeTab === 'library') {
            return renderBookGrid(
                books,
                t('profile.emptyLibrary')
            );
        }

        if (activeTab === 'reviews') {
            const reviewed = books.filter(
                (book) => book.review && book.review.trim() !== ''
            );

            return renderBookGrid(
                reviewed,
                t('profile.emptyReviews')
            );
        }

        if (activeTab === 'favorites') {
            const favorites = books.filter((book) => book.isFavorite);
            const genres = [...new Set(favorites.map((book) => book.genre).filter(Boolean))];
            const authors = [...new Set(favorites.map((book) => book.author).filter(Boolean))];

            return (
                <div className="profile-fav-layout">
                    <div className="card profile-about">
                        <h2 className="display profile-about-title">{t('profile.myFavorites')}</h2>
                        <p className="profile-about-lead">{t('profile.favoritesLead')}</p>

                        {favorites.length === 0 ? (
                            <p className="profile-about-empty">
                                {t('profile.noFavorites')}
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
                        <h3 className="display profile-side-title">{t('profile.favoriteGenres')}</h3>
                        {genres.length === 0 ? (
                            <p className="profile-about-empty">{t('profile.pickGenre')}</p>
                        ) : (
                            <ul className="fav-dot-list">
                                {genres.map((genre) => (
                                    <li key={genre}>{genreLabel(genre)}</li>
                                ))}
                            </ul>
                        )}

                        <h3 className="display profile-side-title fav-second-title">{t('profile.favoriteAuthors')}</h3>
                        {authors.length === 0 ? (
                            <p className="profile-about-empty">{t('profile.nothingYet')}</p>
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

            return (
                <div className="profile-columns">
                    <div className="card profile-about">
                        <h2 className="display profile-about-title">{t('profile.aboutTitle', { name: profile.displayName })}</h2>
                        {profile.bio && <p className="profile-about-lead">{profile.bio}</p>}

                        {profile.aboutMe ? (
                            <p className="profile-about-text">{profile.aboutMe}</p>
                        ) : (
                            <p className="profile-about-text profile-about-empty">
                                {t('profile.aboutEmpty')}
                            </p>
                        )}

                        {profile.favoriteQuote && (
                            <div className="profile-quote">
                                <div className="profile-quote-label">{t('profile.favoriteQuote')}</div>
                                <p className="profile-quote-text">{profile.favoriteQuote}</p>
                            </div>
                        )}
                    </div>

                    <div className="card profile-things">
                        <h3 className="display profile-side-title">{t('profile.favoriteThings')}</h3>

                        {things.length === 0 ? (
                            <p className="profile-about-empty">{t('profile.nothingAdded')}</p>
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
                                <div className="profile-now-label">{t('profile.currentlyReading')}</div>
                                <div className="profile-now-title">{currentBook.title}</div>
                                <div className="profile-now-author">{currentBook.author}</div>
                            </div>
                        )}
                    </div>

                    <div className="card profile-side">
                        <img className="profile-side-cover" src="/bookish-shelf.jpg" alt="" />
                        <h3 className="display profile-side-title">{t('profile.bookishAtHeart')}</h3>
                        <div className="profile-side-line">{t('profile.booksRead', { count: profile.booksRead })}</div>
                        <div className="profile-side-line">{t('profile.reviewsShared', { count: profile.reviewsCount })}</div>
                        <div className="profile-side-line">
                            {t('profile.nightstand', { count: profile.currentlyReading })}
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'posts') {
            if (postsError) {
                return <Notice message={postsError} onRetry={loadPosts} />;
            }
            if (posts === null) {
                return <div className="card profile-empty">{t('posts.loading')}</div>;
            }
            if (posts.length === 0) {
                return <div className="card profile-empty">{t('posts.empty')}</div>;
            }

            return (
                <div className="post-list">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} onChange={handlePostChange} />
                    ))}
                </div>
            );
        }


        return <div className="card profile-empty">{t('profile.comingSoon')}</div>
    }

    const avatarSrc = getAvatarSrc(profile.avatarUrl);

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
                            <div className="profile-stat-label">{t('profile.statBooksRead')}</div>
                        </div>
                        <div className="profile-stat">
                            <div className="profile-stat-number">{profile.reviewsCount}</div>
                            <div className="profile-stat-label">{t('profile.statReviews')}</div>
                        </div>
                        <div className="profile-stat">
                            <div className="profile-stat-number">{profile.currentlyReading}</div>
                            <div className="profile-stat-label">{t('profile.statReading')}</div>
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
                    {t('profile.editProfile')}
                </Link>
            </div>

            <div className="card profile-tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        className={`profile-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setSearchParams({ tab: tab.key })}
                    >
                        <Icon name={tab.key} />
                        {t(`profile.tabs.${tab.key}`)}
                    </button>
                ))}
            </div>

            {renderTabContent()}
        </main>
    );
}

export default ProfilePage