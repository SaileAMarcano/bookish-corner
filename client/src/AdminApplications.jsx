import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';
import { formatDate } from './utils';

const TABS = ['new', 'invited', 'declined'];

function inviteLink(code) {
    return `${window.location.origin}/signup?invite=${code}`;
}

function inviteState(application) {
    if (application.inviteUsedAt) return 'used';
    if (application.inviteStatus === 'pending') return 'pending';
    if (application.inviteStatus === 'rejected') return 'rejected';
    if (!application.inviteCode) return 'expired';
    return 'active';
}

function mailLink(application, t) {
    const lng = application.appLanguage;
    const subject = t('applications.mailSubject', { lng });
    const body = t('applications.mailBody', { lng, name: application.name, link: inviteLink(application.inviteCode) });
    return `mailto:${application.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function AdminApplications({ currentUser }) {
    const { t } = useTranslation();
    const isAdmin = currentUser.staffRole === 'admin';
    const [tab, setTab] = useState('new');
    const [data, setData] = useState(null);
    const [version, setVersion] = useState(0);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/admin/beta-applications?status=${tab}`)
            .then((result) => {
                if (!ignore) setData(result);
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [tab, version]);

    const reload = () => setVersion((current) => current + 1);

    const run = (application, request, done) => {
        setError('');
        setMessage('');
        setBusyId(application.id);

        request()
            .then((updated) => {
                if (done) setMessage(done(updated));
                reload();
            })
            .catch((err) => setError(err.message))
            .finally(() => setBusyId(null));
    };

    const handleInvite = (application) => run(
        application,
        () => apiFetch(`/api/admin/beta-applications/${application.id}/invite`, { method: 'POST' }),
        (updated) => t(updated.inviteStatus === 'pending' ? 'applications.invitePending' : 'applications.inviteReady', { name: application.name }),
    );

    const handleStatus = (application, status) => run(
        application,
        () => apiFetch(`/api/admin/beta-applications/${application.id}`, { method: 'PATCH', body: { status } }),
    );

    const handleCopy = (application) => {
        navigator.clipboard
            .writeText(inviteLink(application.inviteCode))
            .then(() => {
                setCopiedId(application.id);
                setTimeout(() => setCopiedId(null), 2000);
            })
            .catch(() => { });
    };

    return (
        <main className="page admin-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('applications.kicker')}</div>
                    <h1 className="display tagged-title">{t('applications.title')}</h1>
                    <p className="tagged-count">{isAdmin ? t('applications.lead') : t('applications.leadModerator')}</p>
                </div>
                <a className="invite-action" href="/beta" target="_blank" rel="noopener noreferrer">
                    <Icon name="share" size={14} />
                    {t('applications.openForm')}
                </a>
            </div>

            <div className="applications-tabs" role="tablist" aria-label={t('applications.title')}>
                {TABS.map((name) => (
                    <button
                        key={name}
                        type="button"
                        role="tab"
                        aria-selected={tab === name}
                        className={`applications-tab ${tab === name ? 'active' : ''}`}
                        onClick={() => {
                            setData(null);
                            setTab(name);
                        }}
                    >
                        {t(`applications.tabs.${name}`)}
                        {data && <span className="applications-tab-count">{data.counts[name]}</span>}
                    </button>
                ))}
            </div>

            {error && <Notice message={error} />}
            {message && <p className="admin-message" role="status">{message}</p>}

            {!data ? (
                !error && <p className="tags-empty">{t('admin.loading')}</p>
            ) : data.applications.length === 0 ? (
                <section className="card admin-box">
                    <p className="tags-empty">{t(`applications.empty.${tab}`)}</p>
                </section>
            ) : (
                <ul className="applications-list">
                    {data.applications.map((application) => {
                        const state = application.status === 'invited' ? inviteState(application) : null;
                        const busy = busyId === application.id;

                        return (
                            <li key={application.id} className="card application-card">
                                <div className="application-head">
                                    <div>
                                        <h2 className="display application-name">{application.name}</h2>
                                        <p className="application-meta">
                                            <a href={`mailto:${application.email}`}>{application.email}</a>
                                            <span>{t('applications.age', { age: application.age })}</span>
                                            {application.social && <span>{application.social}</span>}
                                        </p>
                                    </div>
                                    <span className="application-date">{formatDate(application.createdAt)}</span>
                                </div>

                                <blockquote className="application-phrase">{application.phrase}</blockquote>

                                <dl className="application-details">
                                    <div>
                                        <dt>{t('applications.appLanguage')}</dt>
                                        <dd>{t(`language.${application.appLanguage}`)}</dd>
                                    </div>
                                    <div>
                                        <dt>{t('applications.genres')}</dt>
                                        <dd className="application-tags">
                                            {application.genres.map((genre) => <span key={genre}>{t(`genres.${genre}`)}</span>)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>{t('applications.tracking')}</dt>
                                        <dd>{application.tracking.length ? application.tracking.map((item) => t(`beta.tracking.${item}`)).join(' · ') : '—'}</dd>
                                    </div>
                                    <div>
                                        <dt>{t('applications.foundVia')}</dt>
                                        <dd>{application.foundVia ? t(`beta.foundVia.${application.foundVia}`) : '—'}</dd>
                                    </div>
                                </dl>

                                <div className="application-actions">
                                    {(application.status !== 'invited' || ['expired', 'rejected'].includes(state)) && (
                                        <button type="button" className="invite-create" disabled={busy} onClick={() => handleInvite(application)}>
                                            <Icon name="mail" size={14} />
                                            {isAdmin ? t('applications.invite') : t('applications.requestInvite')}
                                        </button>
                                    )}

                                    {application.status === 'new' && (
                                        <button type="button" className="invite-action" disabled={busy} onClick={() => handleStatus(application, 'declined')}>
                                            <Icon name="close" size={14} />
                                            {t('applications.decline')}
                                        </button>
                                    )}

                                    {application.status === 'declined' && (
                                        <button type="button" className="invite-action" disabled={busy} onClick={() => handleStatus(application, 'new')}>
                                            <Icon name="arrowLeft" size={14} />
                                            {t('applications.restore')}
                                        </button>
                                    )}

                                    {state && (
                                        <span className={`invite-badge invite-badge-${state}`}>{t(`invites.badges.${state}`)}</span>
                                    )}

                                    {state === 'active' && (
                                        <>
                                            <button type="button" className="invite-action" onClick={() => handleCopy(application)}>
                                                <Icon name={copiedId === application.id ? 'check' : 'share'} size={14} />
                                                <span aria-live="polite">{copiedId === application.id ? t('invites.copied') : t('invites.copy')}</span>
                                            </button>
                                            <a className="invite-action" href={mailLink(application, t)}>
                                                <Icon name="mail" size={14} />
                                                {t('applications.sendMail')}
                                            </a>
                                        </>
                                    )}

                                    {state === 'pending' && <span className="application-hint">{t('applications.waitingApproval')}</span>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </main>
    );
}

export default AdminApplications;
