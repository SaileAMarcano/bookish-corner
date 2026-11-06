import { useTranslation } from 'react-i18next';

const SEASON_THEMES = ['classic', 'christmas'];

function ThemePicker({ current, onChange }) {
    const { t } = useTranslation();

    return (
        <div className="theme-picker" role="radiogroup" aria-label={t('themes.title')}>
            <div className="theme-picker-title">{t('themes.title')}</div>

            {SEASON_THEMES.map((theme) => (
                <button
                    key={theme}
                    type="button"
                    role="radio"
                    aria-checked={current === theme}
                    className={`theme-option ${current === theme ? 'active' : ''}`}
                    onClick={() => onChange(theme)}
                >
                    <span className={`theme-swatch theme-swatch-${theme}`}></span>
                    <span className="theme-option-name">{t(`themes.${theme}`)}</span>
                </button>
            ))}
        </div>
    );
}

export default ThemePicker