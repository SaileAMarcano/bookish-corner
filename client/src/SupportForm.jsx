import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';

const KINDS = ['problem', 'idea', 'account', 'other'];
const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

function SupportForm() {
    const { t } = useTranslation();
    const location = useLocation();
    const [kind, setKind] = useState('problem');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);

    const length = message.trim().length;
    const ready = length >= MIN_LENGTH && length <= MAX_LENGTH && !busy;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!ready) return;

        setBusy(true);
        setError('');
        apiFetch('/api/support', { method: 'POST', body: { kind, message, page: location.state?.from } })
            .then(() => {
                setSent(true);
                setMessage('');
            })
            .catch((err) => setError(err.message))
            .finally(() => setBusy(false));
    };

    return (
        <section id="contact" className="card help-section help-contact" aria-labelledby="help-contact">
            <div className="settings-section-head">
                <span className="settings-section-icon">
                    <Icon name="comment" size={17} />
                </span>
                <div>
                    <h2 id="help-contact" className="display settings-section-title">{t('help.contact.title')}</h2>
                    <p className="settings-section-sub">{t('help.contact.subtitle')}</p>
                </div>
            </div>

            {sent ? (
                <div className="help-contact-sent" role="status">
                    <Icon name="check" size={18} />
                    <p>
                        <strong>{t('help.contact.sentTitle')}</strong> {t('help.contact.sentText')}
                    </p>
                    <button type="button" className="ghost-button" onClick={() => setSent(false)}>
                        {t('help.contact.another')}
                    </button>
                </div>
            ) : (
                <form className="help-contact-form" onSubmit={handleSubmit}>
                    <fieldset className="help-contact-kinds">
                        <legend className="edit-label">{t('help.contact.kind')}</legend>
                        {KINDS.map((option) => (
                            <label key={option} className={`help-contact-kind ${kind === option ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="support-kind"
                                    value={option}
                                    checked={kind === option}
                                    onChange={() => setKind(option)}
                                />
                                {t(`help.contact.kinds.${option}`)}
                            </label>
                        ))}
                    </fieldset>

                    <label className="edit-label" htmlFor="support-message">{t('help.contact.message')}</label>
                    <textarea
                        id="support-message"
                        className="edit-input help-contact-message"
                        rows={5}
                        maxLength={MAX_LENGTH}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('help.contact.placeholder')}
                    />
                    <p className="edit-hint">{t('help.contact.count', { count: length, min: MIN_LENGTH, max: MAX_LENGTH })}</p>

                    {error && <Notice message={error} />}

                    <button type="submit" className="edit-save help-contact-send" disabled={!ready}>
                        {busy ? t('help.contact.sending') : t('help.contact.send')}
                    </button>
                </form>
            )}
        </section>
    );
}

export default SupportForm;