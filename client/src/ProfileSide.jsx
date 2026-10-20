import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Icon from './Icon';
import SimilarReaders from './SimilarReaders';
import { pagePercent, sortByLastRead } from './utils';

const RING_RADIUS = 34;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const FAVORITES_SHOWN = 5;

function ProfileSide({ books, readingGoal, isMe, username }) {
    const { t } = useTranslation();

    const reading = sortByLastRead(books.filter((book) => book.status === 'reading')).slice(0, 2);

    const thisYear = new Date().getFullYear();
    const finishedThisYear = books.filter(
        (book) => book.status === 'finished' && book.finishedAt?.startsWith(String(thisYear))
    ).length;
    const goalPercent = readingGoal ? Math.min(100, Math.round((finishedThisYear * 100) / readingGoal)) : 0;

    const favorites = books.filter((book) => book.isFavorite).slice(0, FAVORITES_SHOWN);

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

            <section className="card profile-side-card">
                <div className="profile-side-head">
                    <h3 className="display profile-side-title">{t('profileSide.favorites')}</h3>
                    {favorites.length > 0 && (
                        <Link to="?tab=favorites" className="profile-side-more" aria-label={t('profileSide.seeFavorites')}>
                            <Icon name="chevronRight" size={18} />
                        </Link>
                    )}
                </div>

                {favorites.length === 0 ? (
                    <p className="profile-about-empty">
                        {isMe ? t('profileSide.noFavoritesMine') : t('profileSide.noFavorites')}
                    </p>
                ) : (
                    <div className="side-favorites">
                        {favorites.map((book) => (
                            <Link key={book.id} to={`/book/${book.bookId}`} className="side-favorite" title={book.title}>
                                <BookCover src={book.coverImage} className="side-favorite-image" />
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <SimilarReaders username={username} />
        </aside>
    );
}

export default ProfileSide