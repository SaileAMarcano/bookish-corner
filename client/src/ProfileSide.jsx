import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Icon from './Icon';
import SimilarReaders from './SimilarReaders';
import ReadingChallenge from './ReadingChallenge';
import { pagePercent, sortByLastRead } from './utils';

const FAVORITES_SHOWN = 5;

function ProfileSide({ books, readingGoal, isMe, username }) {
    const { t } = useTranslation();

    const reading = sortByLastRead(books.filter((book) => book.status === 'reading')).slice(0, 2);
    const favorites = books.filter((book) => book.isFavorite).slice(0, FAVORITES_SHOWN);

    return (
        <aside className="card profile-aside">
            <ReadingChallenge books={books} readingGoal={readingGoal} isMe={isMe} plain />

            <section className="profile-side-card">
                <div className="profile-side-head">
                    <h3 className="display profile-side-title">{t('profileSide.readingNow')}</h3>
                    {isMe && (
                        <Link to="/reading" className="profile-side-more" aria-label={t('profileSide.seeReading')}>
                            <Icon name="chevronRight" size={18} />
                        </Link>
                    )}
                </div>

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

            <section className="profile-side-card">
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