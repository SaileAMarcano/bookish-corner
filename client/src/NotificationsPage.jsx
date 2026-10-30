import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import NotificationItem from './NotificationItem';
import { apiFetch } from './api';
import { parseDbDate } from './utils';

const TABS = ['all', 'unread'];
const DAYS = ['today', 'yesterday', 'earlier'];

function dayOf(dateString) {
    const date = parseDbDate(dateString);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfYesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    if (date >= startOfToday) return 'today';
    if (date >= startOfYesterday) return 'yesterday';
    return 'earlier';
}

function announceChange() {
    window.dispatchEvent(new Event('notifications:changed'));
}

function NotificationsPage() {
    const { t } = useTranslation();
    const [tab, setTab] = useState('all');
    const [page, setPage] = useState(0);
    const [items, setItems] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let ignore = false;
        const filter = tab === 'unread' ? '&filter=unread' : '';

        apiFetch(`/api/notifications?page=${page}${filter}`)
            .then((data) => {
                if (ignore) return;
                setItems((current) => (page === 0 ? data.items : [...(current || []), ...data.items]));
                setHasMore(data.hasMore);
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [tab, page]);

    const handleTab = (next) => {
        setItems(null);
        setPage(0);
        setTab(next);
    };

    const handleReadAll = () => {
        setError('');
        apiFetch('/api/notifications/read-all', { method: 'POST' })
            .then(() => {
                const now = new Date().toISOString();
                setItems((list) => (tab === 'unread' ? [] : list.map((item) => ({ ...item, readAt: item.readAt || now }))));
                setHasMore(false);
                announceChange();
            })
            .catch((err) => setError(err.message));
    };

    const handleOpen = (notification) => {
        if (notification.readAt) return;

        apiFetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' })
            .then(announceChange)
            .catch(() => { });
    };

    const hasUnread = items ? items.some((item) => !item.readAt) : false;
    const groups = DAYS
        .map((day) => ({ day, items: (items || []).filter((item) => dayOf(item.createdAt) === day) }))
        .filter((group) => group.items.length > 0);

    return (
        <main className="page notifications-page">
            <div className="notifications-head">
                <h1 className="display notifications-title">{t('notifications.title')}</h1>
                <button type="button" className="invite-action" onClick={handleReadAll} disabled={!hasUnread}>
                    {t('notifications.readAll')}
                </button>
            </div>

            <div className="profile-tabs">
                {TABS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        className={`profile-tab ${tab === key ? 'active' : ''}`}
                        onClick={() => handleTab(key)}
                        aria-pressed={tab === key}
                    >
                        {t(`notifications.tabs.${key}`)}
                    </button>
                ))}
            </div>

            {error && <Notice message={error} />}

            {!items ? (
                !error && <p className="tags-empty">{t('admin.loading')}</p>
            ) : items.length === 0 ? (
                <div className="card profile-empty">
                    {tab === 'unread' ? t('notifications.emptyUnread') : t('notifications.empty')}
                </div>
            ) : (
                groups.map((group) => (
                    <section key={group.day} className="notifications-group">
                        <h2 className="display notifications-day">{t(`notifications.days.${group.day}`)}</h2>
                        <div className="card notifications-list">
                            {group.items.map((notification) => (
                                <NotificationItem key={notification.id} notification={notification} showDetail onOpen={handleOpen} />
                            ))}
                        </div>
                    </section>
                ))
            )}

            {hasMore && (
                <button type="button" className="ghost-button home-load-more" onClick={() => setPage((current) => current + 1)}>
                    {t('notifications.loadMore')}
                </button>
            )}
        </main>
    );
}

export default NotificationsPage;