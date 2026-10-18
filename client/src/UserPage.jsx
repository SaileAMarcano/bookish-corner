import { useState, useEffect } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookItem from './BookItem';
import PostCard from './PostCard';
import Notice from './Notice';
import ProfileHeader from './ProfileHeader';
import ProfileTabs, { PROFILE_TABS } from './ProfileTabs';
import ProfileBooks from './ProfileBooks';
import FollowList from './FollowList';
import { apiFetch } from './api';

const TABS = [...PROFILE_TABS, 'following'];

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
            return (
                <ProfileBooks
                    books={books}
                    emptyText={t('userPage.emptyLibrary', { name })}
                    renderBook={(book) => <BookItem key={book.id} book={book} onLike={handleLike} readOnly />}
                />
            );
        }
        if (activeTab === 'lists') {
            return <div className="card profile-empty">{t('profile.comingSoon')}</div>;
        }
        if (activeTab === 'following') {
            return <FollowList username={profile.username} name={name} />;
        }
        if (activeTab === 'reviews') {
            return renderBooks(books.filter((book) => book.review), t('userPage.emptyReviews', { name }));
        }
        if (activeTab === 'favorites') {
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
        <main className="page profile-view">
            <ProfileHeader profile={profile} onShowFollows={() => setSearchParams({ tab: 'following' })}>
                <button type="button" className={`tag-follow profile-follow ${profile.isFollowing ? 'following' : ''}`} onClick={handleFollow} aria-pressed={profile.isFollowing}>
                    {profile.isFollowing ? t('userPage.followingButton') : t('userPage.follow')}
                </button>
            </ProfileHeader>

            {actionError && <Notice message={actionError} />}

            <ProfileTabs activeTab={activeTab} onChange={(tab) => setSearchParams({ tab })} />

            {renderTabContent()}
        </main>
    );
}

export default UserPage