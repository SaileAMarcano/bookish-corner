import { useState, useEffect } from 'react'
import { pagePercent } from './utils';

const statusLabels = {
    'want-to-read': 'Want to read',
    'reading': 'Reading',
    'finished': 'Finished'
}
const GENRES = [
    'Fantasy',
    'Romance',
    'Dark Romance',
    'Contemporary',
    'Classics',
    'Mystery',
    'Sci-fi',
    'Horror',
    'Historical',
    'Non-fiction',
    'Poetry',
    'Manga',
    'Comics',
];

const toNumber = (value) => (value === '' ? undefined : Number(value));

function BookItem({ book, onLike, onUpdate, onToggleFavorite }) {
    const [comments, setComments] = useState([])
    const [commentText, setCommentText] = useState('')
    const [showDetail, setShowDetail] = useState(false)
    const [review, setReview] = useState(book.review || '')
    const [status, setStatus] = useState(book.status || 'reading')
    const [currentPage, setCurrentPage] = useState(book.currentPage ?? '')
    const [totalPages, setTotalPages] = useState(book.totalPages ?? '')
    const [currentChapter, setCurrentChapter] = useState(book.currentChapter ?? '')
    const [isSavingProgress, setIsSavingProgress] = useState(false)
    const [genre, setGenre] = useState(book.genre || '')
    const [isSaving, setIsSaving] = useState(false)
    const [isEditingReview, setIsEditingReview] = useState(false)
    const [coverFailed, setCoverFailed] = useState(false)

    useEffect(() => {
        fetch(`http://localhost:3000/api/user-books/${book.id}/comments`)
            .then((res) => res.json())
            .then((data) => setComments(data))
    }, [book.id])

    const handleAddComment = () => {
        if (commentText.trim() === '') return

        fetch(`http://localhost:3000/api/user-books/${book.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ text: commentText }),
        })
            .then((res) => res.json())
            .then((newComment) => {
                setComments((prevComments) => [newComment, ...prevComments])
                setCommentText('')
            })
    }

    const handleSaveReview = () => {
        setIsSaving(true)

        fetch(`http://localhost:3000/api/user-books/${book.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                review: review,
                status: status,
                genre: genre || null,
            }),
        })

            .then((res) => {
                if (!res.ok) throw new Error('Could bit save')
                return res.json()
            })
            .then(() => {
                setIsSaving(false)
                setIsEditingReview(false)
                onUpdate()
            })
            .catch(() => {
                setIsSaving(false)
            })
    }

    const handleSaveProgress = () => {
        setIsSavingProgress(true)

        fetch(`http://localhost:3000/api/user-books/${book.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                currentPage: toNumber(currentPage),
                totalPages: toNumber(totalPages),
                currentChapter: toNumber(currentChapter),
            }),
        })

            .then((res) => {
                if (!res.ok) throw new Error('Could not save progress')
                return res.json()
            })

            .then(() => onUpdate())
            .catch((error) => console.error(error))
            .finally(() => setIsSavingProgress(false))
    }

    let pageError = ''
    if (totalPages !== '' && Number(totalPages) < 1) {
        pageError = 'Total pages must be at least 1.'
    } else if (currentPage !== '' && totalPages !== '' && Number(currentPage) > Number(totalPages)) {
        pageError = "Your current page can't be higher than the total."
    }

    const pagesPercent = pagePercent(Number(currentPage), Number(totalPages))
    const livePercent = book.status === 'finished' ? 100 : (pagesPercent ?? book.progress ?? 0)

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
                        {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                    </span>
                </div>
            </div>

            {showDetail && (
                <div className="modal-overlay" onClick={() => setShowDetail(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-body">
                            <button
                                className="drawer-close"
                                onClick={() => setShowDetail(false)}
                                aria-label="Close"
                            >
                                <svg
                                    width="14" height="14" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor"
                                    strokeWidth="2.5" strokeLinecap="round"
                                >
                                    <line x1="5" y1="5" x2="19" y2="19" />
                                    <line x1="19" y1="5" x2="5" y2="19" />
                                </svg>
                            </button>

                            <div className="modal-header">
                                {hasRealCover ? (
                                    <img className="modal-cover" src={book.coverImage} alt={book.title} />
                                ) : (
                                    <div className="modal-cover"></div>
                                )}

                                <div className="modal-heading">
                                    <h2 className="display modal-title">{book.title}</h2>
                                    <div className="modal-author">{book.author}</div>
                                </div>
                            </div>

                            <p className="modal-description">{book.description}</p>
                            <div className="progress-block">
                                <div className="section-label">Reading progress</div>

                                <div className="progress-fields">
                                    <label className="progress-field">Current page
                                        <input className="progress-input" type="number" min="0" value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} />
                                    </label>

                                    <label className="progress-field">Total pages
                                        <input className="progress-input" type="number" min="1" value={totalPages} onChange={(e) => setTotalPages(e.target.value)} />
                                    </label>

                                    <label className="progress-field">Chapter (optional)
                                        <input className="progress-input" type="number" min="0" value={currentChapter} onChange={(e) => setCurrentChapter(e.target.value)} />
                                    </label>
                                </div>

                                <div className="progress">
                                    <div className="progress-track">
                                        <div className="progress-fill" style={{ width: `${livePercent}%` }}></div>
                                    </div>
                                    <div className="progress-label">{livePercent}%</div>
                                </div>

                                {pageError && <div className="progress-error">{pageError}</div>}

                                <button className="comment-button" onClick={handleSaveProgress} disabled={isSavingProgress || pageError !== ''}>

                                    {isSavingProgress ? 'Saving...' : 'Save progress'}
                                </button>
                            </div>

                            <div className="review-block">
                                <div className="review-head">
                                    <div className="section-label">Your review</div>

                                    {book.review && !isEditingReview && (
                                        <button
                                            className="read-more"
                                            onClick={() => setIsEditingReview(true)}
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>

                                {book.review && !isEditingReview ? (
                                    <>
                                        <p className="modal-review">{book.review}</p>

                                        <div className="book-meta">
                                            <span className={`pill book-status status-${book.status}`}>
                                                {statusLabels[book.status] || book.status}
                                            </span>
                                            {book.status !== 'want-to-read' && (
                                                <span className="progress-label">{book.progress}% complete</span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <textarea
                                            className="profile-textarea"
                                            value={review}
                                            onChange={(e) => setReview(e.target.value)}
                                            placeholder="What did you think of this book?"
                                        />

                                        <div className="review-controls">
                                            <select
                                                className="review-select"
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value)}
                                            >
                                                <option value="want-to-read">Want to read</option>
                                                <option value="reading">Reading</option>
                                                <option value="finished">Finished</option>
                                            </select>

                                            <select
                                                className="review-select"
                                                value={genre}
                                                onChange={(e) => setGenre(e.target.value)}
                                            >
                                                <option value="">Genre…</option>
                                                {GENRES.map((g) => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>

                                            <button
                                                className="comment-button"
                                                onClick={handleSaveReview}
                                                disabled={isSaving}
                                            >
                                                {isSaving ? 'Saving...' : 'Save'}
                                            </button>

                                            {book.review && (
                                                <button
                                                    className="ghost-button"
                                                    onClick={() => {
                                                        setReview(book.review)
                                                        setStatus(book.status)
                                                        setGenre(book.genre || '')
                                                        setIsEditingReview(false)
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="comment-form">
                                <input
                                    className="comment-input"
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Write a comment..."
                                />
                                <button className="comment-button" onClick={handleAddComment}>Comment</button>
                            </div>

                            <ul className="comment-list">
                                {comments.map((comment) => (
                                    <li key={comment.id} className="comment-item">
                                        <div className="comment-head">
                                            <span className="comment-author">{comment.username}</span>
                                            <span className="comment-date">
                                                {new Date(comment.createdAt + 'Z').toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                        {comment.text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default BookItem