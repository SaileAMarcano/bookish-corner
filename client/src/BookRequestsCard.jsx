import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';

function BookRequestsCard({ version, onComplete }) {
    const { t } = useTranslation();
    const [requests, setRequests] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        apiFetch('/api/editor/book-requests')
            .then(setRequests)
            .catch((err) => {
                setError(err.message);
                setRequests([]);
            });
    }, [version]);

    const handleReject = (id) => {
        setError('');
        apiFetch(`/api/editor/book-requests/${id}`, { method: 'PATCH' })
            .then(() => setRequests((list) => list.filter((request) => request.id !== id)))
            .catch((err) => setError(err.message));
    };

    return (
        <section className="card admin-box">
            <div className="catalog-requests-head">
                <h2 className="section-label">{t('catalog.requestsTitle')}</h2>
                {requests && requests.length > 0 && (
                    <span className="admin-role-badge">{t('catalog.pendingCount', { count: requests.length })}</span>
                )}
            </div>
            <p className="invite-lead">{t('catalog.requestsLead')}</p>

            {error && <Notice message={error} />}

            {!requests ? (
                <p className="tags-empty">{t('admin.loading')}</p>
            ) : requests.length === 0 ? (
                <p className="tags-empty">{t('catalog.requestsEmpty')}</p>
            ) : (
                <ul className="follow-list">
                    {requests.map((request) => (
                        <li key={request.id} className="follow-row">
                            <span className="catalog-request-initial" aria-hidden="true">
                                {request.title.charAt(0).toUpperCase()}
                            </span>

                            <div className="follow-name">
                                <span className="search-title">{request.title}</span>
                                <span className="search-author">
                                    {[request.author, request.requestedBy && t('catalog.requestedBy', { username: request.requestedBy })]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                                <span className="search-author">{t('catalog.votes', { count: request.votes })}</span>
                            </div>

                            <button type="button" className="invite-action" onClick={() => onComplete(request)}>
                                {t('catalog.complete')}
                            </button>
                            <button type="button" className="invite-action" onClick={() => handleReject(request.id)} aria-label={t('catalog.reject')}>
                                <Icon name="close" size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default BookRequestsCard;