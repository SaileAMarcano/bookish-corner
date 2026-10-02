import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import Icon from './Icon';
import { apiFetch } from './api';

const READER_TYPES = [
    { value: 'first-time', icon: 'sparkle', goal: 3 },
    { value: 'casual', icon: 'reading', goal: 12 },
    { value: 'avid', icon: 'library', goal: 30 },
];

function Welcome({ currentUser, onDone, onLanguageChange }) {
    const { t } = useTranslation();
    const [choice, setChoice] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const selected = READER_TYPES.find((type) => type.value === choice);

    const finish = (useGoal) => {
        setIsSaving(true);
        setError('');

        const body = { readerType: choice };
        if (useGoal) body.readingGoal = selected.goal;

        apiFetch('/api/profile', { method: 'PATCH', body })
            .then(() => onDone())
            .catch((error) => {
                setError(error.message);
                setIsSaving(false);
            });
    };

    return (
        <div className="access-page" style={{ backgroundImage: 'url(/auth-welcome.jpg)' }}>
            <div className="access-language">
                <LanguageSwitcher onChange={onLanguageChange} />
            </div>
            <div className="access-card welcome-card">
                <img src="/logo.png" alt="Bookish Corner" className="access-logo welcome-logo" />

                <p className="welcome-hello">{t('welcome.hello', { name: currentUser.displayName })}</p>
                <h1 className="display access-title">{t('welcome.question')}</h1>
                <p className="access-subtitle">{t('welcome.noWrongAnswer')}</p>

                <div className="welcome-options">
                    {READER_TYPES.map((type) => (
                        <button key={type.value}
                            type="button"
                            className={type.value === choice ? 'welcome-option selected' : 'welcome-option'}
                            onClick={() => setChoice(type.value)}
                            aria-pressed={type.value === choice}
                            disabled={isSaving} >

                            <span className="welcome-option-icon">
                                <Icon name={type.icon} size={22} />
                            </span>
                            <span className="welcome-option-text">
                                <strong>{t(`welcome.types.${type.value}.title`)}</strong>
                                {t(`welcome.types.${type.value}.text`)}
                            </span>
                        </button>
                    ))}
                </div>

                {selected && (
                    <div className="welcome-goal">
                        <p className="welcome-goal-text">
                            {t('welcome.suggested')} <strong>{t('welcome.goalBooks', { count: selected.goal })}</strong> {t('welcome.thisYear')}
                        </p>
                        <button type="button" className="access-submit"
                            onClick={() => finish(true)}
                            disabled={isSaving} >
                            {isSaving ? t('common.saving') : t('welcome.setGoal')}
                        </button>
                        <button type="button" className="welcome-skip"
                            onClick={() => finish(false)}
                            disabled={isSaving} >
                            {t('welcome.skip')}
                        </button>
                    </div>
                )}

                {error && <p className="access-error">{error}</p>}
            </div>
        </div>
    );
}

export default Welcome;