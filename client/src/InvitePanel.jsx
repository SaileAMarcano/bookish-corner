import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';

function inviteLink(code) {
    return `${window.location.origin}/signup?invite=${code}`;
}

function InvitePanel() {
    const { t } = useTranslation();
    const [invites, setInvites] = useState(null);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [copiedCode, setCopiedCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        apiFetch('/api/admin/invites')
            .then(setInvites)
            .catch((err) => setError(err.message));
    }, []);

    const handleCreate = (e) => {
        e.preventDefault();
        setError('');
        setIsCreating(true);

        apiFetch('/api/admin/invites', { method: 'POST', body: { note } })
            .then((invite) => {
                setInvites((list) => [invite, ...list]);
                setNote('');
            })
            .catch((err) => setError(err.message))
            .finally(() => setIsCreating(false));
    };

    const handleCopy = (code) => {
        navigator.clipboard
            .writeText(inviteLink(code))
            .then(() => {
                setCopiedCode(code);
                setTimeout(() => setCopiedCode(''), 2000);
            })
            .catch(() => { });
    };

    const handleDelete = (code) => {
        setError('');
        apiFetch(`/api/admin/invites/${code}`, { method: 'DELETE' })
            .then(() => setInvites((list) => list.filter((invite) => invite.code !== code)))
            .catch((err) => setError(err.message));
    };

    return (
        <section className="card admin-box">
            <div>
                <h2 className="section-label">{t('invites.title')}</h2>
                <p className="invite-lead">{t('invites.lead')}</p>
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
                    {t('invites.create')}
                </button>
            </form>

            {error && <Notice message={error} />}

            {!invites ? (
                <p className="tags-empty">{t('admin.loading')}</p>
            ) : invites.length === 0 ? (
                <p className="tags-empty">{t('invites.empty')}</p>
            ) : (
                <ul className="follow-list">
                    {invites.map((invite) => (
                        <li key={invite.code} className="follow-row">
                            <div className="follow-name">
                                <span className="search-title">{invite.note || t('invites.noNote')}</span>
                                <span className="search-author">
                                    {invite.usedAt ? t('invites.usedBy', { username: invite.usedBy || '—' }) : t('invites.unused')}
                                </span>
                            </div>

                            {!invite.usedAt && (
                                <>
                                    <button type="button" className="invite-action" onClick={() => handleCopy(invite.code)}>
                                        <Icon name={copiedCode === invite.code ? 'check' : 'share'} size={14} />
                                        <span aria-live="polite">{copiedCode === invite.code ? t('invites.copied') : t('invites.copy')}</span>
                                    </button>
                                    <button type="button" className="invite-action" onClick={() => handleDelete(invite.code)} aria-label={t('invites.delete')}>
                                        <Icon name="trash" size={14} />
                                    </button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default InvitePanel;