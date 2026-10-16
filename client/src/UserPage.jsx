import { useState, useEffect } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import BookItem from './BookItem';
import PostCard from './PostCard';
import Notice from './Notice';
import { apiFetch } from './api';
import { getAvatarSrc } from './utils';

const TABS = ['posts', 'library', 'reviews', 'favorites'];

function UserPage({ currentUser }) {
    const { username } = useParams();
    const { t, i18n } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState(null);
    const [books, setBooks] = useState(null);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');

    const activeTab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'posts';
    const base = `/api/users/${encodeURIComponent(username)}`;

    useEffect(() => {
        let ignore = false;

        Promise.all([apiFetch(base), apiFetch(`${base}/posts`), apiFetch(`${base}/books`)])
            .then(([profileData, postsData, booksData]) => {
                if (ignore) return;
                setProfile(profileData);
                setPosts(postsData);
                setBooks(booksData);
                setError('');
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [base, i18n.language]);

    const handleFollow = () => {
        setActionError('');
        apiFetch(`${base}/follow`, { method: profile.isFollowing ? 'DELETE' : 'POST' })
            .then((state) => setProfile((current) => ({ ...current, ...state })))
            .catch((err) => setActionError(err.message));
    };

    const handleLike = (userBookId, alreadyLiked) => {
        setActionError('');
        apiFetch(`/api/user-books/${userBookId}/like`, { method: alreadyLiked ? 'DELETE' : 'POST' })
            .then(() => apiFetch(`${base}/books`))
            .then((data) => setBooks(data))
            .catch((err) => setActionError(err.message));
    };

    const handlePostChange = (postId, changes) => {
        setPosts((current) => current.map((post) => (post.id === postId ? { ...post, ...changes } : post)));
    };

    if (error) {
        return (
            <main className="page">
                <Notice message={error} />
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

    if (profile.isMe) {
        return <Navigate to="/profile?tab=posts" replace />;
    }

    const name = profile.displayName;

    const stas = [
        { number: profile.booksRead, label: t('profile.statBooksRead') },
        { number: profile.reviewsCount, label: t('profile.statReviews') },
        { number: profile.currentlyReading, label: t('profile.statReading') },
        { number: profile.followerCount, label: t('userPage.followers') },
        { number: profile.followingCount, label: t('userPage.followingCount') },
    ];

    const renderBooks = (list, emptyText) => {
        if (list.length === 0) {
            return <div className="card profile-empty">{emptyText}</div>;
        }

        return (
            <div className="grid">
                {list.map((book) => (
                    <BookItem key={book.id} book={book} onLike={handleLike} readOnly />
                ))}
            </div>
        );
    };

    const renderTabContent = () => {
        if (activeTab === 'library') {
            return renderBooks(books, t('userPage.emptyLibrary', { name }));
        }
        if (activeTab === 'reviews') {
            return renderBooks(books.filter((book) => book.isFavorite), t('userPage.emptyFavorites', { name }));
        }

        return (
            <div className="post-list">
                {posts.length === 0 && <div className="card profile-empty"> {t('userPage.emptyPosts', { name })}</div>}

                {posts.map((post) => (
                    <PostCard key={post.id} post={post} currentUserId={currentUser.id} onChange={handlePostChange} onDeleted={() => { }} />
                ))}
            </div>
        );
    };

    return (
        <main classsName="page profile-view">
            <div className="profile-banner">
                <img className="profile-banner-image" src="/default-banner.png" alt="" />
            </div>

            <div className="card profile-view-card">
                <div className="profile-view-avatar">
                    <img src={getAvatarSrc(profile.avatarUrl)} alt="" />
                </div>

                <div className="profile-info">
                    <h1 className="display profile-name">{name}</h1>
                    <div className="profile-username">@{profile.username}</div>

                    {profile.bio && <p className="profile-bio">{profile.bio}</p>}

                    <div className="profile-stats user-stats">
                        {stats.map((stat) => (
                            <div key={stat.label} className="profile-stat">
                                <div className="profile-stat-number">{stat.number}</div>
                                <div className="profile-stat-label">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <button type="button" className={`tag-follow profile-follow ${profile.isFollowing ? 'following' : ''}`} onClick={handleFollow} aria-pressed={profile.isFollowing}>
                    {profile.isFollowing ? t('userPage.followingButton') : t('userPage.follow')}
                </button>
            </div>

            {actionError && <Notice message={actionError} />}

            <div className="card profile-tabs">
                {TABS.map((tab) => (
                    <button key={tab} className={`profile-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setSearchParams({ tab })}>

                        <Icon name={tab} />
                        {t(`userPage.tabs.${tab}`)}
                    </button>
                ))}
            </div>

            {renderTabContent()}
        </main>
    );
}

export default UserPage