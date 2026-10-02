import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const PUBLIC_LINKS = [
    { to: '/', label: 'public.home' },
    { to: '/about', label: 'public.about' },
    { to: '/features', label: 'public.features' },
];

function PublicHeader() {
    const { t } = useTranslation();

    return (
        <header className="public-header">
            <Link to="/" className="public-brand" aria-label={t('public.homeLink')}>
                <img src="/logo-mark.png" alt="" className="public-brand-mark" />
                <span className="display public-brand-name">Bookish Corner</span>
            </Link>

            <nav className="public-nav">
                {PUBLIC_LINKS.map((link) => (
                    <NavLink key={link.to} to={link.to} end className="public-nav-link">
                        {t(link.label)}
                    </NavLink>
                ))}
            </nav>

            <div className="public-actions">
                <LanguageSwitcher />
                <Link to="/login" className="public-login">{t('public.login')}</Link>
                <Link to="/signup" className="public-signup">{t('public.signup')}</Link>
            </div>
        </header>
    );
}

export default PublicHeader;