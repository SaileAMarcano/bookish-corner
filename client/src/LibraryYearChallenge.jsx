import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

function LibraryYearChallenge({ year, count, readingGoal }) {
    const { t } = useTranslation();
    const goal = Math.max(0, Number(readingGoal) || 0);
    const percent = goal ? Math.min(100, Math.round((count * 100) / goal)) : 0;
    const summary = goal
        ? t('library.yearChallenge.count', { finished: count, goal: t('library.bookCount', { count: goal }) })
        : t('library.bookCount', { count });

    return (
        <div className="library-year-challenge">
            <div className="library-year-challenge-head">
                <h2 className="display library-year-heading" id={'library-year-' + year}>
                    {year}<span>· {summary}</span>
                </h2>
                <span className="library-year-challenge-status">
                    <Icon name="sparkle" size={18} />
                    {goal && count >= goal
                        ? t('library.yearChallenge.complete')
                        : t('profileSide.challenge', { year })}
                </span>
            </div>

            {goal > 0 && (
                <div className="library-year-challenge-progress">
                    <div
                        className="library-year-challenge-track"
                        role="progressbar"
                        aria-label={t('library.yearChallenge.progress')}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                        aria-valuetext={summary}
                    >
                        <div className="library-year-challenge-fill" style={{ width: percent + '%' }} />
                    </div>
                    <span>{t('profileSide.percentDone', { percent })}</span>
                </div>
            )}

            <Link to="/profile/edit" className="library-year-challenge-link">
                {goal ? t('library.yearChallenge.editGoal') : t('home.setGoal')}
            </Link>
        </div>
    );
}

export default LibraryYearChallenge;