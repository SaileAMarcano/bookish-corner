import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import BookCover from './BookCover';
import Notice from './Notice';
import StarRating from './StarRating';
import ReviewComments from './ReviewComments';
import { apiFetch } from './api';
import { getAvatarSrc, timeAgo } from './utils';

const KIND_ICONS = {
    finished: 'check',
    progress: 'library',
    started: 'reading',
};

function ActivityCard({ activity, currentUserId, onChange }) {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [showComments, setShowComments] = useState(false);

    const isOwner = activity.userId === currentUserId;
    const bookLink = `/book/${activity.bookId}`;

    const handleLike = () => {
        setError('');
        apiFetch(`/api/user-books/${activity.id}/like`, { method: activity.hasLiked ? 'DELETE' : 'POST' })
            .then(() =>
                onChange(activity.id, {
                    hasLiked: !activity.hasLiked,
                    likeCount: activity.likeCount + (activity.hasLiked ? -1 : 1),
                })
            )
            .catch((err) => setError(err.message));
    };

    return (
        <article className="card post-card activity-card">
            <header className="post-head">
                <img className="post-avatar" src={getAvatarSrc(activity.avatarUrl)} alt="" />
                <div>
                    <Link to={`/u/${activity.username}`} className="post-author">{activity.displayName}</Link>
                    <div className="post-date">{timeAgo(activity.happenedAt)}</div>
                </div>
            </header>

            <div className="activity-kind">
                <Icon name={KIND_ICONS[activity.kind]} size={16} />
                {t(`activity.${activity.kind}`)}
            </div>

            <div className="activity-book">
                <Link to={bookLink} className="activity-cover-link">
                    <BookCover src={activity.coverImage} className="activity-cover" />
                </Link>

                <div className="activity-info">
                    <Link to={bookLink} className="display activity-title">{activity.title}</Link>
                    <div className="activity-author">{activity.author}</div>

                    {activity.kind === 'finished' && activity.rating > 0 && (
                        <StarRating value={activity.rating} size={16} />
                    )}

                    {activity.kind === 'finished' && activity.review && (
                        <p className="activity-text">{activity.review}</p>
                    )}

                    {activity.kind === 'progress' && activity.totalPages && (
                        <div className="progress activity-progress">
                            <span className="activity-pages">
                                {t('library.pages', { current: activity.currentPage || 0, total: activity.totalPages })}
                            </span>
                            <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${activity.progress}%` }}></div>
                            </div>
                            <div className="progress-label">{activity.progress}%</div>
                        </div>
                    )}

                    {activity.kind === 'progress' && !activity.totalPages && activity.currentPage > 0 && (
                        <span className="activity-pages">{t('activity.page', { page: activity.currentPage })}</span>
                    )}

                    {activity.kind === 'progress' && activity.progressNote && (
                        <p className="activity-text activity-note">{activity.progressNote}</p>
                    )}
                </div>
            </div>

            {error && <Notice message={error} />}

            <footer className="post-actions">
                <button
                    type="button"
                    className={`post-action ${activity.hasLiked ? 'active' : ''}`}
                    onClick={handleLike}
                    aria-pressed={activity.hasLiked}
                    disabled={isOwner}
                >
                    <Icon name="favorites" />
                    {t('posts.like')} ({activity.likeCount})
                </button>

                <button
                    type="button"
                    className={`post-action ${showComments ? 'open' : ''}`}
                    onClick={() => setShowComments(!showComments)}
                    aria-expanded={showComments}
                >
                    <Icon name="comment" />
                    {t('posts.comment')} ({activity.commentCount})
                </button>
            </footer>

            {showComments && (
                <ReviewComments
                    reviewId={activity.id}
                    onCountChange={(count) => onChange(activity.id, { commentCount: count })}
                />
            )}
        </article>
    );
}

export default ActivityCard