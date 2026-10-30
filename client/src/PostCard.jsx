import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import BookCover from './BookCover';
import Notice from './Notice';
import PostComments from './PostComments';
import PostComposer from './PostComposer';
import SpotifyPlayer from './SpotifyPlayer';
import ReportButton from './ReportButton';
import { apiFetch } from './api';
import { getAvatarSrc, timeAgo } from './utils';

function PostCard({ post, currentUserId, onChange, onDeleted, activeTag, showPinned, onPinChange, books = [], openComments = false }) {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [showComments, setShowComments] = useState(openComments);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showSpoiler, setShowSpoiler] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const isOwner = post.userId === currentUserId;
    const hidesContent = post.isSpoiler && (post.text || post.imageUrl);
    const isHidden = hidesContent && !showSpoiler;

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

    const handlePin = () => {
        setError('');
        apiFetch(`/api/posts/${post.id}/pin`, { method: post.isPinned ? 'DELETE' : 'POST' })
            .then((state) => onPinChange(post.id, state.isPinned))
            .catch((err) => setError(err.message));
    };

    const handleSaved = (updatedPost) => {
        onChange(post.id, updatedPost);
        setIsEditing(false);
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
        <article className={`card post-card ${showPinned && post.isPinned ? 'post-card-pinned' : ''}`}>
            {showPinned && post.isPinned && (
                <div className="pinned-sheet" aria-hidden="true">
                    <div className="pinned-sheet-top"></div>
                    <div className="pinned-sheet-middle"></div>
                    <div className="pinned-sheet-bottom"></div>
                </div>
            )}
            {showPinned && post.isPinned && (
                <div className="post-pinned">
                    <Icon name="pin" size={14} />
                    {t('posts.pinned')}
                </div>
            )}
            <header className="post-head">
                <img className="post-avatar" src={getAvatarSrc(post.avatarUrl)} alt="" />
                <div>
                    <Link to={`/u/${post.username}`} className="post-author">{post.displayName}</Link>
                    <div className="post-date">
                        {timeAgo(post.createdAt)}
                        {post.editedAt && <span className="post-edited"> · {t('posts.edited')}</span>}
                    </div>
                </div>

                {isOwner && onPinChange && (
                    <button
                        type="button"
                        className={`post-pin ${post.isPinned ? 'active' : ''}`}
                        onClick={handlePin}
                        aria-pressed={post.isPinned}
                        aria-label={post.isPinned ? t('posts.unpin') : t('posts.pin')}
                        title={post.isPinned ? t('posts.unpin') : t('posts.pin')}
                    >
                        <Icon name="pin" />
                    </button>
                )}

                {isOwner && !isEditing && (
                    <button
                        type="button"
                        className="post-edit"
                        onClick={() => setIsEditing(true)}
                        aria-label={t('posts.editPost')}
                        title={t('posts.editPost')}
                    >
                        <Icon name="pencil" />
                    </button>
                )}

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

                {!isOwner && <ReportButton targetType="post" targetId={post.id} />}
            </header>

            {
                confirmDelete && (
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
                )
            }

            {
                isEditing && (
                    <PostComposer books={books} post={post} onSaved={handleSaved} onCancel={() => setIsEditing(false)} />
                )
            }

            {
                !isEditing && (<>

                    {hidesContent && showSpoiler && (
                        <button type="button" className="post-spoiler-hide" onClick={() => setShowSpoiler(false)}>
                            <Icon name="eyeOff" size={14} />
                            {t('posts.spoilerHide')}
                        </button>
                    )}

                    <div className={`post-spoiler ${isHidden ? 'hidden' : ''}`}>
                        <div className="post-spoiler-content" inert={isHidden}>
                            {post.text && <p className="post-text">{post.text}</p>}

                            {post.imageUrl && <img className="post-image" src={post.imageUrl} alt="" />}
                        </div>

                        {isHidden && (
                            <button type="button" className="post-spoiler-cover" onClick={() => setShowSpoiler(true)}>
                                <Icon name="eye" />
                                <span className="post-spoiler-title">{t('posts.spoilerWarning')}</span>
                                <span className="post-spoiler-hint">{t('posts.spoilerReveal')}</span>
                            </button>
                        )}
                    </div>

                    {post.books.length > 0 && (
                        <div className="post-books">
                            {post.books.map((book) => (
                                <Link key={book.id} to={`/book/${book.id}`} className="post-book book-link">
                                    <BookCover src={book.coverImage} className="post-book-cover" />
                                    <div className="post-book-info">
                                        <div className="display post-book-title">{book.title}</div>
                                        <div className="post-book-author">{book.author}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )
                    }

                    {post.spotifyUrl && <SpotifyPlayer url={post.spotifyUrl} />}
                    {error && <Notice message={error} />}

                    {
                        post.tags.length > 0 && (
                            <div className="post-tags">
                                {post.tags.map((tag) => (
                                    <Link
                                        key={tag.slug}
                                        to={`/tagged/${tag.slug}`}
                                        className={`pill post-tag ${tag.slug === activeTag ? 'active' : ''}`}
                                    >
                                        #{tag.name}
                                    </Link>
                                ))}
                            </div>
                        )
                    }

                </>)
            }

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

            {
                showComments && (
                    <PostComments
                        post={post}
                        currentUserId={currentUserId}
                        onCountChange={(count) => onChange(post.id, { commentCount: count })}
                    />
                )
            }
        </article >
    );
}

export default PostCard