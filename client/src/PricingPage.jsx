import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import Icon from './Icon';
import './Membership.css';

const BENEFITS = [
    { id: 'themes', icon: 'flower' },
    { id: 'badge', icon: 'favorites' },
    { id: 'superStar', icon: 'sparkle' },
    { id: 'decorations', icon: 'library' },
];

function PricingPage({ signedIn }) {
    const { t } = useTranslation();

    return (
        <div className="public-page">
            <PublicHeader signedIn={signedIn} />

            <main className="legal-page pricing-page">
                <div className="pricing-head">
                    <p className="public-eyebrow">{t('membership.kicker')}</p>
                    <h1 className="display legal-title">{t('membership.title')}</h1>
                    <p className="pricing-lead">{t('membership.lead')}</p>
                </div>

                <div className="membership-layout">
                    <section className="card membership-card">
                        <h2 className="section-label">{t('membership.includes')}</h2>
                        <ul className="membership-benefits">
                            {BENEFITS.map((benefit) => (
                                <li key={benefit.id}>
                                    <span className="membership-benefit-icon"><Icon name={benefit.icon} size={20} /></span>
                                    <span>
                                        <strong>{t(`membership.benefits.${benefit.id}.name`)}</strong>
                                        <span>{t(`membership.benefits.${benefit.id}.text`)}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <p className="membership-free">{t('membership.free')}</p>
                    </section>

                    <section className="card membership-card membership-action">
                        <p className="display membership-price">{t('membership.price')}</p>
                        <p className="membership-price-other">{t('membership.priceOther')}</p>

                        <Link to={signedIn ? '/membership' : '/signup'} className="membership-join">
                            <Icon name="favorites" size={18} />
                            {signedIn ? t('membership.join') : t('pricing.signup')}
                        </Link>

                        <div className="membership-legal">
                            <p>{t('membership.legal')}</p>
                            <p>{t('membership.processor')}</p>
                            <Link to="/terms">{t('legal.terms')}</Link>
                            <Link to="/refunds">{t('legal.refunds')}</Link>
                        </div>
                    </section>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}

export default PricingPage;
