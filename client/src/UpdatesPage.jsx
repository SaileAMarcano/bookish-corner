import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import Icon from './Icon';
import LoadingState from './LoadingState';
import { apiFetch } from './api';
import { formatDate } from './utils';
import './Announcements.css';

function UpdatesPage() {
    const { t, i18n } = useTranslation();
    const [items, setItems] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        apiFetch('/api/announcements')
            .then(setItems)
            .catch((err) => setError(err.message));
    }, [i18n.language]);

    return (
        <main className="page updates-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('updates.kicker')}</div>
                    <h1 className="display tagged-title">{t('updates.title')}</h1>
                    <p className="tagged-count">{t('updates.lead')}</p>
                </div>
            </div>

            {error && <Notice message={error} />}

            {!items && !error ? (
                <LoadingState label={t('updates.loading')} />
            ) : items && items.length === 0 ? (
                <p className="tags-empty">{t('updates.empty')}</p>
            ) : items && (
                <ol className="updates-list">
                    {items.map((item) => (
                        <li key={item.id} className="card updates-item">
                            <span className="updates-date">
                                <img src="/push/book-bookmark.png" alt="" />
                                {formatDate(item.createdAt)}
                            </span>
                            <h2 className="display">{item.title}</h2>
                            <p>{item.body}</p>
                            {item.link && (
                                <Link className="ghost-button updates-link" to={item.link}>
                                    {t('updates.open')}
                                    <Icon name="arrowRight" size={14} />
                                </Link>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </main>
    );
}

export default UpdatesPage;
