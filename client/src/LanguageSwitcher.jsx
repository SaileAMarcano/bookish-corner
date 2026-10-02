import { useTranslation } from 'react-i18next';
import { LANGUAGES } from './i18n';

// EN / ES buttons. onChange is optional: logged-in users also save the choice in their profile.
function LanguageSwitcher({ onChange }) {
    const { t, i18n } = useTranslation();

    const choose = (language) => {
        if (language === i18n.language) return;
        i18n.changeLanguage(language);
        if (onChange) onChange(language);
    };

    return (
        <div className="language-switcher" role="group" aria-label={t('language.label')}>
            {LANGUAGES.map((language) => (
                <button
                    key={language}
                    type="button"
                    className={`language-option ${i18n.language === language ? 'active' : ''}`}
                    onClick={() => choose(language)}
                    aria-pressed={i18n.language === language}
                    title={t(`language.${language}`)}
                >
                    {language.toUpperCase()}
                </button>
            ))}
        </div>
    );
}

export default LanguageSwitcher;
