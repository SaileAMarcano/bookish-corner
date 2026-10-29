import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import { apiFetch } from './api';
import { GENRES, genreLabel } from './utils';

const EMPTY_BOOK = {
    title: '',
    author: '',
    year: '',
    isbn: '',
    language: 'en',
    genre: '',
    description: '',
    titleEn: '',
    descriptionEn: '',
    titleEs: '',
    descriptionEs: '',
};

const LANGUAGES = ['es', 'en', 'other'];
const SUFFIXES = { en: 'En', es: 'Es' };

function toForm(book) {
    const form = { ...EMPTY_BOOK };
    for (const key of Object.keys(EMPTY_BOOK)) {
        if (book[key] !== null && book[key] !== undefined) form[key] = String(book[key]);
    }
    return form;
}

function BookEditorForm({ bookId, initial, requestId, onSaved, onCancel }) {
    const { t } = useTranslation();
    const [form, setForm] = useState({ ...EMPTY_BOOK, ...initial });
    const [cover, setCover] = useState(null);
    const [coverPreview, setCoverPreview] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isEditing = bookId !== null;

    useEffect(() => {
        if (!isEditing) return;

        apiFetch(`/api/editor/books/${bookId}`)
            .then((book) => {
                setForm(toForm(book));
                setCoverPreview(book.coverImage || '');
            })
            .catch((err) => setError(err.message));
    }, [bookId, isEditing]);

    const update = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }));

    const handleCover = (e) => {
        const file = e.target.files[0] || null;
        setCover(file);
        setCoverPreview(file ? URL.createObjectURL(file) : '');
    };

    const otherLanguages = ['en', 'es'].filter((language) => language !== form.language);
    const hasTranslation = otherLanguages.some((language) => form[`title${SUFFIXES[language]}`] || form[`description${SUFFIXES[language]}`]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);

        const data = new FormData();
        for (const [key, value] of Object.entries(form)) {
            data.append(key, value);
        }
        if (requestId) data.append('requestId', requestId);

        apiFetch(isEditing ? `/api/editor/books/${bookId}` : '/api/editor/books', {
            method: isEditing ? 'PATCH' : 'POST',
            body: data,
        })
            .then(() => onSaved(isEditing ? t('catalog.updated', { title: form.title }) : t('catalog.added', { title: form.title })))
            .catch((err) => {
                setError(err.message);
                setIsSaving(false);
            });
    };

    return (
        <form className="card admin-box catalog-form" onSubmit={handleSubmit}>
            <h2 className="section-label">{isEditing ? t('catalog.editTitle') : requestId ? t('catalog.completeTitle') : t('catalog.addTitle')}</h2>

            <label className="catalog-cover-field">
                {coverPreview ? (
                    <img className="catalog-cover-preview" src={coverPreview} alt="" />
                ) : (
                    <span className="catalog-cover-preview catalog-cover-empty">+</span>
                )}
                <span className="catalog-cover-text">
                    <strong>{t('catalog.cover')}</strong>
                    <span>{t('catalog.coverHint')}</span>
                    <input type="file" accept="image/jpeg,image/png,image/gif" onChange={handleCover} />
                </span>
            </label>

            <label className="catalog-field">
                <span>{t('catalog.titleLabel')} *</span>
                <input type="text" value={form.title} onChange={update('title')} maxLength={200} required />
            </label>

            <label className="catalog-field">
                <span>{t('catalog.author')} *</span>
                <input type="text" value={form.author} onChange={update('author')} maxLength={120} required />
            </label>

            <div className="catalog-pair">
                <label className="catalog-field">
                    <span>{t('catalog.year')}</span>
                    <input type="number" value={form.year} onChange={update('year')} min={1} />
                </label>
                <label className="catalog-field">
                    <span>{t('catalog.isbn')}</span>
                    <input type="text" value={form.isbn} onChange={update('isbn')} placeholder={t('catalog.optional')} maxLength={20} />
                </label>
            </div>

            <div className="catalog-pair">
                <label className="catalog-field">
                    <span>{t('catalog.language')}</span>
                    <select value={form.language} onChange={update('language')}>
                        {LANGUAGES.map((language) => (
                            <option key={language} value={language}>{t(`catalog.languages.${language}`)}</option>
                        ))}
                    </select>
                </label>
                <label className="catalog-field">
                    <span>{t('catalog.genre')}</span>
                    <select value={form.genre} onChange={update('genre')}>
                        <option value="">{t('catalog.genrePlaceholder')}</option>
                        {GENRES.map((genre) => (
                            <option key={genre} value={genre}>{genreLabel(genre)}</option>
                        ))}
                    </select>
                </label>
            </div>

            <label className="catalog-field">
                <span>{t('catalog.description')}</span>
                <textarea value={form.description} onChange={update('description')} rows={4} maxLength={3000} />
            </label>

            <details className="catalog-translations" open={hasTranslation}>
                <summary>{t('catalog.otherLanguages')}</summary>
                {otherLanguages.map((language) => (
                    <div key={language} className="catalog-translation">
                        <label className="catalog-field">
                            <span>{t('catalog.titleIn', { language: t(`catalog.languageNames.${language}`) })}</span>
                            <input
                                type="text"
                                value={form[`title${SUFFIXES[language]}`]}
                                onChange={update(`title${SUFFIXES[language]}`)}
                                maxLength={200}
                            />
                        </label>
                        <label className="catalog-field">
                            <span>{t('catalog.descriptionIn', { language: t(`catalog.languageNames.${language}`) })}</span>
                            <textarea
                                value={form[`description${SUFFIXES[language]}`]}
                                onChange={update(`description${SUFFIXES[language]}`)}
                                rows={3}
                                maxLength={3000}
                            />
                        </label>
                    </div>
                ))}
            </details>

            {error && <Notice message={error} />}

            <div className="catalog-actions">
                {(isEditing || requestId) && (
                    <button type="button" className="invite-action" onClick={onCancel}>
                        {t('catalog.cancel')}
                    </button>
                )}
                <button type="submit" className="invite-create" disabled={isSaving}>
                    {isEditing ? t('catalog.saveChanges') : t('catalog.save')}
                </button>
            </div>
        </form>
    );
}

export default BookEditorForm;