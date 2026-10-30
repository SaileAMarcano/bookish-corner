import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import NotificationItem from './NotificationItem';
import { apiFetch } from './api';

const CHECK_EVERY = 60 * 1000;
const RECENT_COUNT = 5;

function NotificationBell() {
    const { t } = useTranslation();
    const location = useLocation();
    const wrapRef = useRef(null);
    const [count, setCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState(null);

    const loadCount = () => {
        apiFetch('/api/notifications/unread-count')
            .then((data) => setCount(data.count))
            .catch(() => { });
    };

    useEffect(() => {
        loadCount();
        setIsOpen(false);

        const timer = setInterval(loadCount, CHECK_EVERY);
        return () => clearInterval(timer);
    }, [location.pathname]);

    useEffect(() => {
        window.addEventListener('notifications:changed', loadCount);
        return () => window.removeEventListener('notifications:changed', loadCount);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setIsOpen(false);
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('pointerdown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleToggle = () => {
        if (!isOpen) {
            setItems(null);
            apiFetch('/api/notifications')
                .then((data) => setItems(data.items.slice(0, RECENT_COUNT)))
                .catch(() => setItems([]));
        }
        setIsOpen(!isOpen);
    };

    const handleOpen = (notification) => {
        setIsOpen(false);
        if (notification.readAt) return;

        apiFetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' })
            .then(loadCount)
            .catch(() => { });
    };

    return (
        <div className="bell-wrap" ref={wrapRef}>
            <button
                type="button"
                className={`bell-button ${isOpen ? 'open' : ''}`}
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-label={count > 0 ? t('notifications.bellUnread', { count }) : t('notifications.bell')}
            >
                <Icon name="bell" size={18} />
                {count > 0 && <span className="bell-dot" aria-hidden="true"></span>}
            </button>

            {isOpen && (
                <div className="card bell-panel">
                    <h2 className="display bell-title">{t('notifications.recent')}</h2>

                    {!items ? (
                        <p className="tags-empty">{t('admin.loading')}</p>
                    ) : items.length === 0 ? (
                        <p className="tags-empty">{t('notifications.empty')}</p>
                    ) : (
                        <div className="bell-list">
                            {items.map((notification) => (
                                <NotificationItem key={notification.id} notification={notification} onOpen={handleOpen} />
                            ))}
                        </div>
                    )}

                    <Link to="/notifications" className="bell-all" onClick={() => setIsOpen(false)}>
                        {t('notifications.seeAll')}
                        <Icon name="arrowRight" size={14} />
                    </Link>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;