import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const RING_RADIUS = 34;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function ReadingChallenge({ books, readingGoal, isMe }) {
    const { t } = useTranslation();

    const thisYear = new Date().getFullYear();
    const finishedThisYear = books.filter(
        (book) => book.status === 'finished' && book.finishedAt?.startsWith(String(thisYear))
    ).length;
    const goalPercent = readingGoal ? Math.min(100, Math.round((finishedThisYear * 100) / readingGoal)) : 0;

    return (
        <section className="card profile-side-card">
            <h3 className="display profile-side-title">{t('profileSide.challenge', { year: thisYear })}</h3>

            {readingGoal ? (
                <div className="challenge">
                    <svg className="challenge-ring" width="88" height="88" viewBox="0 0 80 80" aria-hidden="true">
                        <circle className="challenge-ring-track" cx="40" cy="40" r={RING_RADIUS} />
                        <circle
                            className="challenge-ring-fill"
                            cx="40"
                            cy="40"
                            r={RING_RADIUS}
                            strokeDasharray={RING_LENGTH}
                            strokeDashoffset={RING_LENGTH * (1 - goalPercent / 100)}
                            transform="rotate(-90 40 40)"
                        />
                        <text className="challenge-ring-number" x="40" y="42" textAnchor="middle">{finishedThisYear}</text>
                        <text className="challenge-ring-text" x="40" y="55" textAnchor="middle">
                            {t('profileSide.ofBooks', { goal: readingGoal })}
                        </text>
                    </svg>

                    <div className="challenge-info">
                        <div className="challenge-count">{t('profileSide.percentDone', { percent: goalPercent })}</div>
                        <div className="progress">
                            <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${goalPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : isMe ? (
                <Link to="/profile/edit" className="home-goal-link">{t('home.setGoal')}</Link>
            ) : (
                <p className="profile-about-empty">{t('profileSide.noGoal')}</p>
            )}
        </section>
    );
}

export default ReadingChallenge