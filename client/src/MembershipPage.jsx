import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import Notice from './Notice';
import LoadingState from './LoadingState';
import SupporterCelebration from './SupporterCelebration';
import { apiFetch } from './api';
import { loadPaddle, onPaddleEvent } from './paddleCheckout';
import './Membership.css';

const BENEFITS = [
    { id: 'themes', icon: 'flower', to: '/settings' },
    { id: 'badge', icon: 'favorites', to: '/profile' },
    { id: 'superStar', icon: 'sparkle', to: '/library' },
    { id: 'decorations', icon: 'library', to: '/library/shelves' },
];

const POLL_TRIES = 20;
const POLL_DELAY = 3000;
const PENDING_KEY = 'alou-supporter-pending';

function setPending(value) {
    try {
        if (value) localStorage.setItem(PENDING_KEY, '1');
        else localStorage.removeItem(PENDING_KEY);
    } catch {
        return;
    }
}

function isPending() {
    try {
        return localStorage.getItem(PENDING_KEY) === '1';
    } catch {
        return false;
    }
}

function MembershipPage({ onChanged }) {
    const { t, i18n } = useTranslation();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [opening, setOpening] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [canceling, setCanceling] = useState(false);
    const [celebrating, setCelebrating] = useState(false);
    const timer = useRef(null);

    useEffect(() => {
        apiFetch('/api/membership')
            .then((next) => {
                setData(next);
                if (next.isMember && isPending()) {
                    setPending(false);
                    setCelebrating(true);
                }
            })
            .catch((err) => setError(err.message));
        return () => clearTimeout(timer.current);
    }, []);

    useEffect(() => onPaddleEvent((event) => {
        if (event.name !== 'checkout.completed') return;
        setPending(true);
        window.Paddle?.Checkout.close();
        setWaiting(true);
        setMessage('');
        let tries = 0;
        const check = () => {
            tries += 1;
            apiFetch('/api/membership')
                .then((next) => {
                    if (next.isMember) {
                        setData(next);
                        setWaiting(false);
                        setMessage(t('membership.thanks'));
                        setPending(false);
                        setCelebrating(true);
                        onChanged?.();
                    } else if (tries < POLL_TRIES) {
                        timer.current = setTimeout(check, POLL_DELAY);
                    } else {
                        setWaiting(false);
                        setMessage(t('membership.waitingLong'));
                    }
                })
                .catch(() => {
                    if (tries < POLL_TRIES) timer.current = setTimeout(check, POLL_DELAY);
                });
        };
        timer.current = setTimeout(check, POLL_DELAY);
    }), [t, onChanged]);

    const closeCelebration = useCallback(() => setCelebrating(false), []);

    const formatDay = (value) => value
        ? new Date(value).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })
        : '';

    const openCheckout = () => {
        setError('');
        setMessage('');
        setOpening(true);
        loadPaddle(data.checkout)
            .then((Paddle) => {
                Paddle.Checkout.open({
                    items: [{ priceId: data.checkout.priceId, quantity: 1 }],
                    customer: { email: data.email },
                    customData: { userId: data.userId },
                    settings: {
                        displayMode: 'overlay',
                        locale: i18n.language === 'es' ? 'es' : 'en',
                        theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
                    },
                });
            })
            .catch(() => setError(t('membership.loadFailed')))
            .finally(() => setOpening(false));
    };

    const cancel = () => {
        if (!confirming) {
            setConfirming(true);
            return;
        }
        setCanceling(true);
        setError('');
        apiFetch('/api/membership/cancel', { method: 'POST' })
            .then(({ cancelAt }) => {
                const endsAt = cancelAt || data.paidUntil;
                setData((current) => ({ ...current, cancelAt: endsAt }));
                setConfirming(false);
                setMessage(t('membership.canceled', { date: formatDay(endsAt) }));
            })
            .catch((err) => setError(err.message))
            .finally(() => setCanceling(false));
    };

    let status = null;
    if (data?.isMember) {
        if (data.cancelAt || data.status === 'canceled') status = t('membership.endsOn', { date: formatDay(data.cancelAt || data.paidUntil) });
        else if (data.status === 'past_due') status = t('membership.paymentIssue');
        else status = t('membership.active', { date: formatDay(data.paidUntil) });
    }
    const canCancel = data?.isMember && data.hasSubscription && !data.cancelAt && data.status !== 'canceled';

    return (
        <main className="page membership-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('membership.kicker')}</div>
                    <h1 className="display tagged-title">{t('membership.title')}</h1>
                    <p className="tagged-count">{t('membership.lead')}</p>
                </div>
            </div>

            {error && <Notice message={error} />}

            {!data && !error ? (
                <LoadingState label={t('membership.loading')} />
            ) : data && (
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
                                        {data.isMember ? (
                                            <Link className="membership-benefit-where" to={benefit.to}>
                                                {t(`membership.benefits.${benefit.id}.where`)}
                                                <Icon name="arrowRight" size={14} />
                                            </Link>
                                        ) : (
                                            <span className="membership-benefit-where">{t(`membership.benefits.${benefit.id}.where`)}</span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <p className="membership-free">{t('membership.free')}</p>
                    </section>

                    <section className="card membership-card membership-action">
                        <p className="display membership-price">{t('membership.price')}</p>
                        <p className="membership-price-other">{t('membership.priceOther')}</p>

                        {status && (
                            <p className={'membership-status' + (data.status === 'past_due' ? ' is-warning' : '')} role="status">
                                <Icon name={data.status === 'past_due' ? 'flag' : 'check'} size={16} />
                                {status}
                            </p>
                        )}

                        {message && <p className="membership-message" role="status">{message}</p>}
                        {waiting && <p className="membership-message" role="status">{t('membership.waiting')}</p>}

                        {!data.enabled ? (
                            <p className="membership-free">{t('membership.unavailable')}</p>
                        ) : !data.isMember && !waiting ? (
                            <button type="button" className="membership-join" onClick={openCheckout} disabled={opening}>
                                <Icon name="favorites" size={18} />
                                {opening ? t('membership.opening') : t('membership.join')}
                            </button>
                        ) : null}

                        {canCancel && (
                            <div className="membership-cancel">
                                {confirming && <p>{t('membership.cancelHint')}</p>}
                                <div className="membership-cancel-actions">
                                    <button type="button" className="ghost-button" onClick={cancel} disabled={canceling}>
                                        {confirming ? t('membership.confirmCancel') : t('membership.cancel')}
                                    </button>
                                    {confirming && (
                                        <button type="button" className="ghost-button" onClick={() => setConfirming(false)}>
                                            {t('membership.keep')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="membership-legal">
                            <p>{t('membership.legal')}</p>
                            <p>{t('membership.processor')}</p>
                            <Link to="/terms">{t('membership.terms')}</Link>
                        </div>
                    </section>
                </div>
            )}

            {celebrating && <SupporterCelebration onClose={closeCelebration} />}
        </main>
    );
}

export default MembershipPage;
