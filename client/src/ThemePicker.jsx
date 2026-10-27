import { useTranslation } from 'react-i18next';
import Icon from './Icon';

const SEASON_THEMES = ['classic', 'christmas', 'valentine', 'sage', 'lavender', 'amber', 'teal', 'grimm'];
const PRIVATE_THEMES = ['grimm'];

function ThemePicker({ current, unlocked, onChange }) {
    const { t } = useTranslation();

    return (
        <div className="theme-picker" role="radiogroup" aria-label={t('themes.title')}>
            <div className="theme-picker-title">{t('themes.title')}</div>

            {SEASON_THEMES.filter((theme) => !PRIVATE_THEMES.includes(theme) || unlocked.includes(theme)).map((theme) => {
                const isLocked = !unlocked.includes(theme);

                return (
                    <button
                        key={theme}
                        type="button"
                        role="radio"
                        aria-checked={current === theme}
                        className={`theme-option ${current === theme ? 'active' : ''}`}
                        disabled={isLocked}
                        title={isLocked ? t('themes.locked') : undefined}
                        onClick={() => onChange(theme)}
                    >
                        <span className={`theme-swatch theme-swatch-${theme}`}></span>
                        <span className="theme-option-name">{t(`themes.${theme}`)}</span>
                        {isLocked && <Icon name="lock" size={14} />}
                    </button>
                );
            })}
        </div>
    );
}

export default ThemePicker