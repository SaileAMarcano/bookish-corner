import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { apiFetch } from './api';

function TermsUpdate({ onAccepted, onLogout, onLanguageChange }) {
    const { t } = useTranslation();
    const [accepts, setAccepts] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!accepts || isSaving) return;
        setIsSaving(true);
        setError('');

        apiFetch('/api/me/terms', { method: 'PATCH', body: { accept: true } })
            .then(({ termsAcceptedAt }) => onAccepted(termsAcceptedAt))
            .catch((er) => {
                setError(er.message);
                setIsSaving(false);
            });
    };

    return (
        <div className="access-page" style={{ backgroundImage: 'url(/auth-welcome.jpg)' }}>
            <div className="access-language">
                <LanguageSwitcher onChange={onLanguageChange} />
            </div>
            <div className="access-card">
                <img src="/logo.png" alt="A Library of Us" className="access-logo welcome-logo" />

                <h1 className="display access-title">{t('termsUpdate.title')}</h1>
                <p className="access-subtitle">{t('termsUpdate.lead')}</p>

                <form className="access-form" onSubmit={handleSubmit}>
                    <label className="access-terms">
                        <input type="checkbox" checked={accepts} onChange={(e) => setAccepts(e.target.checked)} />
                        <span>
                            {t('auth.termsBefore')}{' '}
                            <Link to="/terms" target="_blank" rel="noopener noreferrer">{t('legal.terms')}</Link>{' '}
                            {t('auth.termsAnd')}{' '}
                            <Link to="/privacy" target="_blank" rel="noopener noreferrer">{t('legal.privacy')}</Link>
                            {t('auth.termsAfter')}
                        </span>
                    </label>

                    {error && <p className="access-error">{error}</p>}

                    <button type="submit" className="access-submit" disabled={!accepts || isSaving}>
                        {isSaving ? t('common.saving') : t('termsUpdate.button')}
                    </button>
                </form>

                <button type="button" className="welcome-skip terms-update-logout" onClick={onLogout}>
                    {t('termsUpdate.logout')}
                </button>
            </div>
        </div>
    );
}

export default TermsUpdate;