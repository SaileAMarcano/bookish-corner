import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import { apiFetch } from './api';

const TEAM_ROLES = ['admin', 'editor', 'moderator', 'designer'];

function AdminSummary({ currentUser }) {
    const { t } = useTranslation();
    const isAdmin = currentUser.staffRole === 'admin';
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        apiFetch('/api/admin/summary')
            .then(setSummary)
            .catch((err) => setError(err.message));
    }, []);

    const stats = summary
        ? [
            { label: t('adminSummary.readers'), number: summary.readers, note: t('adminSummary.newReaders', { count: summary.newReaders }) },
            {
                label: t('adminSummary.active'),
                number: summary.activeReaders,
                note: t('adminSummary.activeNote', { percent: summary.readers ? Math.round((summary.activeReaders / summary.readers) * 100) : 0 }),
            },
            { label: t('adminSummary.posts'), number: summary.posts, note: t('adminSummary.postsNote') },
            { label: t('adminSummary.pending'), number: summary.pendingInvites, note: t('adminSummary.pendingNote') },
        ]
        : [];

    return (
        <main className="page admin-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('admin.kicker')}</div>
                    <h1 className="display tagged-title">{t('adminSummary.title')}</h1>
                    <p className="tagged-count">{t('adminSummary.lead')}</p>
                </div>
                <Link to="/admin/invites" className="invite-create admin-hero-action">
                    {isAdmin ? t('invites.create') : t('invites.request')}
                </Link>
            </div>

            {error && <Notice message={error} />}

            {!summary ? (
                !error && <p className="tags-empty">{t('admin.loading')}</p>
            ) : (
                <>
                    <div className="admin-stats">
                        {stats.map((stats) => (
                            <div key={stat.label} className="card admin-stat">
                                <span className="admin-stat-label">{stat.label}</span>
                                <span className="display admin-stat-number">{stat.number}</span>
                                <span className="admin-stat-note">{stat.note}</span>
                            </div>
                        ))}
                    </div>

                    <div className="admin-columns">
                        {isAdmin && (
                            <section className="card admin-box">
                                <h2 className="section-label">{t('adminSummary.attention')}</h2>

                                {summary.pendingRequests.length === 0 ? (
                                    <p className="tags-empty">{t('adminSummary.attentionEmpty')}</p>
                                ) : (
                                    <ul className="follow-list">
                                        {summary.pendingRequests.map((request) => (
                                            <li key={request.id} className="follow-row">
                                                <div className="follow-name">
                                                    <span className="search-title">{request.note || t('invites.noNote')}</span>
                                                    <span className="search-author">{t('invites.requestedBy', { username: request.requestedBy || '—' })}</span>
                                                </div>
                                                <Link to="/admin/invites" className="invite-action">{t('adminSummary.review')}</Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        <div className="admin-side">
                            <section className="card admin-box">
                                <h2 className="section-label">{t('adminSummary.community')}</h2>
                                <div className="admin-row">
                                    <span>{t('adminSummary.signup')}</span>
                                    <strong>{summary.signupOpen ? t('adminSummary.signupOpen') : t('adminSummary.signupInvite')}</strong>
                                </div>
                                <div className="admin-row">
                                    <span>{t('adminSummary.unusedInvites')}</span>
                                    <strong>{summary.unusedInvites}</strong>
                                </div>
                            </section>

                            <section className="card admin-box">
                                <h2 className="section-label">{t('adminSummary.team')}</h2>
                                {TEAM_ROLES.map((role) => (
                                    <div key={role} className="admin-row">
                                        <span>{t(`admin.roles.${role}`)}</span>
                                        <strong>{summary.team[role] || 0}</strong>
                                    </div>
                                ))}
                            </section>
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}

export default AdminSummary;