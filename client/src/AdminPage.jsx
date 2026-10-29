import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import InvitePanel from './InvitePanel';
import { apiFetch } from './api';
import { getAvatarSrc } from './utils';

const ROLE_OPTIONS = ['none', 'editor', 'moderator', 'designer'];

function AdminPage({ currentUser }) {
    const { t } = useTranslation();
    const isAdmin = currentUser.staffRole === 'admin';
    const [search, setSearch] = useState('');
    const [people, setPeople] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let ignore = false;

        const timer = setTimeout(() => {
            apiFetch(`/api/admin/users?q=${encodeURIComponent(search)}`)
                .then((data) => {
                    if (!ignore) setPeople(data);
                })
                .catch((err) => {
                    if (!ignore) setError(err.message);
                });
        }, 300);

        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, [search]);

    const handleRoleChange = (person, value) => {
        const staffRole = value === 'none' ? null : value;
        setError('');
        setMessage('');

        apiFetch(`/api/admin/users/${person.id}/staff-role`, { method: 'PATCH', body: { staffRole } })
            .then((updated) => {
                setPeople((list) => list.map((item) => (item.id === person.id ? { ...item, staffRole: updated.staffRole } : item)));
                setMessage(t('admin.saved', { name: person.displayName, role: t(`admin.roles.${value}`) }));
            })
            .catch((err) => setError(err.message));
    };

    return (
        <main className="page admin-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('admin.kicker')}</div>
                    <h1 className="display tagged-title">{t('admin.title')}</h1>
                    <p className="tagged-count">{t(isAdmin ? 'admin.lead' : 'admin.leadModerator')}</p>
                </div>
            </div>

            <section className="card admin-box">
                <label className="admin-search">
                    <span className="section-label">{t('admin.searchLabel')}</span>
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('admin.searchPlaceholder')}
                    />
                </label>

                {error && <Notice message={error} />}
                {message && <p className="admin-message" role="status">{message}</p>}

                {!people ? (
                    <p className="tags-empty">{t('admin.loading')}</p>
                ) : people.length === 0 ? (
                    <p className="tags-empty">{t('admin.empty')}</p>
                ) : (
                    <ul className="follow-list">
                        {people.map((person) => (
                            <li key={person.id} className="follow-row">
                                <img className="search-avatar" src={getAvatarSrc(person.avatarUrl)} alt="" />

                                <Link to={`/u/${person.username}`} className="follow-name">
                                    <span className="search-title">{person.displayName}</span>
                                    <span className="search-author">@{person.username}</span>
                                </Link>

                                {!isAdmin || person.staffRole === 'admin' || person.id === currentUser.id ? (
                                    <span className="admin-role-badge">
                                        {person.id === currentUser.id ? t('admin.you') : t(`admin.roles.${person.staffRole || 'none'}`)}
                                    </span>
                                ) : (
                                    <select
                                        className="admin-role-select"
                                        value={person.staffRole || 'none'}
                                        onChange={(e) => handleRoleChange(person, e.target.value)}
                                        aria-label={t('admin.roleLabel', { name: person.displayName })}
                                    >
                                        {ROLE_OPTIONS.map((role) => (
                                            <option key={role} value={role}>{t(`admin.roles.${role}`)}</option>
                                        ))}
                                    </select>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <InvitePanel />
        </main>
    );
}

export default AdminPage;