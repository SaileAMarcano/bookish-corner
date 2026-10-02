import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import Icon from './Icon';
import { apiFetch } from './api';

const MODES = {
    login: {
        background: '/auth-login.jpg',
        subtitleIcon: 'favorites',
        switchTo: '/signup',
    },
    signup: {
        background: '/auth-signup.jpg',
        subtitleIcon: 'sparkle',
        switchTo: '/login',
    },
};

const PASSWORD_RULES = [
    { label: 'auth.rules.length', test: (p) => p.length >= 8 },
    { label: 'auth.rules.number', test: (p) => /\d/.test(p) },
    { label: 'auth.rules.letter', test: (p) => /[a-z]/i.test(p) },
];

function AuthPage({ mode, onLogin }) {
    const { t, i18n } = useTranslation();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const text = MODES[mode];
    const isSignup = mode === 'signup';
    const passwordOk = PASSWORD_RULES.every((rule) => rule.test(password));

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const cleanEmail = email.trim();
        const register = isSignup
            ? apiFetch('/api/register', { method: 'POST', body: { username: username.trim(), email: cleanEmail, password, language: i18n.language } })
            : Promise.resolve();

        register
            .then(() => apiFetch('/api/login', { method: 'POST', body: { email: cleanEmail, password } }))
            .then((user) => onLogin(user))
            .catch((er) => {
                setError(er.message);
                setIsSubmitting(false);
            });
    };

    return (
        <div className="access-page" style={{ backgroundImage: `url(${text.background})` }}>
            <Link to="/" className="access-back" aria-label={t('auth.backHome')}>
                <Icon name="home" size={20} />
            </Link>
            <div className="access-language">
                <LanguageSwitcher />
            </div>
            <div className="access-card">
                <Link to="/" className="access-brand">
                    <img src="/logo.png" alt="Bookish Corner" className="access-logo" />
                </Link>

                <h1 className="display access-title">{t(`auth.${mode}.title`)}</h1>
                <p className="access-subtitle">
                    {t(`auth.${mode}.subtitle`)}
                    <Icon name={text.subtitleIcon} size={14} />
                </p>
                <form className="access-form" onSubmit={handleSubmit}>
                    {isSignup && (
                        <label className="access-field">
                            <span className="access-label">{t('auth.username')}</span>
                            <span className="access-input-wrap">
                                <Icon name="about" size={18} />
                                <input
                                    className="access-input"
                                    type="text"
                                    placeholder={t('auth.usernamePlaceholder')}
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </span>
                        </label>
                    )}

                    <label className="access-field">
                        <span className="access-label">{t('auth.email')}</span>
                        <span className="access-input-wrap">
                            <Icon name="mail" size={18} />
                            <input
                                className="access-input"
                                type="email"
                                placeholder={t('auth.emailPlaceholder')}
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </span>
                    </label>

                    <label className="access-field">
                        <span className="access-label">{t('auth.password')}</span>
                        <span className="access-input-wrap">
                            <Icon name="lock" size={18} />
                            <input
                                className="access-input"
                                type={showPassword ? 'text' : 'password'}
                                placeholder={isSignup ? t('auth.passwordPlaceholderNew') : t('auth.passwordPlaceholder')}
                                autoComplete={isSignup ? 'new-password' : 'current-password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="access-eye"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                            >
                                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                            </button>
                        </span>
                    </label>

                    {isSignup && (
                        <div className="access-rules">
                            <p className="access-rules-title">{t('auth.rulesTitle')}</p>
                            <ul className="access-rules-list">
                                {PASSWORD_RULES.map((rule) => {
                                    const passed = rule.test(password);
                                    return (
                                        <li key={rule.label} className={passed ? 'access-rule passed' : 'access-rule'}>
                                            <span className="access-rule-box">
                                                {passed && <Icon name="check" size={12} />}
                                            </span>
                                            {t(rule.label)}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    {error && <p className="access-error">{error}</p>}
                    <button type="submit" className="access-submit" disabled={isSubmitting || (isSignup && !passwordOk)}>
                        {isSubmitting ? t(`auth.${mode}.busy`) : t(`auth.${mode}.button`)}
                    </button>
                </form>

                <p className="access-switch">
                    {t(`auth.${mode}.switchText`)} <Link to={text.switchTo}>{t(`auth.${mode}.switchLink`)}</Link>
                </p>
            </div>
        </div>
    );
}

export default AuthPage;