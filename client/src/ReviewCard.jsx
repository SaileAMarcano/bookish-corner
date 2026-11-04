import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Icon from './Icon';
import Notice from './Notice';
import ReportButton from './ReportButton';
import ReviewComments from './ReviewComments';
import ReviewText from './ReviewText';
import StarRating from './StarRating';
import { apiFetch } from './api';
import { getAvatarSrc, timeAgo } from './utils';

function ReviewCard({ review, onChange, onEdit }) {
    const { t } = useTranslation();
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [liking, setLiking] = useState(false);
    const [error, setError] = useState('');

    const handleLike = async () => {
        if (liking || review.isMine) return;
        setLiking(true);
        setError('');
        try {
            await apiFetch(`/api/user-books/${review.id}/like`, { method: review.hasLiked ? 'DELETE' : 'POST' });
            onChange(review.id, { hasLiked: !review.hasLiked, likeCount: Math.max(0, review.likeCount + (review.hasLiked ? -1 : 1)) });
        } catch (err) { setError(err.message); }
        finally { setLiking(false); }
    };

    return (
        <article className="card community-review">
            <header className="community-review-reader">
                <Link to={`/u/${review.username}`}><img className="search-avatar" src={getAvatarSrc(review.avatarUrl)} alt="" /></Link>
                <div><Link to={`/u/${review.username}`} className="post-author">{review.displayName}</Link><span className="post-date">{timeAgo(review.reviewUpdatedAt)}</span></div>
                {review.isMine && onEdit && <button className="review-edit-button" type="button" onClick={() => onEdit(review.id)}><Icon name="feather" size={15} />{t('reviewsPage.edit')}</button>}
            </header>
            <div className="community-review-book">
                <Link to={`/book/${review.bookId}`} aria-label={review.title}>
                    <BookCover src={review.coverImage} className="community-review-cover" title={review.title} author={review.author} bookId={review.bookId} />
                </Link>
                <div><Link className="display community-review-title" to={`/book/${review.bookId}`}>{review.title}</Link><p>{review.author}</p><StarRating value={review.rating} size={18} /></div>
            </div>
            <ReviewText text={review.review} isSpoiler={review.reviewIsSpoiler} className="community-review-text" />
            {error && <Notice message={error} />}
            <footer className="post-actions">
                <button type="button" className={`post-action ${review.hasLiked ? 'active' : ''}`} aria-pressed={review.hasLiked} onClick={handleLike} disabled={review.isMine || liking}>
                    <Icon name="sparkle" />{t('posts.like')} ({review.likeCount})
                </button>
                <button type="button" className="post-action" aria-expanded={commentsOpen} onClick={() => setCommentsOpen(!commentsOpen)}><Icon name="comment" />{t('book.comments', { count: review.commentCount })}</button>
                {!review.isMine && <ReportButton targetType="review" targetId={review.id} />}
            </footer>
            {commentsOpen && <ReviewComments reviewId={review.id} onCountChange={(count) => onChange(review.id, { commentCount: count })} />}
        </article>
    );
}

export default ReviewCard;
