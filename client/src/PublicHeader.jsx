import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const PUBLIC_LINKS = [
    { to: '/home', label: 'public.home', hidden: true },
    { to: '/about', label: 'public.about', hidden: true },
    { to: '/features', label: 'public.features', hidden: true },
];

const VISIBLE_LINKS = PUBLIC_LINKS.filter((link) => !link.hidden);
const SHOW_SIGNUP = false;

function PublicHeader() {
    const { t } = useTranslation();

    return (
        <header className="public-header">
            <Link to="/" className="public-brand" aria-label={t('public.homeLink')}>
                <img src="/logo-mark.png" alt="" className="public-brand-mark" />
                <span className="display public-brand-name">A Library of Us</span>
            </Link>

            {VISIBLE_LINKS.length > 0 && (
                <nav className="public-nav">
                    {VISIBLE_LINKS.map((link) => (
                        <NavLink key={link.to} to={link.to} end className="public-nav-link">
                            {t(link.label)}
                        </NavLink>
                    ))}
                </nav>
            )}

            <div className="public-actions">
                <LanguageSwitcher />
                <Link to="/login" className="public-login">{t('public.login')}</Link>
                {SHOW_SIGNUP && <Link to="/signup" className="public-signup">{t('public.signup')}</Link>}
            </div>
        </header>
    );
}

export default PublicHeader;