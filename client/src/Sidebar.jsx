import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

const NAV_ITEMS = [
    { to: '/', label: 'nav.home', icon: 'home' },
    { to: '/library', label: 'nav.library', icon: 'library' },
    {
        key: 'profile',
        label: 'nav.profile',
        icon: 'about',
        children: [
            { to: '/profile?tab=posts', label: 'nav.profile', icon: 'about' },
            { to: '/profile?tab=favorites', label: 'nav.favorites', icon: 'favorites' },
            { to: '/profile?tab=following', label: 'nav.following', icon: 'following' },
            { to: '/profile?tab=lists', label: 'nav.lists', icon: 'lists' },
        ],
    },
    {
        key: 'explore',
        label: 'nav.explore',
        icon: 'search',
        children: [
            { to: '/tags', label: 'nav.tags', icon: 'tag' },
            { to: '/genres', label: 'nav.genres', icon: 'genres' },
        ],
    },
    { to: '/profile?tab=reviews', label: 'nav.reviews', icon: 'reviews' },
];

const ADMIN_ITEMS = [
    { to: '/admin', label: 'nav.adminSummary', icon: 'genres', roles: ['admin', 'moderator'] },
    { to: '/admin/moderation', label: 'nav.adminModeration', icon: 'flag', roles: ['admin', 'moderator'] },
    { to: '/admin/people', label: 'nav.adminPeople', icon: 'following', roles: ['admin', 'moderator'] },
    { to: '/admin/invites', label: 'nav.adminInvites', icon: 'mail', roles: ['admin', 'moderator'] },
    { to: '/admin/catalog', label: 'nav.adminCatalog', icon: 'library', roles: ['admin', 'editor'] },
    { to: '/admin/activity', label: 'nav.adminActivity', icon: 'clock', roles: ['admin', 'moderator'] },
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

function isGroupActive(item, location) {
    if (item.key === 'profile') {
        const tab = new URLSearchParams(location.search).get('tab') || 'posts';
        return location.pathname === '/profile' && tab !== 'reviews';
    }

    if (item.key === 'explore') {
        return item.children.some((child) => isActive(child, location))
            || location.pathname.startsWith('/genre/')
            || location.pathname.startsWith('/tagged/');
    }

    return item.children.some((child) => isActive(child, location));
}

function closeMenus(container, restoreFocus = false) {
    container?.querySelectorAll('.sidebar-nav-group[open]').forEach((group) => {
        if (restoreFocus && group.contains(document.activeElement)) {
            group.querySelector('summary')?.focus();
        }
        group.open = false;
    });
}

function Sidebar({ readingCount = 0, seasonTheme, staffRole, moderationCount = 0 }) {
    const location = useLocation();
    const { t } = useTranslation();
    const navRef = useRef(null);
    const settingsActive = location.pathname === '/profile/edit';
    const adminItems = ADMIN_ITEMS.filter((item) => item.roles.includes(staffRole));
    const illustration = SEASON_ILLUSTRATIONS.includes(seasonTheme) ? `/seasons/${seasonTheme}/sidebar.png` : '/sidebar-illustration.png';
    const mark = SEASON_MARKS[seasonTheme] || '/logo-mark.png';

    useEffect(() => {
        closeMenus(navRef.current);
    }, [location.pathname, location.search]);

    useEffect(() => {
        function handlePointerDown(event) {
            if (!navRef.current?.contains(event.target)) {
                closeMenus(navRef.current);
            }
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                closeMenus(navRef.current, true);
            }
        }

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    function renderLink(item, nested = false) {
        const active = isActive(item, location);
        const count = item.to === '/library' ? readingCount
            : item.to === '/admin/moderation' ? moderationCount : 0;

        return (
            <Link
                key={item.to}
                to={item.to}
                className={`sidebar-link ${active ? 'active' : ''} ${nested ? 'sidebar-sublink' : ''}`}
                aria-label={t(item.label)}
                aria-current={active ? 'page' : undefined}
                onClick={() => closeMenus(navRef.current)}
            >
                <Icon name={item.icon} size={nested ? 18 : 20} />
                <span className="sidebar-label">{t(item.label)}</span>
                {count > 0 && <span className="sidebar-badge">{count}</span>}
            </Link>
        );
    }

    return (
        <aside className="sidebar">
            <Link to="/" className="sidebar-logo" aria-label="A Library of Us">
                <img className="sidebar-logo-image" src={illustration} alt="" />
                <img className="sidebar-logo-mark" src={mark} alt="" />
                <span className="sidebar-logo-name">A Library<span className="sidebar-logo-accent">of Us</span></span>
                <span className="sidebar-tagline">{t('nav.tagline')}</span>
            </Link>

            <nav className="sidebar-nav" ref={navRef}>
                {NAV_ITEMS.map((item) => item.children ? (
                    <details className="sidebar-nav-group" name="sidebar-navigation" key={item.key}>
                        <summary
                            className={`sidebar-link ${isGroupActive(item, location) ? 'active' : ''}`}
                            aria-label={t(item.label)}
                        >
                            <Icon name={item.icon} size={20} />
                            <span className="sidebar-label">{t(item.label)}</span>
                            <span className="sidebar-group-arrow"><Icon name="chevronDown" size={14} /></span>
                        </summary>
                        <div className="sidebar-subnav">
                            {item.children.map((child) => renderLink(child, true))}
                        </div>
                    </details>
                ) : renderLink(item))}
            </nav>

            <hr className="sidebar-divider" />
            <Link
                to="/profile/edit"
                className={`sidebar-link sidebar-settings ${settingsActive ? 'active' : ''}`}
                aria-label={t('nav.settings')}
                aria-current={settingsActive ? 'page' : undefined}
            >
                <Icon name="settings" size={20} />
                <span className="sidebar-label">{t('nav.settings')}</span>
            </Link>

            {adminItems.length > 0 && (
                <details className="sidebar-admin" open={location.pathname.startsWith('/admin')}>
                    <summary className="sidebar-link" aria-label={t('nav.adminSection')}>
                        <Icon name="settings" size={20} />
                        <span className="sidebar-label">{t('nav.adminSection')}</span>
                        <span className="sidebar-group-arrow"><Icon name="chevronDown" size={14} /></span>
                    </summary>
                    <div className="sidebar-subnav">
                        {adminItems.map((item) => renderLink(item, true))}
                    </div>
                </details>
            )}
        </aside>
    );
}

export default Sidebar;