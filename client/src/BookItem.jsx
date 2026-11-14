import { useState } from 'react'
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import BookModal from './BookModal';
import Icon from './Icon';
import ReviewText from './ReviewText';

function BookItem({ book, onLike, onUpdate, onToggleFavorite, readOnly }) {
    const { t } = useTranslation();
    const [showDetail, setShowDetail] = useState(false)
    const [coverFailed, setCoverFailed] = useState(false)

    const hasRealCover = book.coverImage && book.coverImage.startsWith('http') && !coverFailed

    return (
        <>
            <div className="card book-card">
                {!readOnly && (
                    <button
                        className={`cover-heart ${book.isFavorite ? 'is-favorite' : ''}`}
                        onClick={() => onToggleFavorite(book.id, book.isFavorite)}
                        aria-label={book.isFavorite ? t('book.removeFavorite') : t('book.addFavorite')}
                    >
                        <Icon name="favorites" size={16} filled={book.isFavorite} />
                    </button>
                )}

                <Link to={`/book/${book.bookId}`} className="book-cover-link" aria-label={book.title}>
                    {hasRealCover ? (
                        <img className="book-cover book-cover-image" src={book.coverImage} alt={book.title} onError={() => setCoverFailed(true)} />
                    ) : (
                        <div className="book-cover">
                            <span className="book-cover-icon"><Icon name="reading" size={30} /></span>
                        </div>
                    )}
                </Link>

                <h2 className="display book-title">
                    <Link to={`/book/${book.bookId}`} className="book-title-link">{book.title}</Link>
                </h2>
                <p className="book-author">{book.author}</p>

                <div className="book-meta">
                    <span className={`pill book-status status-${book.status}`}>{t(`status.${book.status}`, { defaultValue: book.status })}</span>
                    {book.status !== 'want-to-read' && (
                        <span className="progress-label">{t('book.complete', { percent: book.progress })}</span>
                    )}
                </div>

                {book.description && (
                    <p className="book-description">{book.description}</p>
                )}

                {book.review && (
                    <ReviewText text={book.review} isSpoiler={book.reviewIsSpoiler} className="book-review" />
                )}

                {!readOnly && (
                    <button className="read-more update-reading" onClick={() => setShowDetail(true)}>
                        <Icon name="pencil" size={14} />
                        {t('book.updateReading')}
                    </button>
                )}

                <div className="book-footer">
                    <button
                        className="like-button"
                        onClick={() => onLike(book.id, book.hasLiked)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span className="like-button-icon"><Icon name="favorites" size={16} filled={book.hasLiked} /></span>
                        {book.likeCount}
                    </button>

                    <span className="comment-count">
                        {t('book.comments', { count: book.commentCount })}
                    </span>
                </div>
            </div>

            {showDetail && (
                <BookModal
                    book={book}
                    onClose={() => setShowDetail(false)}
                    onUpdate={onUpdate}
                />
            )}
        </>
    )
}

export default BookItem