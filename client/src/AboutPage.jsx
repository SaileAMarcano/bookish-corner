import { Link } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

const ABOUT_VALUES = [
    { icon: 'library', key: 'readers' },
    { icon: 'following', key: 'community' },
    { icon: 'sparkle', key: 'journey' },
];

function AboutPage() {
    const { t } = useTranslation();

    return (
        <div className="public-page">
            <PublicHeader />

            <main>
                <section className="public-hero public-hero-about">
                    <div className="public-hero-text">
                        <p className="public-eyebrow">{t('about.eyebrow')}</p>

                        <h1 className="display public-hero-title">
                            {t('about.title')}
                            <span className="public-title-heart">
                                <Icon name="favorites" size={36} />
                            </span>
                        </h1>

                        <p className="public-hero-lead">{t('about.lead1')}</p>
                        <p className="public-hero-lead">{t('about.lead2')}</p>

                        <div className="public-hero-actions">
                            <Link to="/signup" className="public-signup public-cta">
                                {t('public.startReading')}
                                <Icon name="arrowRight" size={18} />
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="about-columns">
                    <div className="about-story">
                        <p className="public-eyebrow">{t('about.storyEyebrow')}</p>
                        <h2 className="display about-heading">{t('about.storyTitle')}</h2>
                        <p className="about-text">{t('about.story1')}</p>
                        <p className="about-text">{t('about.story2')}</p>
                    </div>

                    <ul className="about-values">
                        {ABOUT_VALUES.map((value) => (
                            <li key={value.key} className="about-value">
                                <span className="about-value-icon">
                                    <Icon name={value.icon} size={22} />
                                </span>
                                <div>
                                    <h3 className="display about-value-title">{t(`about.values.${value.key}.title`)}</h3>
                                    <p className="about-text">{t(`about.values.${value.key}.text`)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <figure className="about-quote">
                        <Icon name="favorites" size={22} />
                        <blockquote className="display about-quote-text">
                            {t('about.quote')}
                        </blockquote>
                        <img src="/logo-mark.png" alt="" className="about-quote-image" />
                    </figure>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}

export default AboutPage;