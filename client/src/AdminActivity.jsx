import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import { apiFetch } from './api';
import { timeAgo } from './utils';

const INVITE_ACTIONS = ['invite_created', 'invite_requested', 'invite_approved', 'invite_rejected', 'invite_deleted'];
const ROLE_ACTIONS = ['role_given', 'role_removed'];

function AdminActivity() {
    const { t } = useTranslation();
    const [days, setDays] = useState('7');
    const [actions, setActions] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        apiFetch(`/api/admin/activity?days=${days}`)
            .then(setActions)
            .catch((err) => setError(err.message));
    }, [days]);

    const describe = (action) => {
        if (INVITE_ACTIONS.includes(action.action)) {
            return action.target ? t('staffActivity.inviteFor', { name: action.target }) : t('invites.noNote');
        }
        if (ROLE_ACTIONS.includes(action.action)) {
            return t('staffActivity.toUser', { username: action.target });
        }
        return t('staffActivity.quoted', { title: action.target });
    };

    return (
        <main className="page admin-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('staffActivity.kicker')}</div>
                    <h1 className="display tagged-title">{t('staffActivity.title')}</h1>
                    <p className="tagged-count">{t('staffActivity.lead')}</p>
                </div>
                <select
                    className="admin-role-select"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    aria-label={t('staffActivity.period')}
                >
                    <option value="7">{t('staffActivity.last7')}</option>
                    <option value="30">{t('staffActivity.last30')}</option>
                </select>
            </div>

            {error && <Notice message={error} />}

            <section className="card admin-box">
                <div className="catalog-requests-head">
                    <h2 className="section-label">{t('staffActivity.recent')}</h2>
                    <span className="admin-stat-note">{t('staffActivity.teamOnly')}</span>
                </div>

                {!actions ? (
                    !error && <p className="tags-empty">{t('admin.loading')}</p>
                ) : actions.length === 0 ? (
                    <p className="tags-empty">{t('staffActivity.empty')}</p>
                ) : (
                    <ul className="activity-log">
                        {actions.map((action) => (
                            <li key={action.id} className="activity-log-row">
                                <span className="activity-log-dot" aria-hidden="true"></span>
                                <div className="follow-name">
                                    <span className="search-title">
                                        {t(`staffActivity.actions.${action.action}`, {
                                            actor: action.actor || t('staffActivity.someone'),
                                            role: action.detail ? t(`admin.roles.${action.detail}`) : '',
                                        })}
                                    </span>
                                    <span className="search-author">{describe(action)} · {timeAgo(action.createdAt)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

export default AdminActivity;