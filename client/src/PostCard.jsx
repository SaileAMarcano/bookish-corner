import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import BookCover from './BookCover';
import Notice from './Notice';
import { apiFetch } from './api';
import { getAvatarSrc, timeAgo } from './utils';

function PostCard({ post, onChange }) {
    const { t } = useTranslation();
    const [error, setError] = useState('');

    const handleLike = () => {
        setError('');
        apiFetch(`/api/posts/${post.id}/like`, { method: post.hasLiked ? 'DELETE' : 'POST' })
            .then((state) => onChange(post.id, state))
            .catch((err) => setError(err.message));
    };

    const handleSave = () => {
        setError('');
        apiFetch(`/api/posts/${post.id}/save`, { method: post.hasSaved ? 'DELETE' : 'POST' })
            .then((state) => onChange(post.id, state))
            .catch((err) => setError(err.message));
    };

    return (
        <article className="card post-card">
            <header className="post-head">
                <img className="post-avatar" src={getAvatarSrc(post.avatarUrl)} alt="" />
                <div>
                    <div className="post-author">{post.displayName}</div>
                    <div className="post-date">{timeAgo(post.createdAt)}</div>
                </div>
            </header>

            {post.text && <p className="post-text">{post.text}</p>}

            {post.imageUrl && <img className="post-image" src={post.imageUrl} alt="" />}

            {post.books.length > 0 && (
                <div className="post-books">
                    {post.books.map((book) => (
                        <div key={book.id} className="post-book">
                            <BookCover src={book.coverImage} className="post-book-cover" />
                            <div className="post-book-info">
                                <div className="display post-book-title">{book.title}</div>
                                <div className="post-book-author">{book.author}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {error && <Notice message={error} />}

            <footer className="post-actions">
                <button
                    type="button"
                    className={`post-action ${post.hasLiked ? 'active' : ''}`}
                    onClick={handleLike}
                    aria-pressed={post.hasLiked}
                >
                    <Icon name="favorites" />
                    {t('posts.like')} ({post.likeCount})
                </button>

                <span className="post-action">
                    <Icon name="comment" />
                    {t('posts.comment')} ({post.commentCount})
                </span>

                <button
                    type="button"
                    className={`post-action ${post.hasSaved ? 'active' : ''}`}
                    onClick={handleSave}
                    aria-pressed={post.hasSaved}
                >
                    <Icon name="bookmark" />
                    {post.hasSaved ? t('posts.saved') : t('posts.save')}
                </button>
            </footer>
        </article>
    );
}

export default PostCard