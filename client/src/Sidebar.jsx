import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon';

const NAV_ITEMS = [
    { to: '/', label: 'Home', icon: 'home' },
    { to: '/reading', label: 'Currently Reading', icon: 'reading' },
    { to: '/profile?tab=library', label: 'My Library', icon: 'library' },
    { to: '/profile?tab=reviews', label: 'Reviews', icon: 'reviews' },
    { to: '/profile?tab=favorites', label: 'Favorites', icon: 'favorites' },
    { to: '/profile?tab=following', label: 'Following', icon: 'following' },
    { to: '/profile?tab=about', label: 'About me', icon: 'about' },
];

function isActive(item, location) {
    const [path, query] = item.to.split('?');

    if (location.pathname !== path) return false;
    if (!query) return true;

    const tab = new URLSearchParams(location.search).get('tab') || 'library';
    return query === `tab=${tab}`;
}

function Sidebar() {
    const location = useLocation();

    return (
        <aside className="sidebar">
            <Link to="/" className="sidebar-logo">
                <Icon name="library" size={30} />
                <span className="display">Bookish<br />Corner</span>
            </Link>

            <nav className="sidebar-nav">
                {NAV_ITEMS.map((item) => (
                    <Link key={item.to} to={item.to} className={`sidebar-link ${isActive(item, location) ? 'active' : ''}`} aria-label={item.label}>
                        <Icon name={item.icon} size={20} />
                        <span className="sidebar-label">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <img className="sidebar-illustration" src="/sidebar-illustration.png" alt="" />
        </aside>
    );
}

export default Sidebar