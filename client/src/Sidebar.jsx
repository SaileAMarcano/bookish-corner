import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

const NAV_ITEMS = [
    { to: '/', label: 'nav.home', icon: 'home' },
    { to: '/reading', label: 'nav.reading', icon: 'reading' },
    { to: '/library', label: 'nav.library', icon: 'library' },
    { to: '/profile?tab=lists', label: 'nav.lists', icon: 'lists', hideOnPhone: true },
    { to: '/tags', label: 'nav.tags', icon: 'tag' },
    { to: '/genres', label: 'nav.genres', icon: 'genres' },
    { to: '/profile?tab=reviews', label: 'nav.reviews', icon: 'reviews', hideOnPhone: true },
    { to: '/profile?tab=favorites', label: 'nav.favorites', icon: 'favorites' },
    { to: '/profile?tab=following', label: 'nav.following', icon: 'following' },
    { to: '/profile?tab=posts', label: 'nav.profile', icon: 'about' },
];

const SEASON_ILLUSTRATIONS = ['classic', 'christmas', 'valentine', 'sage', 'lavender', 'amber', 'teal', 'grimm'];

const SEASON_MARKS = {
    grimm: '/seasons/grimm/favicon.png',
};

function isActive(item, location) {
    const [path, query] = item.to.split('?');

    if (location.pathname !== path) return false;
    if (!query) return true;

    const tab = new URLSearchParams(location.search).get('tab') || 'posts';
    return query === `tab=${tab}`;
}

function Sidebar({ readingCount, seasonTheme }) {
    const location = useLocation();
    const { t } = useTranslation();
    const settingsActive = location.pathname === '/profile/edit';
    const illustration = SEASON_ILLUSTRATIONS.includes(seasonTheme) ? `/seasons/${seasonTheme}/sidebar.png` : '/sidebar-illustration.png';
    const mark = SEASON_MARKS[seasonTheme] || '/logo-mark.png';

    return (
        <aside className="sidebar">
            <Link to="/" className="sidebar-logo" aria-label="A Library of Us">
                <img className="sidebar-logo-image" src={illustration} alt="" />
                <img className="sidebar-logo-mark" src={mark} alt="" />
                <span className="sidebar-logo-name">A Library<span className="sidebar-logo-accent">of Us</span></span>
                <span className="sidebar-tagline">{t('nav.tagline')}</span>
            </Link>

            <nav className="sidebar-nav">
                {NAV_ITEMS.map((item) => (
                    <Link key={item.to} to={item.to} className={`sidebar-link ${isActive(item, location) ? 'active' : ''} ${item.hideOnPhone ? 'phone-hidden' : ''}`} aria-label={t(item.label)}>
                        <Icon name={item.icon} size={20} />
                        <span className="sidebar-label">{t(item.label)}</span>
                        {item.to === '/reading' && readingCount > 0 && <span className="sidebar-badge">{readingCount}</span>}
                    </Link>
                ))}
            </nav>

            <hr className="sidebar-divider" />
            <Link to="/profile/edit" className={`sidebar-link sidebar-settings ${settingsActive ? 'active' : ''}`} aria-label={t('nav.settings')}>
                <Icon name="settings" size={20} />
                <span className="sidebar-label">{t('nav.settings')}</span>
            </Link>
        </aside>
    );
}

export default Sidebar