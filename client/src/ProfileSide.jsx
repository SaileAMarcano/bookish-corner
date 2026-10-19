import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import SimilarReaders from './SimilarReaders';
import { pagePercent, sortByLastRead } from './utils';

const RING_RADIUS = 34;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function ProfileSide({ books, readingGoal, isMe, username }) {
    const { t } = useTranslation();

    const reading = sortByLastRead(books.filter((book) => book.status === 'reading')).slice(0, 2);

    const thisYear = new Date().getFullYear();
    const finishedThisYear = books.filter(
        (book) => book.status === 'finished' && book.finishedAt?.startsWith(String(thisYear))
    ).length;
    const goalPercent = readingGoal ? Math.min(100, Math.round((finishedThisYear * 100) / readingGoal)) : 0;

    return (
        <aside className="profile-aside">
            <section className="card profile-side-card">
                <h3 className="display profile-side-title">{t('profileSide.readingNow')}</h3>

                {reading.length === 0 && <p className="profile-about-empty">{t('profileSide.nothingReading')}</p>}

                {reading.map((book) => {
                    const percent = pagePercent(book.currentPage, book.totalPages);

                    return (
                        <div key={book.id} className="side-book">
                            <Link to={`/book/${book.bookId}`} className="side-book-cover">
                                <BookCover src={book.coverImage} className="side-book-image" />
                            </Link>

                            <div className="side-book-info">
                                <Link to={`/book/${book.bookId}`} className="side-book-title">{book.title}</Link>
                                <div className="side-book-author">{book.author}</div>

                                {percent !== null && (
                                    <>
                                        <div className="progress">
                                            <div className="progress-track">
                                                <div className="progress-fill" style={{ width: `${percent}%` }}></div>
                                            </div>
                                            <div className="progress-label">{percent}%</div>
                                        </div>
                                        <div className="side-book-pages">
                                            {t('pages.progress', { current: book.currentPage || 0, total: book.totalPages })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </section>

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
                            <text className="challenge-ring-text" x="40" y="45" textAnchor="middle">{goalPercent}%</text>
                        </svg>

                        <div>
                            <div className="challenge-count">
                                {t('profileSide.goalCount', { count: finishedThisYear, goal: readingGoal })}
                            </div>
                            <div className="side-book-author">{t('profileSide.booksFinished')}</div>
                        </div>
                    </div>
                ) : isMe ? (
                    <Link to="/profile/edit" className="home-goal-link">{t('home.setGoal')}</Link>
                ) : (
                    <p className="profile-about-empty">{t('profileSide.noGoal')}</p>
                )}
            </section>

            <SimilarReaders username={username} />
        </aside>
    );
}

export default ProfileSide