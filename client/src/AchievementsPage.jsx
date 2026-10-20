import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import MilestoneSeal from './MilestoneSeal';
import { apiFetch } from './api';
import { getAvatarSrc, parseDbDate } from './utils';

function MilestoneCard({ milestone }) {
    const { t, i18n } = useTranslation();
    const locked = !milestone.achieved;

    return (
        <article className={`achievement ${locked ? 'achievement-locked' : ''}`}>
            <MilestoneSeal milestoneKey={milestone.key} locked={locked} />

            <div className="achievement-info">
                <h3 className="display achievement-name">{t(`milestones.items.${milestone.key}.name`)}</h3>
                <p className="achievement-rule">{t(`milestones.items.${milestone.key}.rule`)}</p>

                {milestone.achieved && (
                    <p className="achievement-date">
                        {t('milestones.earnedOn', {
                            date: parseDbDate(milestone.achievedAt).toLocaleDateString(i18n.language, {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            }),
                        })}
                    </p>
                )}

                {locked && milestone.goal && (
                    <div className="progress">
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${(milestone.progress * 100) / milestone.goal}%` }}></div>
                        </div>
                        <div className="progress-label">
                            {t('milestones.progress', { progress: milestone.progress, goal: milestone.goal })}
                        </div>
                    </div>
                )}

                {locked && !milestone.goal && (
                    <Link to="/profile/edit" className="achievement-link">{t('milestones.setGoal')}</Link>
                )}
            </div>
        </article>
    );
}

function AchievementsPage({ currentUser }) {
    const { t } = useTranslation();
    const [milestones, setMilestones] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/users/${encodeURIComponent(currentUser.username)}/milestones`)
            .then((data) => {
                if (!ignore) setMilestones(data);
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [currentUser.username]);

    if (error) {
        return (
            <main className="page">
                <Notice message={error} />
            </main>
        );
    }

    if (!milestones) {
        return (
            <main className="page">
                <div className="section-label">{t('milestones.loading')}</div>
            </main>
        );
    }

    const earned = milestones.filter((milestone) => milestone.achieved);
    const inProgress = milestones.filter((milestone) => !milestone.achieved);

    return (
        <main className="page achievements-page">
            <h1 className="display achievements-title">{t('milestones.title')}</h1>

            <section className="card achievements-summary">
                <img className="achievements-avatar" src={getAvatarSrc(currentUser.avatarUrl)} alt="" />

                <div className="achievements-summary-text">
                    <div className="display achievements-name">{currentUser.displayName}</div>
                    <div className="achievements-count">
                        {t('milestones.count', { count: earned.length, total: milestones.length })}
                    </div>
                    <div className="progress">
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${(earned.length * 100) / milestones.length}%` }}></div>
                        </div>
                    </div>
                </div>
            </section>

            <h2 className="display achievements-section-title">{t('milestones.earned')}</h2>
            {earned.length === 0 ? (
                <p className="profile-about-empty">{t('milestones.noneYet')}</p>
            ) : (
                <div className="achievements-grid">
                    {earned.map((milestone) => (
                        <MilestoneCard key={milestone.key} milestone={milestone} />
                    ))}
                </div>
            )}

            {inProgress.length > 0 && (
                <>
                    <h2 className="display achievements-section-title">{t('milestones.inProgress')}</h2>
                    <div className="achievements-grid">
                        {inProgress.map((milestone) => (
                            <MilestoneCard key={milestone.key} milestone={milestone} />
                        ))}
                    </div>
                </>
            )}
        </main>
    );
}

export default AchievementsPage