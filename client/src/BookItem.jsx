import { useState } from 'react'
import BookModal, { statusLabels } from './BookModal';

function BookItem({ book, onLike, onUpdate, onToggleFavorite }) {
    const [showDetail, setShowDetail] = useState(false)
    const [coverFailed, setCoverFailed] = useState(false)

    const hasRealCover = book.coverImage && book.coverImage.startsWith('http') && !coverFailed

    return (
        <>
            <div className="card book-card">
                <button
                    className={`cover-heart ${book.isFavorite ? 'is-favorite' : ''}`}
                    onClick={() => onToggleFavorite(book.id, book.isFavorite)}
                    aria-label={book.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24"
                        fill={book.isFavorite ? 'currentColor' : 'none'}
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />
                    </svg>
                </button>

                {hasRealCover ? (
                    <img className="book-cover book-cover-image" src={book.coverImage} alt={book.title} onError={() => setCoverFailed(true)} />
                ) : (
                    <div className="book-cover">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 5c2-1 5-1.5 8-.5v14c-3-1-6-.5-8 .5V5z"></path>
                            <path d="M22 5c-2-1-5-1.5-8-.5v14c3-1 6-.5 8 .5V5z"></path>
                        </svg>
                    </div>
                )}

                <h2 className="display book-title">{book.title}</h2>
                <p className="book-author">{book.author}</p>

                <div className="book-meta">
                    <span className={`pill book-status status-${book.status}`}>{statusLabels[book.status] || book.status}</span>
                    {book.status !== 'want-to-read' && (
                        <span className="progress-label">{book.progress}% complete</span>
                    )}
                </div>

                {book.description && (
                    <p className="book-description">{book.description}</p>
                )}

                {book.review && (
                    <p className="book-review">{book.review}</p>
                )}

                <button className="read-more" onClick={() => setShowDetail(true)}>
                    Read more
                </button>

                <div className="book-footer">
                    <button
                        className="like-button"
                        onClick={() => onLike(book.id, book.hasLiked === 1)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <svg
                            width="16" height="16" viewBox="0 0 24 24"
                            fill={book.hasLiked === 1 ? 'var(--rose)' : 'none'}
                            stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <path d="M12 20.5C12 20.5 4 15.7 4 9.9 4 7.1 6.1 5 8.8 5c1.6 0 3.1.8 3.9 2.1C13.5 5.8 15 5 16.6 5 19.3 5 21.4 7.1 21.4 9.9 21.4 15.7 12 20.5 12 20.5z"></path>
                        </svg>
                        {book.likeCount}
                    </button>

                    <span className="comment-count">
                        {book.commentCount} {book.commentCount === 1 ? 'comment' : 'comments'}
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