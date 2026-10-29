import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import ReportButton from './ReportButton';
import { apiFetch } from './api';
import { getAvatarSrc, timeAgo } from './utils';

const COMMENT_MAX = 1000;

function ReviewComments({ reviewId, onCountChange }) {
    const { t } = useTranslation();
    const [comments, setComments] = useState(null);
    const [text, setText] = useState('');
    const [error, setError] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/user-books/${reviewId}/comments`)
            .then((data) => {
                if (!ignore) setComments(data);
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [reviewId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const cleanText = text.trim();
        if (cleanText === '' || isSending) return;

        setIsSending(true);
        setError('');
        apiFetch(`/api/user-books/${reviewId}/comments`, { method: 'POST', body: { text: cleanText } })
            .then((comment) => {
                const updated = [comment, ...(comments || [])];
                setComments(updated);
                onCountChange(updated.length);
                setText('');
            })
            .catch((err) => setError(err.message))
            .finally(() => setIsSending(false));
    };

    return (
        <div className="post-comments">
            {comments === null && !error && (
                <p className="post-comments-empty">{t('posts.loadingComments')}</p>
            )}

            {comments && comments.length === 0 && (
                <p className="post-comments-empty">{t('posts.noComments')}</p>
            )}

            {comments && comments.map((comment) => (
                <div key={comment.id} className="post-comment">
                    <img className="post-comment-avatar" src={getAvatarSrc(comment.avatarUrl)} alt="" />

                    <div className="post-comment-body">
                        <div className="post-comment-head">
                            <Link to={`/u/${comment.username}`} className="post-comment-author">{comment.displayName}</Link>
                            <span className="post-comment-date">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="post-comment-text">{comment.text}</p>
                    </div>

                    <ReportButton targetType="review_comment" targetId={comment.id} />
                </div>
            ))}

            {error && <Notice message={error} />}

            <form className="post-comment-form" onSubmit={handleSubmit}>
                <input
                    className="post-comment-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('posts.writeComment')}
                    aria-label={t('posts.writeComment')}
                    maxLength={COMMENT_MAX}
                />
                <button type="submit" className="post-comment-send" disabled={text.trim() === '' || isSending}>
                    {t('posts.send')}
                </button>
            </form>
        </div>
    );
}

export default ReviewComments