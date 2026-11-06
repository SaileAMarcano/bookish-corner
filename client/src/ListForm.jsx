import { useState, useEffect, useRef, useId } from 'react';
import { useTranslation } from 'react-i18next';
import TagInput from './TagInput';
import Icon from './Icon';
import { apiFetch } from './api';

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 500;

function ListForm({ onClose, onSaved }) {
    const { t } = useTranslation();
    const formId = useId();
    const dialogRef = useRef(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [tags, setTags] = useState([]);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog.open) dialog.showModal();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setStatus('saving');

        apiFetch('/api/lists', { method: 'POST', body: { title, description, isPublic, tags, books: [] } })
            .then((saved) => onSaved(saved))
            .catch((err) => {
                setError(err.message);
                setStatus('idle');
            });
    };

    return (
        <dialog ref={dialogRef} className="card report-dialog list-form-dialog" aria-labelledby={`${formId}-heading`} onClose={onClose}>
            <form className="report-form" onSubmit={handleSubmit}>
                <h2 id={`${formId}-heading`} className="display report-title">{t('lists.form.newTitle')}</h2>

                <div className="edit-field">
                    <label className="edit-label" htmlFor={`${formId}-title`}>{t('lists.form.name')}</label>
                    <input
                        id={`${formId}-title`}
                        className="edit-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('lists.form.namePlaceholder')}
                        maxLength={TITLE_MAX}
                        autoFocus
                    />
                    <span className="edit-counter">{title.length}/{TITLE_MAX}</span>
                </div>

                <div className="edit-field">
                    <label className="edit-label" htmlFor={`${formId}-description`}>{t('lists.form.description')}</label>
                    <textarea
                        id={`${formId}-description`}
                        className="edit-textarea"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('lists.form.descriptionPlaceholder')}
                        maxLength={DESCRIPTION_MAX}
                        rows={3}
                    />
                    <span className="edit-counter">{description.length}/{DESCRIPTION_MAX}</span>
                </div>

                <fieldset className="list-form-privacy">
                    <legend className="edit-label">{t('lists.form.privacy')}</legend>

                    <label className={`list-form-option ${isPublic ? 'active' : ''}`}>
                        <input type="radio" name={`${formId}-privacy`} checked={isPublic} onChange={() => setIsPublic(true)} />
                        <Icon name="eye" size={18} />
                        <span>
                            <strong>{t('lists.form.public')}</strong>
                            <small>{t('lists.form.publicHint')}</small>
                        </span>
                    </label>

                    <label className={`list-form-option ${isPublic ? '' : 'active'}`}>
                        <input type="radio" name={`${formId}-privacy`} checked={!isPublic} onChange={() => setIsPublic(false)} />
                        <Icon name="lock" size={18} />
                        <span>
                            <strong>{t('lists.form.private')}</strong>
                            <small>{t('lists.form.privateHint')}</small>
                        </span>
                    </label>
                </fieldset>

                <div className="edit-field">
                    <span className="edit-label">{t('lists.form.tags')}</span>
                    <TagInput tags={tags} onChange={setTags} />
                </div>

                {error && <p className="access-error" role="alert">{error}</p>}

                <div className="report-actions">
                    <button type="button" className="invite-action" onClick={() => dialogRef.current.close()}>
                        {t('common.cancel')}
                    </button>
                    <button type="submit" className="invite-create" disabled={title.trim() === '' || status === 'saving'}>
                        {status === 'saving' ? t('lists.form.saving') : t('lists.form.create')}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

export default ListForm;