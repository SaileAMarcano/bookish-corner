import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { ADMIN_ITEMS } from './adminNav';

const NAV_ITEMS = [
    { to: '/', label: 'nav.home', icon: 'home' },
    {
        key: 'library',
        label: 'nav.library',
        icon: 'library',
        tour: 'library',
        children: [
            { to: '/library', label: 'nav.tracking', icon: 'reading' },
            { to: '/library/shelves', label: 'nav.myBookshelf', icon: 'library' },
        ],
    },
    {
        key: 'profile',
        tour: 'lists',
        label: 'nav.profile',
        icon: 'about',
        children: [
            { to: '/profile?tab=posts', label: 'nav.profile', icon: 'about' },
            { to: '/profile?tab=favorites', label: 'nav.favorites', icon: 'favorites' },
            { to: '/profile?tab=following', label: 'nav.following', icon: 'following' },
            { to: '/profile?tab=lists', label: 'nav.lists', icon: 'lists' },
        ],
    },
    { to: '/explore', label: 'nav.explore', icon: 'search' },
    { to: '/reviews', label: 'nav.reviews', icon: 'feather' },
];

const SEASON_ILLUSTRATIONS = ['classic', 'christmas', 'seaside', 'moonlit'];

function isActive(item, location) {
    const [path, query] = item.to.split('?');

    if (path === '/explore') {
        return location.pathname === path || location.pathname.startsWith('/genre/') || location.pathname.startsWith('/tagged/');
    }

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

    return item.children.some((child) => isActive(child, location));
}

const FLYOUT_QUERY = '(max-width: 1400px)';

function closeMenus(container, restoreFocus = false, target = null) {
    const selector = window.matchMedia(FLYOUT_QUERY).matches
        ? '.sidebar-nav-group[open], .sidebar-admin[open]'
        : '.sidebar-nav-group[open]';

    container?.querySelectorAll(selector).forEach((group) => {
        if (target && group.contains(target)) return;
        if (restoreFocus && group.contains(document.activeElement)) {
            group.querySelector('summary')?.focus();
        }
        group.open = false;
    });
}

function Sidebar({ readingCount = 0, seasonTheme, staffRole, moderationCount = 0, supportCount = 0 }) {
    const location = useLocation();
    const { t } = useTranslation();
    const navRef = useRef(null);
    const settingsActive = location.pathname === '/settings';
    const helpActive = location.pathname === '/help';
    const adminItems = ADMIN_ITEMS.filter((item) => item.roles.includes(staffRole));
    const illustration = SEASON_ILLUSTRATIONS.includes(seasonTheme) ? `/seasons/${seasonTheme}/sidebar.png` : '/sidebar-illustration.png';
    const mark = '/logo-mark.png';

    useEffect(() => {
        closeMenus(navRef.current);
    }, [location.pathname, location.search]);

    useEffect(() => {
        function handlePointerDown(event) {
            closeMenus(navRef.current, false, event.target);
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
            : item.to === '/admin/moderation' ? moderationCount
            : item.to === '/admin/support' ? supportCount : 0;

        return (
            <Link
                key={item.to}
                to={item.to}
                className={`sidebar-link ${active ? 'active' : ''} ${nested ? 'sidebar-sublink' : ''}`}
                data-tour={item.tour}
                aria-label={t(item.label)}
                aria-describedby={count > 0 ? `sidebar-count-${item.to.replace(/\W/g, '')}` : undefined}
                aria-current={active ? (location.pathname === item.to.split('?')[0] ? 'page' : 'location') : undefined}
                onClick={() => closeMenus(navRef.current)}
            >
                <Icon name={item.icon} size={nested ? 18 : 20} />
                <span className="sidebar-label">{t(item.label)}</span>
                {count > 0 && <span className="sidebar-badge" id={`sidebar-count-${item.to.replace(/\W/g, '')}`} aria-hidden="true">{count}</span>}
            </Link>
        );
    }

    return (
        <aside className="sidebar" aria-label={t('nav.sidebar')} ref={navRef}>
            <Link to="/" className="sidebar-logo" aria-label="A Library of Us">
                <img className="sidebar-logo-image" src={illustration} alt="" />
                <img className="sidebar-logo-mark" src={mark} alt="" />
                <span className="sidebar-logo-name">A Library<span className="sidebar-logo-accent">of Us</span></span>
                <span className="sidebar-tagline">{t('nav.tagline')}</span>
            </Link>

            <nav className="sidebar-nav">
                {NAV_ITEMS.map((item) => item.children ? (
                    <details className="sidebar-nav-group" name="sidebar-navigation" key={item.key}>
                        <summary
                            className={`sidebar-link ${isGroupActive(item, location) ? 'active' : ''}`}
                               data-tour={item.tour} 
                            aria-label={t(item.label)}
                        >
                            <Icon name={item.icon} size={20} />
                            <span className="sidebar-label">{t(item.label)}</span>
                            {item.key === 'library' && readingCount > 0 && <span className="sidebar-badge" aria-hidden="true">{readingCount}</span>}
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
                to="/settings"
                className={`sidebar-link sidebar-settings ${settingsActive ? 'active' : ''}`}
                aria-label={t('nav.settings')}
                aria-current={settingsActive ? 'page' : undefined}
            >
                <Icon name="settings" size={20} />
                <span className="sidebar-label">{t('nav.settings')}</span>
            </Link>
            <Link
                to="/help"
                state={{ from: location.pathname + location.search }}
                className={`sidebar-link sidebar-settings ${helpActive ? 'active' : ''}`}
                aria-label={t('nav.help')}
                aria-current={helpActive ? 'page' : undefined}
            >
                <Icon name="help" size={20} />
                <span className="sidebar-label">{t('nav.help')}</span>
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