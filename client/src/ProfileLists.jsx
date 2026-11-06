import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';
import Notice from './Notice';
import EmptyState from './EmptyState';
import ListCard from './ListCard';

const SORTERS = {
    recent: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    liked: (a, b) => b.likeCount - a.likeCount || new Date(b.updatedAt) - new Date(a.updatedAt),
};

function ProfileLists({ username, name }) {
    const { t, i18n } = useTranslation();
    const [lists, setLists] = useState(null);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/users/${encodeURIComponent(username)}/lists`)
            .then((data) => {
                if (ignore) return;
                setLists(data);
                setError('');
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [username, i18n.language, attempt]);

    if (error) {
        return <Notice message={error} onRetry={() => setAttempt((count) => count + 1)} />;
    }

    if (!lists) {
        return <div className="card profile-empty">{t('lists.loading')}</div>;
    }

    if (lists.length === 0) {
        return (
            <div className="card profile-empty">
                <EmptyState
                    compact
                    kind="lists"
                    title={name ? t('lists.emptyOther', { name }) : t('lists.emptyMine')}
                    description={name ? null : t('lists.emptyMineText')}
                />
            </div>
        );
    }

    const shown = [...lists].sort(SORTERS[sortBy]);

    return (
        <section className="profile-lists" aria-labelledby="profile-lists-heading">
            <div className="profile-lists-head">
                <h2 className="display profile-lists-title" id="profile-lists-heading">
                    {t('lists.title')} <span>{lists.length}</span>
                </h2>
                <select className="library-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label={t('lists.sortLabel')}>
                    <option value="recent">{t('lists.sortRecent')}</option>
                    <option value="liked">{t('lists.sortLiked')}</option>
                </select>
            </div>

            <div className="list-grid">
                {shown.map((list) => <ListCard key={list.id} list={list} />)}
            </div>
        </section>
    );
}

export default ProfileLists;