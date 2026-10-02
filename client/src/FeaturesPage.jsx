import PublicHeader from './PublicHeader';
import PublicBand from './PublicBand';
import PublicFooter from './PublicFooter';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

const FEATURES = [
    { image: '/feature-track.jpg', key: 'track' },
    { image: '/feature-reviews.jpg', key: 'reviews' },
    { image: '/feature-comments.jpg', key: 'comments' },
    { image: '/feature-library.jpg', key: 'library' },
    { image: '/feature-discover.jpg', key: 'discover' },
    { image: '/feature-people.jpg', key: 'people' },
    { image: '/feature-memories.jpg', key: 'memories' },
    { image: '/feature-cozy.jpg', key: 'cozy' },
    { image: '/feature-anywhere.jpg', key: 'anywhere' },
];

function FeaturesPages() {
    const { t } = useTranslation();

    return (
        <div className="public-page">
            <PublicHeader />

            <main>
                <section className="public-hero public-hero-features">
                    <div className="public-hero-text">
                        <p className="public-eyebrow">{t('features.eyebrow')}</p>
                        <h1 className="display public-hero-title">
                            {t('features.title')}
                            <span className="public-title-heart">
                                <Icon name="favorites" size={36} />
                            </span>
                        </h1>

                        <p className="public-hero-lead">{t('features.lead')}</p>
                    </div>
                </section>

                <ul className="features-grid">
                    {FEATURES.map((feature) => (
                        <li key={feature.key} className="features-item">
                            <img src={feature.image} alt="" className="features-image" />
                            <h2 className="display features-title">{t(`features.items.${feature.key}.title`)}</h2>
                            <p className="features-text">{t(`features.items.${feature.key}.text`)}</p>
                        </li>
                    ))}
                </ul>

                <PublicBand
                    quote={t('features.bandQuote')}
                    text={t('features.bandText')}
                />
            </main>

            <PublicFooter />
        </div>
    );
}

export default FeaturesPages;