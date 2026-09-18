import { useState, useEffect } from 'react'

const statusLabels = {
    'want-to-read': 'Want to read',
    'reading': 'Reading',
    'finished': 'Finished'
}

function BookItem({ book, onLike, onUpdate }) {
    const [comments, setComments] = useState([])
    const [commentText, setCommentText] = useState('')
    const [showDetail, setShowDetail] = useState(false)
    const [review, setReview] = useState(book.review || '')
    const [status, setStatus] = useState(book.status || 'reading')
    const [progress, setProgress] = useState(book.progress || 0)
    const [isSaving, setIsSaving] = useState(false)
    const [isEditingReview, setIsEditingReview] = useState(false)

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
                progress: Number(progress),
            }),
        })

            .then((res) => res.json())
            .then(() => {
                setIsSaving(false)
                setIsEditingReview(false)
                onUpdate()
            })
    }

    const hasRealCover = book.coverImage && book.coverImage.startsWith('http')

    return (
        <>
            <div className="card book-card">
                {hasRealCover ? (
                    <img className="book-cover book-cover-image" src={book.coverImage} alt={book.title} />
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

                                            <div className="review-progress">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={progress}
                                                    onChange={(e) => setProgress(e.target.value)}
                                                />
                                                <span className="progress-label">{progress}%</span>
                                            </div>

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
                                                        setProgress(book.progress)
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