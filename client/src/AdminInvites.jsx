import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';
import { formatDate } from './utils';

function inviteLink(code) {
    return `${window.location.origin}/signup?invite=${code}`;
}

function inviteState(invite) {
    if (invite.usedAt) return 'used';
    if (invite.status === 'pending') return 'pending';
    if (invite.status === 'rejected') return 'rejected';
    if (invite.expired) return 'expired';
    return 'active';
}

function inviteDetail(invite, state, t) {
    if (state === 'used') {
        return t('invites.usedBy', { username: invite.usedBy || '—', date: formatDate(invite.usedAt) });
    }
    if (state === 'pending') {
        return t('invites.requestedBy', { username: invite.requestedBy || '—' });
    }

    const createdBy = t('invites.createdBy', { name: invite.createdByName || '—' });

    if (state === 'expired') {
        return `${createdBy} · ${t('invites.expiredOn', { date: formatDate(invite.expiresAt) })}`;
    }
    if (state === 'active') {
        return `${createdBy} · ${t('invites.notUsed')} · ${t('invites.expiresOn', { date: formatDate(invite.expiresAt) })}`;
    }
    return createdBy;
}

function AdminInvites({ currentUser }) {
    const { t } = useTranslation();
    const isAdmin = currentUser.staffRole === 'admin';
    const [data, setData] = useState(null);
    const [version, setVersion] = useState(0);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        apiFetch('/api/admin/invites')
            .then(setData)
            .catch((err) => setError(err.message));
    }, [version]);

    const reload = () => setVersion((current) => current + 1);

    const handleCreate = (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsCreating(true);

        apiFetch('/api/admin/invites', { method: 'POST', body: { note } })
            .then((invite) => {
                setNote('');
                if (invite.status === 'pending') setMessage(t('invites.requestSent'));
                reload();
            })
            .catch((err) => setError(err.message))
            .finally(() => setIsCreating(false));
    };

    const handleReview = (id, approve) => {
        setError('');
        apiFetch(`/api/admin/invites/${id}/review`, { method: 'PATCH', body: { approve } })
            .then(reload)
            .catch((err) => setError(err.message));
    };

    const handleCopy = (invite) => {
        navigator.clipboard
            .writeText(inviteLink(invite.code))
            .then(() => {
                setCopiedId(invite.id);
                setTimeout(() => setCopiedId(null), 2000);
            })
            .catch(() => { });
    };

    const handleDelete = (id) => {
        setError('');
        apiFetch(`/api/admin/invites/${id}`, { method: 'DELETE' })
            .then(reload)
            .catch((err) => setError(err.message));
    };

    const counts = data
        ? [
            { label: t('invites.countUnused'), value: data.counts.unused },
            { label: t('invites.countUsed'), value: data.counts.used },
            { label: t('invites.countExpired'), value: data.counts.expired },
            { label: t('invites.countPending'), value: data.counts.pending },
        ]
        : [];

    return (
        <main className="page admin-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('invites.kicker')}</div>
                    <h1 className="display tagged-title">{t('invites.title')}</h1>
                    <p className="tagged-count">{isAdmin ? t('invites.lead') : t('invites.leadModerator')}</p>
                </div>
                {data && (
                    <span className={`invite-badge ${data.signupOpen ? 'invite-badge-active' : ''}`}>
                        {data.signupOpen ? t('invites.signupOpen') : t('invites.signupClosed')}
                    </span>
                )}
            </div>

            {error && <Notice message={error} />}
            {message && <p className="admin-message" role="status">{message}</p>}

            <div className="admin-columns invite-columns">
                <section className="card admin-box">
                    <h2 className="section-label">{isAdmin ? t('invites.createTitle') : t('invites.requestTitle')}</h2>
                    <form className="invite-form" onSubmit={handleCreate}>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t('invites.notePlaceholder')}
                            aria-label={t('invites.noteLabel')}
                            maxLength={80}
                        />
                        <button type="submit" className="invite-create" disabled={isCreating}>
                            {isAdmin ? t('invites.create') : t('invites.request')}
                        </button>
                    </form>
                    <p className="invite-lead">{t('invites.rules', { days: data ? data.expiryDays : 14 })}</p>
                </section>

                <section className="card admin-box">
                    <h2 className="section-label">{t('invites.summaryTitle')}</h2>
                    {counts.map((count) => (
                        <div key={count.label} className="admin-row">
                            <span>{count.label}</span>
                            <strong>{count.value}</strong>
                        </div>
                    ))}
                </section>
            </div>

            <section className="card admin-box">
                <h2 className="section-label">{t('invites.recentTitle')}</h2>

                {!data ? (
                    !error && <p className="tags-empty">{t('admin.loading')}</p>
                ) : data.invites.length === 0 ? (
                    <p className="tags-empty">{t('invites.empty')}</p>
                ) : (
                    <ul className="follow-list">
                        {data.invites.map((invite) => {
                            const state = inviteState(invite);

                            return (
                                <li key={invite.id} className="follow-row">
                                    <div className="follow-name">
                                        <span className="search-title">
                                            {invite.note ? t('invites.forName', { name: invite.note }) : t('invites.noNote')}
                                        </span>
                                        <span className="search-author">{inviteDetail(invite, state, t)}</span>
                                    </div>

                                    <span className={`invite-badge invite-badge-${state}`}>{t(`invites.badges.${state}`)}</span>

                                    {isAdmin && state === 'pending' && (
                                        <>
                                            <button type="button" className="invite-action" onClick={() => handleReview(invite.id, true)}>
                                                <Icon name="check" size={14} />
                                                {t('invites.approve')}
                                            </button>
                                            <button type="button" className="invite-action" onClick={() => handleReview(invite.id, false)}>
                                                <Icon name="close" size={14} />
                                                {t('invites.reject')}
                                            </button>
                                        </>
                                    )}

                                    {state === 'active' && invite.code && (
                                        <button type="button" className="invite-action" onClick={() => handleCopy(invite)}>
                                            <Icon name={copiedId === invite.id ? 'check' : 'share'} size={14} />
                                            <span aria-live="polite">{copiedId === invite.id ? t('invites.copied') : t('invites.copy')}</span>
                                        </button>
                                    )}

                                    {isAdmin && !invite.usedAt && state !== 'pending' && (
                                        <button type="button" className="invite-action" onClick={() => handleDelete(invite.id)} aria-label={t('invites.delete')}>
                                            <Icon name="trash" size={14} />
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </main>
    );
}

export default AdminInvites;