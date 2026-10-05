import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import BookCover from './BookCover';
import Notice from './Notice';
import PostComments from './PostComments';
import { apiFetch } from './api';
import { getAvatarSrc, timeAgo } from './utils';

function PostCard({ post, currentUserId, onChange, onDeleted }) {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [showComments, setShowComments] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isOwner = post.userId === currentUserId;

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

    const handleDelete = () => {
        setError('');
        apiFetch(`/api/posts/${post.id}`, { method: 'DELETE' })
            .then(() => onDeleted(post.id))
            .catch((err) => {
                setError(err.message);
                setConfirmDelete(false);
            });
    };

    return (
        <article className="card post-card">
            <header className="post-head">
                <img className="post-avatar" src={getAvatarSrc(post.avatarUrl)} alt="" />
                <div>
                    <div className="post-author">{post.displayName}</div>
                    <div className="post-date">{timeAgo(post.createdAt)}</div>
                </div>

                {isOwner && (
                    <button
                        type="button"
                        className="post-delete"
                        onClick={() => setConfirmDelete(true)}
                        aria-label={t('posts.deletePost')}
                        title={t('posts.deletePost')}
                    >
                        <Icon name="trash" />
                    </button>
                )}
            </header>

            {confirmDelete && (
                <div className="post-confirm" role="alert">
                    <p>{t('posts.confirmDelete')}</p>
                    <div className="post-confirm-actions">
                        <button type="button" className="post-confirm-cancel" onClick={() => setConfirmDelete(false)}>
                            {t('common.cancel')}
                        </button>
                        <button type="button" className="post-confirm-delete" onClick={handleDelete}>
                            {t('posts.delete')}
                        </button>
                    </div>
                </div>
            )}

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

            {post.tags.length > 0 && (
                <div className="post-tags">
                    {post.tags.map((tag) => (
                        <span key={tag.slug} className="pill post-tag">#{tag.name}</span>
                    ))}
                </div>
            )}

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

                <button
                    type="button"
                    className={`post-action ${showComments ? 'open' : ''}`}
                    onClick={() => setShowComments(!showComments)}
                    aria-expanded={showComments}
                >
                    <Icon name="comment" />
                    {t('posts.comment')} ({post.commentCount})
                </button>

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

            {showComments && (
                <PostComments
                    post={post}
                    currentUserId={currentUserId}
                    onCountChange={(count) => onChange(post.id, { commentCount: count })}
                />
            )}
        </article>
    );
}

export default PostCard