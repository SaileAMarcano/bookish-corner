import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import Icon from './Icon';
import { getAvatarSrc } from './utils';

const SECTIONS =[
    { id: 'profile', icon: 'about' },
    { id: 'appearance', icon: 'sparkle' },
    { id: 'accessibility', icon: 'eye' },
];

const SEASON_THEMES = [
    { id: 'classic', image: '/sidebar-illustration.png' },
    { id: 'christmas', image: '/seasons/christmas/sidebar.png' },
]

function SettingsSection({ id, icon, children }) {
    const { t } = useTranslation();

    return (
        <section id={id} className="card settings-section" aria-labelledby={`settings-${id}`}>
            <div className="settings-section-head">
                <span className="settings-section-icon">
                    <Icon name={icon} size={17} />
                </span>
                <div>
                    <h2 id={`settings-${id}`} className="display settings-section-title">{t(`settings.${id}.title`)}</h2>
                    <p className="settings-section-sub">{t(`settings.${id}.subtitle`)}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

function SettingRow({ label, hint, children }) {
    return (
        <div className="settings-row">
            <div className="settings-row-text">
                <span className="settings-row-label">{label}</span>
                {hint && <span className="settings-row-hint">{hint}</span>}
            </div>
            <div className="settings-row-control">{children}</div>
        </div>
    );
}

function SettingsPage({ currentUser, theme, seasonTheme, onThemeToggle, onSeasonThemeChange, onLanguageChange, reduceMotion, onReduceMotionToggle }) {
    const { t } = useTranslation();

    return (
        <main className="page settings-page">
            <div className="edit-head">
                <h1 className="display edit-title">{t('settings.title')}</h1>
            </div>

            <div className="settings-layout">
                <nav className="card settings-index" aria-label={t('settings.index')}>
                    {SECTIONS.map((section) => (
                        <a key={section.id} href={`#${section.id}`} className="settings-index-link">
                            <Icon name={section.icon} size={16} />
                            {t(`settings.${section.id}.title`)}
                        </a>
                    ))}
                </nav>

                <div className="settings-sections">
                    <SettingsSection id="profile" icon="about">
                        <div className="settings-profile">
                            <img className="settings-avatar" src={getAvatarSrc(currentUser.avatarUrl)} alt="" />
                            <div className="settings-profile-text">
                                <span className="settings-profile-name">{currentUser.displayName || currentUser.username}</span>
                                <span className="settings-profile-user">@{currentUser.username}</span>
                            </div>
                            <Link to="/profile/edit" className="ghost-button settings-profile-edit">
                                <Icon name="pencil" size={14} />
                                {t('app.editProfile')}
                            </Link>
                        </div>
                    </SettingsSection>

                    <SettingsSection id="appearance" icon="sparkle">
                        <div className="settings-block">
                            <div className="settings-row-text">
                                <span className="settings-row-label">{t('settings.appearance.season')}</span>
                                <span className="settings-row-hint">{t('settings.appearance.seasonHint')}</span>
                            </div>

                            <div className="settings-themes" role="radiogroup" aria-label={t('settings.appearance.season')}>
                                {SEASON_THEMES.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={seasonTheme === option.id}
                                        className={`settings-theme ${seasonTheme === option.id ? 'active' : ''}`}
                                        onClick={() => onSeasonThemeChange(option.id)}
                                    >
                                        <span className={`settings-theme-preview settings-theme-preview-${option.id}`}>
                                            <img src={option.image} alt="" />
                                        </span>
                                        <span className="settings-theme-name">
                                            {t(`themes.${option.id}`)}
                                            {seasonTheme === option.id && <Icon name="check" size={15} />}
                                        </span>
                                        <span className="settings-theme-desc">{t(`settings.appearance.themes.${option.id}`)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <SettingRow label={t('settings.appearance.dark')} hint={t('settings.appearance.darkHint')}>
                            <button
                                type="button"
                                className="theme-switch"
                                role="switch"
                                aria-checked={theme === 'dark'}
                                aria-label={t('settings.appearance.dark')}
                                onClick={onThemeToggle}
                            >
                                <Icon name="sun" size={16} />
                                <span className="theme-switch-track">
                                    <span className="theme-switch-thumb"></span>
                                </span>
                                <Icon name="moon" size={16} />
                            </button>
                        </SettingRow>

                        <SettingRow label={t('settings.appearance.language')} hint={t('settings.appearance.languageHint')}>
                            <LanguageSwitcher onChange={onLanguageChange} />
                        </SettingRow>
                    </SettingsSection>

                    <SettingsSection id="accessibility" icon="eye">
                        <SettingRow label={t('settings.accessibility.reduceMotion')} hint={t('settings.accessibility.reduceMotionHint')}>
                            <button
                                type="button"
                                className="settings-switch"
                                role="switch"
                                aria-checked={reduceMotion}
                                aria-label={t('settings.accessibility.reduceMotion')}
                                onClick={onReduceMotionToggle}
                            >
                                <span className="settings-switch-thumb"></span>
                            </button>
                        </SettingRow>
                    </SettingsSection>
                </div>
            </div>
        </main>
    );
}

export default SettingsPage;