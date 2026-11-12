import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import Icon from './Icon';
import GoogleMark from './GoogleMark';
import { apiFetch } from './api';

function GoogleSignupPage({ onLogin }) {
    const { t, i18n } = useTranslation();
    const [pending, setPending] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        apiFetch('/api/auth/google/pending')
            .then(setPending)
            .catch((er) => setLoadError(er.message));
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setError('');
        setIsSubmitting(true);

        apiFetch('/api/auth/google/complete', { method: 'POST', body: { username: username.trim(), language: i18n.language } })
            .then((user) => onLogin(user))
            .catch((er) => {
                setError(er.message);
                setIsSubmitting(false);
            });
    };

    return (
        <div className="access-page" style={{ backgroundImage: 'url(/auth-signup.jpg)' }}>
            <Link to="/" className="access-back" aria-label={t('auth.backHome')}>
                <Icon name="home" size={20} />
            </Link>
            <div className="access-language">
                <LanguageSwitcher />
            </div>
            <div className="access-card">
                <Link to="/" className="access-brand">
                    <img src="/logo.png" alt="A Library of Us" className="access-logo" />
                </Link>

                <h1 className="display access-title">{t('googleSignup.title')}</h1>
                <p className="access-subtitle">{t('googleSignup.subtitle')}</p>

                {loadError && (
                    <>
                        <p className="access-error">{loadError}</p>
                        <p className="access-switch">
                            <Link to="/signup">{t('googleSignup.backToSignup')}</Link>
                        </p>
                    </>
                )}

                {pending && (
                    <form className="access-form" onSubmit={handleSubmit}>
                        <p className="access-google-account">
                            <GoogleMark />
                            {pending.email}
                        </p>

                        <label className="access-field">
                            <span className="access-label">{t('auth.username')}</span>
                            <span className="access-input-wrap">
                                <Icon name="about" size={18} />
                                <input
                                    className="access-input"
                                    type="text"
                                    placeholder={t('auth.usernamePlaceholder')}
                                    autoComplete="nickname"
                                    maxLength={30}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoFocus
                                />
                            </span>
                            <span className="access-hint">{t('auth.usernameHint')}</span>
                        </label>

                        {error && <p className="access-error">{error}</p>}
                        <button type="submit" className="access-submit" disabled={isSubmitting || !username.trim()}>
                            {isSubmitting ? t('googleSignup.busy') : t('googleSignup.button')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default GoogleSignupPage;