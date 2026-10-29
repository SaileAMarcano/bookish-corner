import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';

function inviteLink(code) {
    return `${window.location.origin}/signup?invite=${code}`;
}

function inviteStatus(invite, t) {
    if (invite.usedAt) return t('invites.usedBy', { username: invite.usedBy || '—' });
    if (invite.status === 'pending') return t('invites.pending');
    if (invite.status === 'rejected') return t('invites.rejected');
    return t('invites.unused');
}

function InvitePanel({ isAdmin }) {
    const { t } = useTranslation();
    const [invites, setInvites] = useState(null);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        apiFetch('/api/admin/invites')
            .then(setInvites)
            .catch((err) => {
                setError(err.message);
                setInvites([]);
            });
    }, []);

    const replaceInvite = (updated) => {
        setInvites((list) => list.map((invite) => (invite.id === updated.id ? updated : invite)));
    };

    const handleCreate = (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsCreating(true);

        apiFetch('/api/admin/invites', { method: 'POST', body: { note } })
            .then((invite) => {
                setInvites((list) => [invite, ...list]);
                setNote('');
                if (invite.status === 'pending') setMessage(t('invites.requestSent'));
            })
            .catch((err) => setError(err.message))
            .finally(() => setIsCreating(false));
    };

    const handleReview = (id, approve) => {
        setError('');
        apiFetch(`/api/admin/invites/${id}/review`, { method: 'PATCH', body: { approve } })
            .then(replaceInvite)
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
            .then(() => setInvites((list) => list.filter((invite) => invite.id !== id)))
            .catch((err) => setError(err.message));
    };

    return (
        <section className="card admin-box">
            <div>
                <h2 className="section-label">{t('invites.title')}</h2>
                <p className="invite-lead">{isAdmin ? t('invites.lead') : t('invites.leadModerator')}</p>
            </div>

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

            {error && <Notice message={error} />}
            {message && <p className="admin-message" role="status">{message}</p>}

            {!invites ? (
                <p className="tags-empty">{t('admin.loading')}</p>
            ) : invites.length === 0 ? (
                <p className="tags-empty">{t('invites.empty')}</p>
            ) : (
                <ul className="follow-list">
                    {invites.map((invite) => (
                        <li key={invite.id} className="follow-row">
                            <div className="follow-name">
                                <span className="search-title">{invite.note || t('invites.noNote')}</span>
                                <span className="search-author">
                                    {inviteStatus(invite, t)}
                                    {isAdmin && invite.requestedBy && ` · ${t('invites.requestedBy', { username: invite.requestedBy })}`}
                                </span>
                            </div>

                            {isAdmin && invite.status === 'pending' && (
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

                            {invite.code && !invite.usedAt && (
                                <button type="button" className="invite-action" onClick={() => handleCopy(invite)}>
                                    <Icon name={copiedId === invite.id ? 'check' : 'share'} size={14} />
                                    <span aria-live="polite">{copiedId === invite.id ? t('invites.copied') : t('invites.copy')}</span>
                                </button>
                            )}

                            {isAdmin && !invite.usedAt && invite.status !== 'pending' && (
                                <button type="button" className="invite-action" onClick={() => handleDelete(invite.id)} aria-label={t('invites.delete')}>
                                    <Icon name="trash" size={14} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default InvitePanel;