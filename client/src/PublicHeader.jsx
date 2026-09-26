import { Link, NavLink } from 'react-router-dom';

const PUBLIC_LINKS = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/features', label: 'Features' },
];

function PublicHeader() {
    return (
        <header className="public-header">
            <Link to="/" className="public-brand" aria-label="Bookish Corner home">
                <img src="/logo-mark.png" alt="" className="public-brand-mark" />
                <span className="display public-brand-name">Bookish Corner</span>
            </Link>

            <nav className="public-nav">
                {PUBLIC_LINKS.map((link) => (
                    <NavLink key={link.to} to={link.to} end className="public-nav-link">
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            <div className="public-actions">
                <Link to="/login" className="public-login">Log in</Link>
                <Link to="/signup" className="public-signup">Sign up</Link>
            </div>
        </header>
    );
}

export default PublicHeader;