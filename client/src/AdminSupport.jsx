import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import { apiFetch } from './api';
import { getAvatarSrc, timeAgo } from './utils';
import LoadingState from './LoadingState';

const STATUSES = ['open', 'resolved'];
const KINDS = ['all', 'problem', 'idea', 'account', 'other'];

function SupportItem({ request, onChanged }) {
    const { t } = useTranslation();
    const [note, setNote] = useState(request.staffNote || '');
    const [error, setError] = useState('');
    const [isSending, setIsSending] = useState(false);
    const isOpen = request.status === 'open';

    const update = () => {
        setError('');
        setIsSending(true);
        apiFetch(`/api/admin/support/${request.id}`, {
            method: 'PATCH',
            body: { status: isOpen ? 'resolved' : 'open', note },
        })
            .then(() => onChanged(request, isOpen ? 'resolved' : 'reopened'))
            .catch((err) => {
                setError(err.message);
                setIsSending(false);
            });
    };

    return (
        <li className="support-item">
            <div className="support-head">
                <span className={`pill support-kind support-kind-${request.kind}`}>{t(`help.contact.kinds.${request.kind}`)}</span>
                {request.username ? (
                    <Link to={`/u/${request.username}`} className="support-user">
                        <img className="search-avatar" src={getAvatarSrc(request.avatarUrl)} alt="" />
                        <span>{request.displayName || request.username}</span>
                    </Link>
                ) : (
                    <span className="support-user support-deleted">{t('support.deletedUser')}</span>
                )}
                <span className="support-time">{timeAgo(request.createdAt)}</span>
            </div>

            <p className="support-message">{request.message}</p>

            <dl className="support-meta">
                <div>
                    <dt>{t('support.page')}</dt>
                    <dd>{request.pageUrl || t('support.unknown')}</dd>
                </div>
                <div>
                    <dt>{t('support.browser')}</dt>
                    <dd>{request.userAgent || t('support.unknown')}</dd>
                </div>
                {!isOpen && request.resolvedByUsername && (
                    <div>
                        <dt>{t('support.resolvedBy')}</dt>
                        <dd>@{request.resolvedByUsername} · {timeAgo(request.resolvedAt)}</dd>
                    </div>
                )}
            </dl>

            <label className="edit-label" htmlFor={`support-note-${request.id}`}>{t('support.note')}</label>
            <textarea
                id={`support-note-${request.id}`}
                className="edit-input support-note"
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('support.notePlaceholder')}
            />

            {error && <Notice message={error} />}

            <div className="support-actions">
                <button type="button" className="invite-action" disabled={isSending} onClick={update}>
                    {isOpen ? t('support.resolve') : t('support.reopen')}
                </button>
            </div>
        </li>
    );
}

function AdminSupport({ onChanged }) {
    const { t } = useTranslation();
    const [status, setStatus] = useState('open');
    const [kind, setKind] = useState('all');
    const [requests, setRequests] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let ignore = false;
        const kindParam = kind === 'all' ? '' : kind;

        apiFetch(`/api/admin/support?status=${status}&kind=${kindParam}`)
            .then((data) => {
                if (!ignore) {
                    setRequests(data);
                    setError('');
                }
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [status, kind]);

    const handleChanged = (request, result) => {
        setRequests((list) => list.filter((item) => item.id !== request.id));
        setMessage(t(`support.done.${result}`));
        onChanged();
    };

    return (
        <main className="page admin-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('support.kicker')}</div>
                    <h1 className="display tagged-title">{t('support.title')}</h1>
                    <p className="tagged-count">{t('support.lead')}</p>
                </div>
                <div className="support-filters">
                    <select
                        className="admin-role-select"
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setRequests(null);
                            setMessage('');
                        }}
                        aria-label={t('support.statusLabel')}
                    >
                        {STATUSES.map((option) => (
                            <option key={option} value={option}>{t(`support.statuses.${option}`)}</option>
                        ))}
                    </select>
                    <select
                        className="admin-role-select"
                        value={kind}
                        onChange={(e) => {
                            setKind(e.target.value);
                            setRequests(null);
                            setMessage('');
                        }}
                        aria-label={t('support.kindLabel')}
                    >
                        {KINDS.map((option) => (
                            <option key={option} value={option}>
                                {option === 'all' ? t('support.allKinds') : t(`help.contact.kinds.${option}`)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && <Notice message={error} />}
            {message && <p className="admin-message" role="status">{message}</p>}

            <section className="card admin-box">
                <div className="catalog-requests-head">
                    <h2 className="section-label">{t(`support.statuses.${status}`)}</h2>
                    {requests && requests.length > 0 && (
                        <span className="admin-role-badge">{t('support.count', { count: requests.length })}</span>
                    )}
                </div>

                {!requests ? (
                    !error && <LoadingState compact label={t('admin.loading')} />
                ) : requests.length === 0 ? (
                    <p className="tags-empty">{t(`support.empty.${status}`)}</p>
                ) : (
                    <ul className="support-list">
                        {requests.map((request) => (
                            <SupportItem key={request.id} request={request} onChanged={handleChanged} />
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

export default AdminSupport;