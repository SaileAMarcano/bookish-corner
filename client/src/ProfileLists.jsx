import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';
import Notice from './Notice';
import EmptyState from './EmptyState';
import ListCard from './ListCard';
import ListForm from './ListForm';
import ListInspiration from './ListInspiration';
import Icon from './Icon';

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
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [actionError, setActionError] = useState('');
    const [view, setView] = useState('mine');
    const isMine = !name;
    const showSaved = isMine && view === 'saved';

    useEffect(() => {
        let ignore = false;

        const url = view === 'saved' ? '/api/saved-lists' : `/api/users/${encodeURIComponent(username)}/lists`;

        apiFetch(url)
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
    }, [username, i18n.language, attempt, view]);

    const switchView = (next) => {
        if (next === view) return;
        setLists(null);
        setActionError('');
        setView(next);
    };

    const handleChange = (listId, changes) => {
        setLists((current) => current.map((list) => (list.id === listId ? { ...list, ...changes } : list)));
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditing(null);
    };

    const handleSaved = (saved) => {
        setLists((current) => (editing
            ? current.map((list) => (list.id === saved.id ? saved : list))
            : [saved, ...current]));
        closeForm();
    };

    const handleEdit = (list) => {
        setActionError('');
        apiFetch(`/api/lists/${list.id}`)
            .then((full) => {
                setEditing(full);
                setFormOpen(true);
            })
            .catch((err) => setActionError(err.message));
    };

    const handleDelete = (list) => {
        setActionError('');
        apiFetch(`/api/lists/${list.id}`, { method: 'DELETE' })
            .then(() => setLists((current) => current.filter((item) => item.id !== list.id)))
            .catch((err) => setActionError(err.message));
    };

    const viewTabs = isMine && (
        <div className="profile-tabs home-tabs list-views">
            {['mine', 'saved'].map((option) => (
                <button
                    key={option}
                    type="button"
                    className={`profile-tab ${view === option ? 'active' : ''}`}
                    onClick={() => switchView(option)}
                    aria-pressed={view === option}
                >
                    {t(`lists.views.${option}`)}
                </button>
            ))}
        </div>
    );

    const newButton = isMine && !showSaved && (
        <button type="button" className="invite-create profile-lists-new" onClick={() => setFormOpen(true)}>
            <Icon name="lists" size={16} />
            {t('lists.newList')}
        </button>
    );

    const form = formOpen && <ListForm list={editing} onClose={closeForm} onSaved={handleSaved} />;

    if (error) {
        return <Notice message={error} onRetry={() => setAttempt((count) => count + 1)} />;
    }

    if (!lists) {
        return (
            <>
                {viewTabs}
                <div className="card profile-empty">{t('lists.loading')}</div>
            </>
        );
    }

    if (lists.length === 0) {
        return (
            <>
                {viewTabs}
                <div className="card profile-empty">
                    <EmptyState
                        compact
                        kind={showSaved ? 'bookmark' : 'lists'}
                        title={showSaved ? t('lists.emptySaved') : name ? t('lists.emptyOther', { name }) : t('lists.emptyMine')}
                        description={showSaved ? t('lists.emptySavedText') : name ? null : t('lists.emptyMineText')}
                    >
                        {newButton}
                    </EmptyState>
                    {form}
                </div>
                {isMine && !showSaved && <ListInspiration />}
            </>
        );
    }

    const shown = [...lists].sort(SORTERS[sortBy]);

    return (
        <section className="profile-lists" aria-labelledby="profile-lists-heading">
            {viewTabs}

            <div className="profile-lists-head">
                <h2 className="display profile-lists-title" id="profile-lists-heading">
                    {showSaved ? t('lists.views.saved') : t('lists.title')} <span>{lists.length}</span>
                </h2>
                <div className="profile-lists-tools">
                    {newButton}
                    <select className="library-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label={t('lists.sortLabel')}>
                        <option value="recent">{t('lists.sortRecent')}</option>
                        <option value="liked">{t('lists.sortLiked')}</option>
                    </select>
                </div>
            </div>
            {actionError && <Notice message={actionError} />}

            <div className="list-grid">
                {shown.map((list) => (
                    <ListCard
                        key={list.id}
                        list={list}
                        onChange={handleChange}
                        onEdit={isMine && !showSaved ? handleEdit : undefined}
                        onDelete={isMine && !showSaved ? handleDelete : undefined}
                    />
                ))}
            </div>

            {form}
        </section>
    );
}

export default ProfileLists;