import { useState, useEffect } from 'react';
import BookCover from './BookCover';
import { pagePercent } from './utils';
import { apiFetch } from './api';
import Notice from './Notice';

export const statusLabels = {
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

function BookModal({ book, onClose, onUpdate }) {
    const [comments, setComments] = useState([])
    const [commentText, setCommentText] = useState('')
    const [review, setReview] = useState(book.review || '')
    const [status, setStatus] = useState(book.status || 'reading')
    const [currentPage, setCurrentPage] = useState(book.currentPage ?? '')
    const [totalPages, setTotalPages] = useState(book.totalPages ?? '')
    const [currentChapter, setCurrentChapter] = useState(book.currentChapter ?? '')
    const [isSavingProgress, setIsSavingProgress] = useState(false)
    const [genre, setGenre] = useState(book.genre || '')
    const [isSaving, setIsSaving] = useState(false)
    const [isEditingReview, setIsEditingReview] = useState(false)
    const [confirmingRemove, setConfirmingRemove] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [removeError, setRemoveError] = useState('')

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
                onUpdate()
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

    const handleRemove = () => {
        setIsRemoving(true)
        setRemoveError('')

        apiFetch(`/api/user-books/${book.id}`, { method: 'DELETE' })
            .then(() => {
                onUpdate()
                onClose()
            })
            .catch((error) => {
                setRemoveError(error.message)
                setIsRemoving(false)
            })
    }

    let pageError = ''
    if (totalPages !== '' && Number(totalPages) < 1) {
        pageError = 'Total pages must be at least 1.'
    } else if (currentPage !== '' && totalPages !== '' && Number(currentPage) > Number(totalPages)) {
        pageError = "Your current page can't be higher than the total."
    }

    const pagesPercent = pagePercent(Number(currentPage), Number(totalPages))
    const livePercent = book.status === 'finished' ? 100 : (pagesPercent ?? book.progress ?? 0)

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-body">
                    <button
                        className="drawer-close"
                        onClick={onClose}
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
                        <BookCover src={book.coverImage} className="modal-cover" />
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
                    <div className="modal-remove">
                        {removeError && <Notice message={removeError} />}

                        {confirmingRemove ? (
                            <>
                                <p className="modal-remove-text">
                                    Remove this book from your library? Your progress, review, likes and comments on it will be deleted too.
                                </p>
                                <div className="modal-remove-actions">
                                    <button
                                        type="button"
                                        className="modal-remove-confirm"
                                        onClick={handleRemove}
                                        disabled={isRemoving}
                                    >
                                        {isRemoving ? 'Removing...' : 'Yes, remove it'}
                                    </button>
                                    <button
                                        type="button"
                                        className="ghost-button"
                                        onClick={() => setConfirmingRemove(false)}
                                        disabled={isRemoving}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="modal-remove-button"
                                onClick={() => setConfirmingRemove(true)}
                            >
                                Remove from library
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BookModal;