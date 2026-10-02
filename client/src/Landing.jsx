import { Link } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

const HERO_LINES = ['landing.line1', 'landing.line2', 'landing.line3'];

function Landing() {
    const { t } = useTranslation();

    return (
        <div className="landing">
            <PublicHeader />

            <main className="public-hero">
                <div className="public-hero-text">
                    <p className="public-eyebrow">{t('landing.eyebrow')}</p>

                    <h1 className="display public-hero-title">
                        {HERO_LINES.map((line) => (
                            <span key={line} className="public-hero-line">
                                {t(line)}
                                <span className="public-dot">.</span>
                            </span>
                        ))}
                    </h1>

                    <p className="public-hero-lead">{t('landing.lead')}</p>

                    <div className="public-hero-actions">
                        <Link to="/signup" className="public-signup public-cta">
                            {t('public.startReading')}
                            <Icon name="arrowRight" size={18} />
                        </Link>
                        <Link to="/features" className="public-login public-cta">
                            {t('public.learnMore')}
                        </Link>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}

export default Landing;