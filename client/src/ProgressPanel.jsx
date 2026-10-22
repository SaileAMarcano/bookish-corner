import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Notice from './Notice';
import { apiFetch } from './api';

const NOTE_MAX_LENGTH = 280;

const toNumber = (value) => (value === '' ? null : Number(value));

function ProgressPanel({ book, onSaved }) {
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(book.currentPage ?? '');
    const [totalPages, setTotalPages] = useState(book.totalPages ?? '');
    const [note, setNote] = useState(book.progressNote || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    let pageError = '';
    if (totalPages !== '' && Number(totalPages) < 1) {
        pageError = t('modal.totalTooLow');
    } else if (currentPage !== '' && totalPages !== '' && Number(currentPage) > Number(totalPages)) {
        pageError = t('modal.pageTooHigh');
    }

    const handleSubmit = (event) => {
        event.preventDefault();
        setIsSaving(true);
        setSaved(false);
        setError('');

        apiFetch(`/api/user-books/${book.id}`, {
            method: 'PATCH',
            body: {
                currentPage: toNumber(currentPage),
                totalPages: toNumber(totalPages),
                progressNote: note,
            },
        })
            .then(() => {
                setSaved(true);
                onSaved();
            })
            .catch((err) => setError(err.message))
            .finally(() => setIsSaving(false));
    };

    return (
        <form className="progress-panel" onSubmit={handleSubmit}>
            <h2 className="display progress-panel-title">{t('library.panelTitle')}</h2>

            <div className="progress-panel-book">
                <BookCover src={book.coverImage} className="progress-panel-cover" />
                <div>
                    <div className="display progress-panel-book-title">{book.title}</div>
                    <div className="library-author">{book.author}</div>
                </div>
            </div>

            <label className="progress-panel-label" htmlFor="panel-page">{t('modal.currentPage')}</label>
            <div className="progress-panel-pages">
                <input
                    id="panel-page"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={currentPage}
                    onChange={(event) => setCurrentPage(event.target.value)}
                />
                {book.totalPages ? (
                    <span className="progress-panel-total">/ {book.totalPages}</span>
                ) : (
                    <input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={totalPages}
                        onChange={(event) => setTotalPages(event.target.value)}
                        placeholder={t('modal.totalPages')}
                        aria-label={t('modal.totalPages')}
                    />
                )}
            </div>
            {pageError && <div className="progress-error">{pageError}</div>}

            <label className="progress-panel-label" htmlFor="panel-note">{t('library.noteLabel')}</label>
            <textarea
                id="panel-note"
                rows="3"
                maxLength={NOTE_MAX_LENGTH}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t('library.notePlaceholder')}
            />
            <div className="progress-panel-count">{note.length} / {NOTE_MAX_LENGTH}</div>

            {error && <Notice message={error} />}

            <button type="submit" className="profile-edit progress-panel-save" disabled={isSaving || pageError !== ''}>
                {isSaving ? t('common.saving') : t('modal.saveProgress')}
            </button>
            <div className="progress-panel-saved" aria-live="polite">{saved ? t('library.saved') : ''}</div>
        </form>
    );
}

export default ProgressPanel