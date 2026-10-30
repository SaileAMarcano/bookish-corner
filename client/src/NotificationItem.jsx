import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAvatarSrc, timeAgo } from './utils';

function notificationLink(notification) {
    const { type } = notification;
    if (type === 'post_like' || type === 'post_comment') return `/post/${notification.postId}`;
    if (type === 'follow') return `/u/${notification.actorUsername}`;
    return `/book/${notification.workId}`;
}

function NotificationItem({ notification, showDetail = false, onOpen }) {
    const { t } = useTranslation();
    const isUnread = !notification.readAt;
    const isFollow = notification.type === 'follow';
    const detail = isFollow ? notification.actorBio : notification.commentText;
    const avatar = notification.actorUsername ? getAvatarSrc(notification.actorAvatar) : '/logo-mark.png';

    return (
        <Link
            to={notificationLink(notification)}
            className={`notification-item ${isUnread ? 'unread' : ''}`}
            onClick={() => onOpen(notification)}
        >
            <img className="notification-avatar" src={avatar} alt="" />

            <span className="notification-body">
                <span>
                    {notification.actorName && <strong>{notification.actorName} </strong>}
                    {t(`notifications.types.${notification.type}`, { title: notification.bookTitle })}
                </span>
                {showDetail && detail && (
                    <span className="notification-detail">
                        {isFollow ? detail : t('staffActivity.quoted', { title: detail })}
                    </span>
                )}
            </span>

            <span className="notification-meta">
                <span>{timeAgo(notification.createdAt)}</span>
                {isUnread && <span className="notification-unread">{t('notifications.unread')}</span>}
            </span>
        </Link>
    );
}

export default NotificationItem;