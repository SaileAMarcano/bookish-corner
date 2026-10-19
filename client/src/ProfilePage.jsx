import { useState, useEffect } from 'react'
import BookItem from './BookItem';
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';
import { genreLabel, pinnedFirst } from './utils';
import Notice from './Notice';
import BookCover from './BookCover';
import PostCard from './PostCard';
import PostComposer from './PostComposer';
import FollowList from './FollowList';
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import ProfileBooks from './ProfileBooks';
import ProfileAbout from './ProfileAbout';
import ProfileSide from './ProfileSide';


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
    const activeTab = searchParams.get('tab') || 'posts';
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

    const handlePostCreated = (post) => {
        setPosts((current) => [post, ...(current || [])]);
    };

    const handlePinChange = (postId, isPinned) => {
        setPosts((current) =>
            current.map((post) => {
                if (post.id === postId) return { ...post, isPinned };
                return isPinned ? { ...post, isPinned: false } : post;
            })
        );
    };

    const handlePostDeleted = (postId) => {
        setPosts((current) => current.filter((post) => post.id !== postId));
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
            return (
                <ProfileBooks
                    books={books}
                    emptyText={t('profile.emptyLibrary')}
                    renderBook={(book) => (
                        <BookItem key={book.id} book={book} onLike={onLike} onUpdate={onUpdate} onToggleFavorite={onToggleFavorite} />
                    )}
                />
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
            return <ProfileAbout profile={profile} isMe />;
        }

        if (activeTab === 'posts') {
            return (
                <div className="post-list">
                    <PostComposer books={books} onCreated={handlePostCreated} />

                    {postsError && <Notice message={postsError} onRetry={loadPosts} />}

                    {!postsError && posts === null && (
                        <div className="card profile-empty">{t('posts.loading')}</div>
                    )}

                    {posts && posts.length === 0 && (
                        <div className="card profile-empty">{t('posts.empty')}</div>
                    )}

                    {posts && pinnedFirst(posts).map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUserId={profile.id}
                            onChange={handlePostChange}
                            onDeleted={handlePostDeleted}
                            onPinChange={handlePinChange}
                            showPinned
                        />
                    ))}
                </div>
            );
        }

        if (activeTab === 'following') {
            return <FollowList username={profile.username} />;
        }

        return <div className="card profile-empty">{t('profile.comingSoon')}</div>
    }

    return (
        <main className="page profile-view">
            <ProfileHeader profile={profile} onShowFollows={() => setSearchParams({ tab: 'following' })}>
                <Link to="/profile/edit" className="profile-edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                    {t('profile.editProfile')}
                </Link>
            </ProfileHeader>

            <div className="profile-layout">
                <div className="profile-main">
                    <ProfileTabs activeTab={activeTab} onChange={(tab) => setSearchParams({ tab })} />

                    {renderTabContent()}
                </div>

                <ProfileSide books={books} readingGoal={profile.readingGoal} username={profile.username} isMe />
            </div>
        </main >
    );
}

export default ProfilePage