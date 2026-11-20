import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import './Membership.css';

const BENEFITS = [
    { id: 'themes', icon: 'flower', to: '/settings' },
    { id: 'superStar', icon: 'sparkle', to: '/library' },
    { id: 'decorations', icon: 'library', to: '/library/shelves' },
];

function MembershipPage() {
    const { t } = useTranslation();

    return (
        <main className="page membership-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('membership.kicker')}</div>
                    <h1 className="display tagged-title">{t('membership.title')}</h1>
                    <p className="tagged-count">{t('membership.lead')}</p>
                </div>
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
                                    <Link className="membership-benefit-where" to={benefit.to}>
                                        {t(`membership.benefits.${benefit.id}.where`)}
                                        <Icon name="arrowRight" size={14} />
                                    </Link>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="card membership-card membership-action">
                    <p className="display membership-price">{t('membership.betaTitle')}</p>
                    <p className="membership-status" role="status">
                        <Icon name="check" size={16} />
                        {t('membership.betaActive')}
                    </p>
                    <p className="membership-free">{t('membership.betaLater')}</p>
                </section>
            </div>
        </main>
    );
}

export default MembershipPage;
