import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import Icon from './Icon';
import { apiFetch } from './api';
import { PASSWORD_RULES } from './passwordRules';

function PasswordPage({ mode }) {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const isReset = mode === 'reset';
    const passwordOk = PASSWORD_RULES.every((rule) => rule.test(password));
    const showForm = !done && (!isReset || token);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setError('');
        setIsSubmitting(true);

        const request = isReset
            ? apiFetch('/api/password/reset', { method: 'POST', body: { token, password } })
            : apiFetch('/api/password/forgot', { method: 'POST', body: { email: email.trim() } });

        request
            .then(() => setDone(true))
            .catch((er) => setError(er.message))
            .finally(() => setIsSubmitting(false));
    };

    return (
        <div className="access-page" style={{ backgroundImage: 'url(/auth-login.jpg)' }}>
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

                <h1 className="display access-title">{t(`password.${mode}.title`)}</h1>
                <p className="access-subtitle">{t(`password.${mode}.subtitle`)}</p>

                {done && (
                    <p className="access-done" role="status">
                        {t(`password.${mode}.done`, { email: email.trim() })}
                    </p>
                )}

                {done && isReset && (
                    <button type="button" className="access-submit" onClick={() => window.location.assign('/login')}>
                        {t('password.reset.login')}
                    </button>
                )}

                {isReset && !token && <p className="access-error">{t('password.reset.noToken')}</p>}

                {showForm && (
                    <form className="access-form" onSubmit={handleSubmit}>
                        {!isReset && (
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
                        )}

                        {isReset && (
                            <label className="access-field">
                                <span className="access-label">{t('password.reset.label')}</span>
                                <span className="access-input-wrap">
                                    <Icon name="lock" size={18} />
                                    <input
                                        className="access-input"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={t('auth.passwordPlaceholderNew')}
                                        autoComplete="new-password"
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
                        )}

                        {isReset && (
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
                        <button type="submit" className="access-submit" disabled={isSubmitting || (isReset && !passwordOk)}>
                            {isSubmitting ? t(`password.${mode}.busy`) : t(`password.${mode}.button`)}
                        </button>
                    </form>
                )}

                {!(done && isReset) && (
                    <p className="access-switch">
                        <Link to={isReset ? '/forgot-password' : '/login'}>{t(`password.${mode}.switchLink`)}</Link>
                    </p>
                )}
            </div>
        </div>
    );
}

export default PasswordPage;