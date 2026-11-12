import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { BETA_LINKS } from './betaConfig';

const FOOTER_WORDS = ['footer.word1', 'footer.word2', 'footer.word3'];

function PublicFooter() {
    const { t } = useTranslation();

    return (
        <footer className="public-footer">
            <p className="display public-footer-title">{t('footer.title')}</p>

            <p className="public-footer-words">
                {FOOTER_WORDS.map((word) => (
                    <span key={word}>{t(word)}</span>
                ))}
            </p>

            <ul className="public-footer-social">
                <li>
                    <a href={BETA_LINKS.instagram} target="_blank" rel="noopener noreferrer">
                        <Icon name="instagram" size={18} />
                        @alibraryofus_
                    </a>
                </li>
                <li>
                    <a href={BETA_LINKS.discord} target="_blank" rel="noopener noreferrer">
                        <Icon name="discord" size={18} />
                        {t('footer.discord')}
                    </a>
                </li>
            </ul>

            <nav className="public-footer-legal" aria-label={t('legal.nav')}>
                <Link to="/guidelines">{t('legal.guidelines')}</Link>
                <Link to="/privacy">{t('legal.privacy')}</Link>
                <Link to="/terms">{t('legal.terms')}</Link>
            </nav>

            <p className="public-footer-credit">{t('footer.credit')}</p>
        </footer>
    );
}

export default PublicFooter;