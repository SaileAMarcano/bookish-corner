import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import { pagePercent, pageSummary, getAvatarSrc, genreLabel, GENRES } from './utils';
import { apiFetch } from './api';
import Notice from './Notice';
import Icon from './Icon';
import StarRating from './StarRating';

const STATUSES = ['want-to-read', 'reading', 'finished'];

const STATUS_ICONS = {
    'want-to-read': 'reading',
    'reading': 'library',
    'finished': 'check',
}

const toNumber = (value) => (value === '' ? null : Number(value));

function BookModal({ book, onClose, onUpdate }) {
    const { t, i18n } = useTranslation()
    const statusLabel = (value) => t(`status.${value}`, { defaultValue: value })
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
    const [commentError, setCommentError] = useState('')
    const [reviewError, setReviewError] = useState('')
    const [progressError, setProgressError] = useState('')

    useEffect(() => {
        apiFetch(`/api/user-books/${book.id}/comments`)
            .then((data) => setComments(data))
            .catch((error) => setCommentError(error.message))
    }, [book.id])

    const handleAddComment = () => {
        if (commentText.trim() === '') return
        setCommentError('')

        apiFetch(`/api/user-books/${book.id}/comments`, { method: 'POST', body: { text: commentText } })
            .then((newComment) => {
                setComments((prevComments) => [newComment, ...prevComments])
                setCommentText('')
                onUpdate()
            })
            .catch((error) => setCommentError(error.message))
    }

    const handleSaveReview = () => {
        setIsSaving(true)
        setReviewError('')

        apiFetch(`/api/user-books/${book.id}`, {
            method: 'PATCH',
            body: { review, status, genre: genre || null },
        })
            .then(() => {
                setIsEditingReview(false)
                onUpdate()
            })
            .catch((error) => setReviewError(error.message))
            .finally(() => setIsSaving(false))
    }

    const handleSaveProgress = () => {
        setIsSavingProgress(true)
        setProgressError('')

        apiFetch(`/api/user-books/${book.id}`, {
            method: 'PATCH',
            body: {
                currentPage: toNumber(currentPage),
                totalPages: toNumber(totalPages),
                currentChapter: toNumber(currentChapter),
            },
        })
            .then(() => onUpdate())
            .catch((error) => setProgressError(error.message))
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
        pageError = t('modal.totalTooLow')
    } else if (currentPage !== '' && totalPages !== '' && Number(currentPage) > Number(totalPages)) {
        pageError = t('modal.pageTooHigh')
    }

    const pagesPercent = pagePercent(Number(currentPage), Number(totalPages))
    const livePercent = book.status === 'finished' ? 100 : (pagesPercent ?? book.progress ?? 0)

    const progressFields = [
        { label: t('modal.currentPage'), icon: 'library', value: currentPage, onChange: setCurrentPage, min: 0 },
        { label: t('modal.totalPages'), icon: 'posts', value: totalPages, onChange: setTotalPages, min: 1 },
        { label: t('modal.chapter'), icon: 'reading', value: currentChapter, onChange: setCurrentChapter, min: 0, placeholder: t('modal.optional') },
    ]

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-body">
                    <button
                        className="modal-close"
                        onClick={onClose}
                        aria-label={t('common.close')}
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
                                {statusLabel(book.status)}
                            </span>
                            <StarRating value={rating} onChange={handleRate} />
                        </div>
                    </div>

                    {ratingError && <Notice message={ratingError} />}

                    <p className="modal-description">{book.description}</p>
                    <section className="modal-section">
                        <h3 className="section-label">{t('modal.progressTitle')}</h3>

                        <div className="progress-summary">
                            <p className="progress-big">
                                <span className="display progress-percent">{livePercent}%</span>
                                {t('modal.complete')}
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
                        {progressError && <Notice message={progressError} />}

                        <button
                            type="button"
                            className="pill modal-primary"
                            onClick={handleSaveProgress}
                            disabled={isSavingProgress || pageError !== ''}
                        >
                            {isSavingProgress ? t('common.saving') : t('modal.saveProgress')}
                        </button>
                    </section>

                    <section className="modal-section">
                        <div className="review-head">
                            <h3 className="section-label">{t('modal.yourReview')}</h3>

                            {book.review && !isEditingReview && (
                                <button
                                    type="button"
                                    className="review-edit"
                                    onClick={() => setIsEditingReview(true)}
                                >
                                    <Icon name="pencil" size={15} />
                                    {t('modal.edit')}
                                </button>
                            )}
                        </div>

                        {book.review && !isEditingReview ? (
                            <>
                                <blockquote className="modal-review">{book.review}</blockquote>

                                <div className="book-meta">
                                    <span className={`pill book-status status-${book.status}`}>
                                        {statusLabel(book.status)}
                                    </span>
                                    {book.status !== 'want-to-read' && (
                                        <span className="progress-label">{t('book.complete', { percent: book.progress })}</span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <textarea
                                    className="profile-textarea review-textarea"
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                    placeholder={t('modal.reviewPlaceholder')}
                                />

                                <div className="review-controls">
                                    <select
                                        className="review-select"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                    >
                                        {STATUSES.map((value) => (
                                            <option key={value} value={value}>{statusLabel(value)}</option>
                                        ))}
                                    </select>

                                    <select
                                        className="review-select"
                                        value={genre}
                                        onChange={(e) => setGenre(e.target.value)}
                                    >
                                        <option value="">{t('modal.genrePlaceholder')}</option>
                                        {GENRES.map((g) => (
                                            <option key={g} value={g}>{genreLabel(g)}</option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        className="pill review-save"
                                        onClick={handleSaveReview}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? t('common.saving') : t('common.save')}
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
                                            {t('common.cancel')}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                        {reviewError && <Notice message={reviewError} />}
                    </section>

                    <section className="modal-section">
                        <h3 className="section-label">{t('modal.commentsTitle', { count: comments.length })}</h3>

                        {comments.length === 0 ? (
                            <p className="comment-empty">{t('modal.noComments')}</p>
                        ) : (
                            <ul className="comment-list">
                                {comments.map((comment) => (
                                    <li key={comment.id} className="comment-item">
                                        <img className="comment-avatar" src={getAvatarSrc(comment.avatarUrl)} alt="" />
                                        <div className="comment-body">
                                            <div className="comment-head">
                                                <span className="comment-author">{comment.username}</span>
                                                <span className="comment-date">
                                                    · {new Date(comment.createdAt).toLocaleDateString(i18n.language, {
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
                        {commentError && <Notice message={commentError} />}
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
                                placeholder={t('modal.writeComment')}
                                aria-label={t('modal.writeComment')}
                            />
                            <button type="submit" className="pill comment-send">{t('modal.comment')}</button>
                        </form>
                    </section>
                    <div className="modal-remove">
                        {removeError && <Notice message={removeError} />}

                        {confirmingRemove ? (
                            <>
                                <p className="modal-remove-text">
                                    {t('modal.removeText')}
                                </p>
                                <div className="modal-remove-actions">
                                    <button
                                        type="button"
                                        className="modal-remove-confirm"
                                        onClick={handleRemove}
                                        disabled={isRemoving}
                                    >
                                        {isRemoving ? t('modal.removing') : t('modal.removeYes')}
                                    </button>
                                    <button
                                        type="button"
                                        className="ghost-button"
                                        onClick={() => setConfirmingRemove(false)}
                                        disabled={isRemoving}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="modal-remove-button"
                                onClick={() => setConfirmingRemove(true)}
                            > <Icon name="trash" size={17} />
                                {t('modal.removeButton')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BookModal;