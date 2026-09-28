import { useState, useEffect } from 'react';
import BookCover from './BookCover';
import { pagePercent, pageSummary } from './utils';
import { apiFetch, API_URL } from './api';
import Notice from './Notice';
import Icon from './Icon';
import StarRating from './StarRating';

export const statusLabels = {
    'want-to-read': 'Want to read',
    'reading': 'Reading',
    'finished': 'Finished'
}

const STATUS_ICONS = {
    'want-to-read': 'reading',
    'reading': 'library',
    'finished': 'check',
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
const avatarSrc = (url) => (url ? `${API_URL}${url}` : '/default-avatar.png');

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
    const [rating, setRating] = useState(book.rating || 0)
    const [ratingError, setRatingError] = useState('')

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
    const handleRate = (newRating) => {
        const previous = rating
        setRating(newRating)
        setRatingError('')

        apiFetch(`/api/user-books/${book.id}`, { method: 'PATCH', body: { rating: newRating } })
            .then(() => onUpdate())
            .catch((error) => {
                setRating(previous)
                setRatingError(error.message)
            })
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

    const progressFields = [
        { label: 'Current page', icon: 'library', value: currentPage, onChange: setCurrentPage, min: 0 },
        { label: 'Total pages', icon: 'posts', value: totalPages, onChange: setTotalPages, min: 1 },
        { label: 'Chapter', icon: 'reading', value: currentChapter, onChange: setCurrentChapter, min: 0, placeholder: 'Optional' },
    ]

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-body">
                    <button
                        className="modal-close"
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

                            <span className={`pill modal-status status-${book.status}`}>
                                <Icon name={STATUS_ICONS[book.status]} size={15} />
                                {statusLabels[book.status] || book.status}
                            </span>
                            <StarRating value={rating} onChange={handleRate} />
                        </div>
                    </div>

                    {ratingError && <Notice message={ratingError} />}

                    <p className="modal-description">{book.description}</p>
                    <section className="modal-section">
                        <h3 className="section-label">Reading progress</h3>

                        <div className="progress-summary">
                            <p className="progress-big">
                                <span className="display progress-percent">{livePercent}%</span>
                                complete
                            </p>
                            <span className="progress-pages">{pageSummary({ currentPage, totalPages })}</span>
                        </div>

                        <div className="progress-track progress-track-big">
                            <div className="progress-fill" style={{ width: `${livePercent}%` }}></div>
                        </div>

                        <div className="progress-fields">
                            {progressFields.map((field) => (
                                <label key={field.label} className="progress-field">
                                    <Icon name={field.icon} size={22} />
                                    <span className="progress-field-text">
                                        {field.label}
                                        <input
                                            className="progress-input"
                                            type="number"
                                            min={field.min}
                                            placeholder={field.placeholder}
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value)}
                                        />
                                    </span>
                                </label>
                            ))}
                        </div>

                        {pageError && <div className="progress-error">{pageError}</div>}

                        <button
                            type="button"
                            className="pill modal-primary"
                            onClick={handleSaveProgress}
                            disabled={isSavingProgress || pageError !== ''}
                        >
                            {isSavingProgress ? 'Saving...' : 'Save progress'}
                        </button>
                    </section>

                    <section className="modal-section">
                        <div className="review-head">
                            <h3 className="section-label">Your review</h3>

                            {book.review && !isEditingReview && (
                                <button
                                    type="button"
                                    className="review-edit"
                                    onClick={() => setIsEditingReview(true)}
                                >
                                    <Icon name="pencil" size={15} />
                                    Edit
                                </button>
                            )}
                        </div>

                        {book.review && !isEditingReview ? (
                            <>
                                <blockquote className="modal-review">{book.review}</blockquote>

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
                                    className="profile-textarea review-textarea"
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
                                        type="button"
                                        className="pill review-save"
                                        onClick={handleSaveReview}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </button>

                                    {book.review && (
                                        <button
                                            type="button"
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
                    </section>

                    <section className="modal-section">
                        <h3 className="section-label">Comments · {comments.length}</h3>

                        {comments.length === 0 ? (
                            <p className="comment-empty">No comments yet. Be the first to say something!</p>
                        ) : (
                            <ul className="comment-list">
                                {comments.map((comment) => (
                                    <li key={comment.id} className="comment-item">
                                        <img className="comment-avatar" src={avatarSrc(comment.avatarUrl)} alt="" />
                                        <div className="comment-body">
                                            <div className="comment-head">
                                                <span className="comment-author">{comment.username}</span>
                                                <span className="comment-date">
                                                    · {new Date(comment.createdAt + 'Z').toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                            <p className="comment-text">{comment.text}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <form
                            className="comment-form"
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleAddComment()
                            }}
                        >
                            <input
                                className="comment-input"
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment..."
                                aria-label="Write a comment"
                            />
                            <button type="submit" className="pill comment-send">Comment</button>
                        </form>
                    </section>
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
                            > <Icon name="trash" size={17} />
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