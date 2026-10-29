import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import { apiFetch } from './api';
import { timeAgo } from './utils';

const FILTERS = ['all', 'post', 'post_comment', 'review', 'review_comment', 'profile', 'tag'];

function groupKey(group) {
    return `${group.targetType}-${group.targetId}`;
}

function targetLink(group) {
    const { target, targetType } = group;
    if (!target) return null;
    if (targetType === 'tag') return `/tagged/${target.slug}`;
    if (targetType === 'review' || targetType === 'review_comment') return `/book/${target.workId}`;
    return `/u/${target.author}`;
}

function ReportReview({ group, onResolved }) {
    const { t } = useTranslation();
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const { target, targetType } = group;
    const link = targetLink(group);

    const resolve = (action) => {
        if (action === 'remove' && !confirmRemove) {
            setConfirmRemove(true);
            return;
        }

        setError('');
        setIsSending(true);
        apiFetch('/api/admin/reports/resolve', {
            method: 'POST',
            body: { targetType, targetId: group.targetId, action, note },
        })
            .then(() => onResolved(group, action))
            .catch((err) => {
                setError(err.message);
                setIsSending(false);
                setConfirmRemove(false);
            });
    };

    return (
        <div className="moderation-review">
            {target ? (
                <div className="moderation-content">
                    {targetType === 'profile' && target.displayName && <strong>{target.displayName}</strong>}
                    {target.bookTitle && <span className="search-author">{t('moderation.onBook', { title: target.bookTitle })}</span>}
                    {target.text && <p>{target.text}</p>}
                    {targetType === 'profile' && target.aboutMe && <p>{target.aboutMe}</p>}
                    {target.imageUrl && <img src={target.imageUrl} alt="" className="moderation-image" />}
                    {target.isSpoiler && <span className="invite-badge">{t('moderation.alreadySpoiler')}</span>}
                    {link && <Link to={link} className="moderation-link">{t('moderation.openInApp')}</Link>}
                </div>
            ) : (
                <p className="tags-empty">{t('moderation.gone')}</p>
            )}

            <ul className="moderation-entries">
                {group.entries.map((entry, index) => (
                    <li key={index}>
                        <strong>{t(`report.reasons.${entry.reason}`)}</strong>
                        {' · '}
                        {entry.username ? `@${entry.username}` : t('staffActivity.someone')}
                        {' · '}
                        {timeAgo(entry.createdAt)}
                        {entry.details && <p>{t('staffActivity.quoted', { title: entry.details })}</p>}
                    </li>
                ))}
            </ul>

            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('moderation.notePlaceholder')}
                aria-label={t('moderation.notePlaceholder')}
                maxLength={500}
                rows={2}
            />

            {error && <p className="access-error">{error}</p>}

            <div className="report-actions">
                <button type="button" className="invite-action" disabled={isSending} onClick={() => resolve('dismiss')}>
                    {t('moderation.dismiss')}
                </button>
                {targetType === 'post' && target && !target.isSpoiler && (
                    <button type="button" className="invite-action" disabled={isSending} onClick={() => resolve('spoiler')}>
                        {t('moderation.markSpoiler')}
                    </button>
                )}
                <button type="button" className="invite-action moderation-remove" disabled={isSending} onClick={() => resolve('remove')}>
                    {confirmRemove ? t('moderation.confirmRemove') : t(`moderation.remove.${targetType}`)}
                </button>
            </div>
        </div>
    );
}

function AdminModeration({ onResolved }) {
    const { t } = useTranslation();
    const [filter, setFilter] = useState('all');
    const [groups, setGroups] = useState(null);
    const [openKey, setOpenKey] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const type = filter === 'all' ? '' : filter;

        apiFetch(`/api/admin/reports?type=${type}`)
            .then(setGroups)
            .catch((err) => setError(err.message));
    }, [filter]);

    const handleResolved = (group, action) => {
        setGroups((list) => list.filter((item) => groupKey(item) !== groupKey(group)));
        setOpenKey(null);
        setMessage(t(`moderation.done.${action}`));
        onResolved();
    };

    return (
        <main className="page admin-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('moderation.kicker')}</div>
                    <h1 className="display tagged-title">{t('moderation.title')}</h1>
                    <p className="tagged-count">{t('moderation.lead')}</p>
                </div>
                <select
                    className="admin-role-select"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label={t('moderation.filterLabel')}
                >
                    {FILTERS.map((option) => (
                        <option key={option} value={option}>{t(`moderation.filters.${option}`)}</option>
                    ))}
                </select>
            </div>

            {error && <Notice message={error} />}
            {message && <p className="admin-message" role="status">{message}</p>}

            <section className="card admin-box">
                <div className="catalog-requests-head">
                    <h2 className="section-label">{t('moderation.queue')}</h2>
                    {groups && groups.length > 0 && (
                        <span className="admin-role-badge">{t('catalog.pendingCount', { count: groups.length })}</span>
                    )}
                </div>

                {!groups ? (
                    !error && <p className="tags-empty">{t('admin.loading')}</p>
                ) : groups.length === 0 ? (
                    <p className="tags-empty">{t('moderation.empty')}</p>
                ) : (
                    <ul className="follow-list">
                        {groups.map((group) => {
                            const key = groupKey(group);
                            const isOpen = openKey === key;
                            const name = group.target ? group.target.author || group.target.text : '—';

                            return (
                                <li key={key} className="moderation-item">
                                    <div className="follow-row">
                                        <span className="moderation-alert" aria-hidden="true">!</span>
                                        <div className="follow-name">
                                            <span className="search-title">{t(`moderation.reasons.${group.reason}`)}</span>
                                            <span className="search-author">
                                                {t(`moderation.from.${group.targetType}`, { name })}
                                                {' · '}
                                                {timeAgo(group.firstReportedAt)}
                                                {' · '}
                                                {t('moderation.reportCount', { count: group.reports })}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="invite-action"
                                            aria-expanded={isOpen}
                                            onClick={() => setOpenKey(isOpen ? null : key)}
                                        >
                                            {isOpen ? t('moderation.close') : t('moderation.review')}
                                        </button>
                                    </div>

                                    {isOpen && <ReportReview group={group} onResolved={handleResolved} />}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="card admin-box">
                <h2 className="section-label">{t('moderation.practicesTitle')}</h2>
                <p className="invite-lead">{t('moderation.practices')}</p>
            </section>
        </main>
    );
}

export default AdminModeration;