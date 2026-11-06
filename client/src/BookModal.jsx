import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Icon from './Icon';
import Notice from './Notice';
import ReviewComments from './ReviewComments';
import StarRating from './StarRating';
import { apiFetch } from './api';
import { genreLabel, GENRES, pagePercent, pageSummary } from './utils';

const STATUSES = ['want-to-read', 'reading', 'paused', 'dnf', 'finished'];
const toNumber = (value) => value === '' ? null : Number(value);

function BookModal({ book, onClose, onUpdate, initialTab = 'reading' }) {
    const { t } = useTranslation();
    const now = new Date();
    const currentYear = now.getFullYear();
    const today = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const modalRef = useRef(null);
    const [tab, setTab] = useState(initialTab === 'review' ? 'review' : 'reading');
    const [status, setStatus] = useState(book.status || 'reading');
    const [rating, setRating] = useState(book.rating || 0);
    const [review, setReview] = useState(book.review || '');
    const [reviewIsSpoiler, setReviewIsSpoiler] = useState(Boolean(book.reviewIsSpoiler));
    const [genre, setGenre] = useState(book.genre || '');
    const [currentPage, setCurrentPage] = useState(book.currentPage ?? '');
    const [totalPages, setTotalPages] = useState(book.totalPages ?? '');
    const [currentChapter, setCurrentChapter] = useState(book.currentChapter ?? '');
    const [readYear, setReadYear] = useState(book.status === 'finished' ? book.readYear ?? currentYear : currentYear);
    const [unknownYear, setUnknownYear] = useState(book.status === 'finished' && book.readYear == null);
    const [finishedOn, setFinishedOn] = useState(book.status === 'finished' ? book.finishedOn || '' : '');
    const [exactDate, setExactDate] = useState(book.status === 'finished' && Boolean(book.finishedOn));
    const savedFields = useRef({
        status, rating, review, reviewIsSpoiler: Boolean(review.trim()) && reviewIsSpoiler,
        genre: genre || null, currentPage: toNumber(currentPage), totalPages: toNumber(totalPages),
        currentChapter: toNumber(currentChapter), readYear: unknownYear ? null : Number(readYear),
        finishedOn: exactDate ? finishedOn : null,
    });
    const [commentCount, setCommentCount] = useState(book.commentCount || 0);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [confirmingRemove, setConfirmingRemove] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [removeError, setRemoveError] = useState('');
    const formId = `book-diary-${book.id}`;
    const busy = isSaving || isRemoving;

    useEffect(() => {
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        modalRef.current?.querySelector('.book-diary-close')?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [book.id]);

    function closeModal() {
        if (!busy) onClose();
    }

    function handleKeys(event) {
        if (event.target.closest('dialog[open]')) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeModal();
        }

        if (event.key !== 'Tab') return;

        const elements = [...modalRef.current.querySelectorAll('button, input, select, textarea, a[href], summary')]
            .filter((element) => !element.matches(':disabled') && element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = elements[0];
        const last = elements.at(-1);

        if (event.shiftKey && event.target === first) {
            event.preventDefault();
            last?.focus();
        } else if (!event.shiftKey && event.target === last) {
            event.preventDefault();
            first?.focus();
        }
    }

    function handleTabKeys(event) {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

        event.preventDefault();
        const next = event.key === 'Home' ? 'reading' : event.key === 'End' ? 'review' : tab === 'reading' ? 'review' : 'reading';
        setTab(next);
        modalRef.current.querySelector(`[data-diary-tab="${next}"]`)?.focus();
    }

    let pageError = '';

    if ([currentPage, totalPages, currentChapter].some((value) => value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 0))) {
        pageError = t('modal.wholeNumbers');
    } else if (totalPages !== '' && Number(totalPages) < 1) {
        pageError = t('modal.totalTooLow');
    } else if (currentPage !== '' && totalPages !== '' && Number(currentPage) > Number(totalPages)) {
        pageError = t('modal.pageTooHigh');
    }

    let yearError = '';

    if (status === 'finished' && !unknownYear) {
        if (!Number.isInteger(Number(readYear)) || Number(readYear) < 1000 || Number(readYear) > currentYear) {
            yearError = t('modal.invalidYear');
        } else if (exactDate) {
            const date = new Date(finishedOn + 'T00:00:00.000Z');

            if (!finishedOn || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== finishedOn || finishedOn > today || Number(finishedOn.slice(0, 4)) !== Number(readYear)) {
                yearError = t('modal.invalidDate');
            }
        }
    }

    async function handleSave(event) {
        event.preventDefault();
        if (busy) return;

        if (pageError || yearError) {
            setTab('reading');
            return;
        }

        setIsSaving(true);
        setError('');
        setSaved(false);

        const fields = {
            status,
            rating,
            review,
            reviewIsSpoiler: Boolean(review.trim()) && reviewIsSpoiler,
            genre: genre || null,
            currentPage: toNumber(currentPage),
            totalPages: toNumber(totalPages),
            currentChapter: toNumber(currentChapter),
        };

        if (status === 'finished') {
            fields.readYear = unknownYear ? null : Number(readYear);
            fields.finishedOn = !unknownYear && exactDate ? finishedOn : null;
        }

        const finishing = status === 'finished' && status !== savedFields.current.status;
        const body = Object.fromEntries(Object.entries(fields).filter(([field, value]) =>
            value !== savedFields.current[field] || (finishing && ['readYear', 'finishedOn'].includes(field))
        ));

        try {
            if (Object.keys(body).length) {
                await apiFetch(`/api/user-books/${book.id}`, { method: 'PATCH', body });
                savedFields.current = fields;
            }
            await onUpdate();
            setSaved(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleRemove() {
        if (busy) return;

        setIsRemoving(true);
        setRemoveError('');

        try {
            await apiFetch(`/api/user-books/${book.id}`, { method: 'DELETE' });
            await onUpdate();
            onClose();
        } catch (err) {
            setRemoveError(err.message);
            setIsRemoving(false);
        }
    }

    const percent = status === 'finished' ? 100 : pagePercent(Number(currentPage), Number(totalPages)) ?? (book.status === 'finished' ? 0 : book.progress || 0);
    const fields = [
        { name: 'currentPage', label: t('modal.currentPage'), value: currentPage, change: setCurrentPage, min: 0 },
        { name: 'totalPages', label: t('modal.totalPages'), value: totalPages, change: setTotalPages, min: 1 },
        { name: 'currentChapter', label: t('modal.chapter'), value: currentChapter, change: setCurrentChapter, min: 0 },
    ];

    return (
        <div className="modal-overlay" onClick={closeModal}>
            <div
                className="modal book-diary"
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${formId}-title`}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={handleKeys}
            >
                <header className="book-diary-brand">
                    <img src="/logo-mark.png" alt="" />
                    <div>
                        <span className="display">A Library of Us</span>
                        <small>{t('modal.diaryTitle')}</small>
                    </div>
                    <button
                        type="button"
                        className="book-diary-close"
                        onClick={closeModal}
                        disabled={busy}
                        aria-label={t('common.close')}
                    >
                        <Icon name="close" />
                    </button>
                </header>

                <div className="book-diary-scroll">
                    <form id={formId} onSubmit={handleSave} onChange={() => setSaved(false)} noValidate>
                        <fieldset className="book-diary-fields" disabled={busy}>
                            <div className="book-diary-header">
                                <BookCover
                                    src={book.coverImage}
                                    className="book-diary-cover"
                                    title={book.title}
                                    author={book.author}
                                    bookId={book.bookId}
                                />
                                <div className="book-diary-heading">
                                    <h2 className="display" id={`${formId}-title`}>{book.title}</h2>
                                    <p>{book.author}</p>
                                    <select
                                        className="book-diary-status"
                                        value={status}
                                        onChange={(event) => setStatus(event.target.value)}
                                        aria-label={t('modal.readingStatus')}
                                    >
                                        {STATUSES.map((value) => (
                                            <option key={value} value={value}>{t(`status.${value}`)}</option>
                                        ))}
                                    </select>
                                    <StarRating
                                        value={rating}
                                        size={23}
                                        onChange={(value) => {
                                            setRating(value);
                                            setSaved(false);
                                        }}
                                    />
                                </div>
                            </div>

                            {book.description && (
                                <details className="book-diary-description">
                                    <summary>{t('modal.aboutBook')}</summary>
                                    <p>{book.description}</p>
                                </details>
                            )}

                            <div
                                className="book-diary-tabs"
                                role="tablist"
                                aria-label={t('modal.sections')}
                                onKeyDown={handleTabKeys}
                            >
                                {['reading', 'review'].map((value) => (
                                    <button
                                        type="button"
                                        key={value}
                                        role="tab"
                                        id={`${formId}-tab-${value}`}
                                        data-diary-tab={value}
                                        aria-controls={`${formId}-panel-${value}`}
                                        aria-selected={tab === value}
                                        tabIndex={tab === value ? 0 : -1}
                                        onClick={() => setTab(value)}
                                    >
                                        {t(value === 'reading' ? 'modal.readingTab' : 'modal.reviewTab')}
                                    </button>
                                ))}
                            </div>

                            <section
                                className="book-diary-panel"
                                role="tabpanel"
                                id={`${formId}-panel-reading`}
                                aria-labelledby={`${formId}-tab-reading`}
                                hidden={tab !== 'reading'}
                            >
                                <h3 className="display book-diary-section-title">
                                    <Icon name="library" />
                                    {t('modal.progressTitle')}
                                </h3>

                                <div className="book-diary-numbers">
                                    {fields.map((field) => (
                                        <label key={field.name}>
                                            {field.label}
                                            <input
                                                name={field.name}
                                                type="number"
                                                inputMode="numeric"
                                                min={field.min}
                                                step="1"
                                                value={field.value}
                                                placeholder={t('modal.optional')}
                                                onChange={(event) => field.change(event.target.value)}
                                            />
                                        </label>
                                    ))}
                                </div>

                                <div className="book-diary-progress-label">
                                    <span>
                                        <strong className="display">{percent}%</strong> {t('modal.complete')}
                                    </span>
                                    <span>{pageSummary({ currentPage, totalPages })}</span>
                                </div>
                                <div
                                    className="book-diary-track"
                                    role="progressbar"
                                    aria-label={t('modal.progressTitle')}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={percent}
                                >
                                    <div style={{ width: `${percent}%` }} />
                                </div>

                                {pageError && <p className="book-diary-error">{pageError}</p>}

                                <div className="book-diary-year">
                                    <h3 className="display book-diary-section-title">
                                        <Icon name="sparkle" />
                                        {t('modal.readingYear')}
                                    </h3>

                                    {status !== 'finished' ? (
                                        <p className="book-diary-hint">{t('modal.yearPending')}</p>
                                    ) : (
                                        <>
                                            <div className="book-diary-year-row">
                                                <label>
                                                    {t('modal.finishedIn')}
                                                    <input
                                                        name="readYear"
                                                        type="number"
                                                        inputMode="numeric"
                                                        min="1000"
                                                        max={currentYear}
                                                        step="1"
                                                        value={readYear}
                                                        disabled={unknownYear}
                                                        onChange={(event) => {
                                                            setReadYear(event.target.value);
                                                            if (finishedOn && !finishedOn.startsWith(event.target.value + '-')) {
                                                                setFinishedOn('');
                                                            }
                                                        }}
                                                    />
                                                </label>
                                                <p className="book-diary-hint">
                                                    {t('modal.destinationLabel')}
                                                    <strong>
                                                        {unknownYear ? t('library.undated') : t('modal.destination', { year: readYear || '…' })}
                                                    </strong>
                                                </p>
                                            </div>

                                            <label className="book-diary-check">
                                                <input
                                                    type="checkbox"
                                                    name="unknownYear"
                                                    checked={unknownYear}
                                                    onChange={(event) => {
                                                        setUnknownYear(event.target.checked);
                                                        if (event.target.checked) {
                                                            setExactDate(false);
                                                            setFinishedOn('');
                                                        }
                                                    }}
                                                />
                                                {t('modal.unknownYear')}
                                            </label>

                                            <label className="book-diary-check">
                                                <input
                                                    type="checkbox"
                                                    name="exactDate"
                                                    checked={exactDate}
                                                    disabled={unknownYear}
                                                    onChange={(event) => setExactDate(event.target.checked)}
                                                />
                                                {t('modal.exactDate')}
                                            </label>

                                            {exactDate && !unknownYear && (
                                                <label className="book-diary-date">
                                                    {t('modal.finishedOn')}
                                                    <input
                                                        name="finishedOn"
                                                        type="date"
                                                        max={today}
                                                        value={finishedOn}
                                                        onChange={(event) => {
                                                            setFinishedOn(event.target.value);
                                                            if (event.target.value) {
                                                                setReadYear(Number(event.target.value.slice(0, 4)));
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            )}

                                            <p className="book-diary-hint">{t('modal.yearHint')}</p>
                                            {yearError && <p className="book-diary-error">{yearError}</p>}
                                        </>
                                    )}
                                </div>
                            </section>

                            <section
                                className="book-diary-panel"
                                role="tabpanel"
                                id={`${formId}-panel-review`}
                                aria-labelledby={`${formId}-tab-review`}
                                hidden={tab !== 'review'}
                            >
                                <h3 className="display book-diary-section-title">
                                    <Icon name="feather" />
                                    {t('modal.yourReview')}
                                </h3>
                                <label className="book-diary-review">
                                    {t('modal.reviewLead')}
                                    <textarea
                                        name="review"
                                        rows="5"
                                        maxLength={5000}
                                        value={review}
                                        placeholder={t('modal.reviewPlaceholder')}
                                        onChange={(event) => setReview(event.target.value)}
                                    />
                                </label>
                                <span className="book-diary-review-count">{review.length} / 5000</span>
                                <label className="book-diary-check">
                                    <input
                                        type="checkbox"
                                        name="reviewIsSpoiler"
                                        checked={Boolean(review.trim()) && reviewIsSpoiler}
                                        disabled={!review.trim()}
                                        onChange={(event) => setReviewIsSpoiler(event.target.checked)}
                                    />
                                    {t('modal.containsSpoilers')}
                                </label>
                                <label>
                                    {t('modal.genreLabel')}
                                    <select
                                        name="genre"
                                        value={genre}
                                        onChange={(event) => setGenre(event.target.value)}
                                    >
                                        <option value="">{t('modal.genrePlaceholder')}</option>
                                        {GENRES.map((value) => (
                                            <option key={value} value={value}>{genreLabel(value)}</option>
                                        ))}
                                    </select>
                                </label>
                            </section>
                        </fieldset>
                    </form>

                    {error && <Notice message={error} />}

                    <details className="book-diary-comments">
                        <summary>{t('modal.commentsTitle', { count: commentCount })}</summary>
                        <ReviewComments
                            reviewId={book.id}
                            onCountChange={(count) => {
                                setCommentCount(count);
                                onUpdate();
                            }}
                        />
                    </details>

                    <div className="book-diary-remove">
                        {removeError && <Notice message={removeError} />}
                        {confirmingRemove ? (
                            <>
                                <p>{t('modal.removeText')}</p>
                                <div>
                                    <button
                                        type="button"
                                        className="book-diary-danger"
                                        disabled={busy}
                                        onClick={handleRemove}
                                    >
                                        {isRemoving ? t('modal.removing') : t('modal.removeYes')}
                                    </button>
                                    <button
                                        type="button"
                                        className="book-diary-secondary"
                                        disabled={busy}
                                        onClick={() => setConfirmingRemove(false)}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="modal-remove-button"
                                disabled={busy}
                                onClick={() => setConfirmingRemove(true)}
                            >
                                <Icon name="trash" size={15} />
                                {t('modal.removeButton')}
                            </button>
                        )}
                    </div>
                </div>

                <footer className="book-diary-footer">
                    <p
                        className={`book-diary-feedback ${pageError || yearError ? 'book-diary-error' : ''}`}
                        role="status"
                    >
                        {pageError || yearError || (saved ? t('modal.saved') : '')}
                    </p>
                    <button
                        type="button"
                        className="book-diary-secondary"
                        disabled={busy}
                        onClick={closeModal}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        form={formId}
                        className="book-diary-save"
                        disabled={busy || Boolean(pageError || yearError)}
                    >
                        <Icon name="feather" size={17} />
                        {isSaving ? t('common.saving') : t('modal.saveChanges')}
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default BookModal;