import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ActivityCard from './ActivityCard';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';
import LoadingState from './LoadingState';

function ActivityPage({ currentUser }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activity, setActivity] = useState(null);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/reading-updates/${id}`)
            .then((data) => {
                if (!ignore) setActivity(data);
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [id, retry]);

    const tryAgain = () => {
        setError('');
        setRetry((value) => value + 1);
    };

    return (
        <main className="page post-page">
            <h1 className="sr-only">{t('activity.pageTitle')}</h1>
            <button type="button" className="ghost-button post-page-back" onClick={() => navigate(-1)}>
                <Icon name="arrowLeft" size={14} />
                {t('postPage.back')}
            </button>

            {error && <Notice message={error} onRetry={tryAgain} />}
            {!activity && !error && <LoadingState compact label={t('admin.loading')} />}

            {activity && (
                <ActivityCard
                    key={activity.id}
                    activity={activity}
                    currentUserId={currentUser.id}
                    onChange={(activityId, changes) => setActivity((current) => ({ ...current, ...changes }))}
                    openComments
                />
            )}
        </main>
    );
}

export default ActivityPage;
