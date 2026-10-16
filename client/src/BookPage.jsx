import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import StarRating from './StarRating';
import Notice from './Notice';
import { apiFetch } from './api';
import { getAvatarSrc, genreLabel, slugify, timeAgo } from './utils';

function BookPage({ onLibraryChange }) {
    const { id } = useParams();
    const { t, i18n } = useTranslation();
    const [book, setBook] = useState(null);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');

    const loadBook = () =>
        apiFetch(`/api/books/${encodeURIComponent(id)}`)
            .then((data) => {
                setBook(data);
                setError('');
            })
            .catch((err) => setError(err.message));

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/books/${encodeURIComponent(id)}`)
            .then((data) => {
                if (!ignore) {
                    setBook(data);
                    setError('');
                }
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [id, i18n.language]);

    const handleAdd = (status) => {
        setActionError('');
        apiFetch('/api/user-books', { method: 'POST', body: { bookId: book.id, status } })
            .then(() => {
                onLibraryChange();
                return loadBook();
            })
            .catch((err) => setActionError(err.message));
    };

    const handleLike = (review) => {
        setActionError('');
        apiFetch(`/api/user-books/${review.id}/like`, { method: review.hasLiked ? 'DELETE' : 'POST' })
            .then(() => loadBook())
            .catch((err) => setActionError(err.message));
    };

    if (error) {
        return (
            <main className="page">
                <Notice message={error} />
            </main>
        );
    }

    if (!book) {
        return (
            <main className="page">
                <div className="section-label">{t('bookPage.loading')}</div>
            </main>
        );
    }

    return (
        <main className="page book-page">
            <section className="card book-hero">
                <BookCover src={book.coverImage} className="book-hero-cover" />

                <div className="book-hero-info">
                    {book.genre && (
                        <Link to={`/genre/${slugify(book.genre)}`} className="pill book-hero-genre">
                            {genreLabel(book.genre)}
                        </Link>
                    )}

                    <h1 className="display book-hero-title">{book.title}</h1>
                    <p className="book-hero-author">
                        {book.author}
                        {book.year && ` · ${book.year}`}
                    </p>

                    <div className="book-hero-rating">
                        <StarRating value={book.averageRating || 0} size={22} />
                        <span>
                            {book.averageRating
                                ? t('bookPage.ratingSummary', { average: book.averageRating, count: book.ratingCount })
                                : t('bookPage.noRatings')}
                        </span>
                    </div>

                    <p className="book-hero-readers">
                        {t('bookPage.readers', { count: book.readers })} · {t('bookPage.wantCount', { count: book.wantCount })}
                    </p>

                    {book.myStatus ? (
                        <div className="book-hero-mine">
                            <span className={`pill book-status status-${book.myStatus}`}>
                                {t('bookPage.inYourLibrary', { status: t(`status.${book.myStatus}`) })}
                            </span>
                            <Link to="/profile?tab=library" className="book-hero-link">{t('bookPage.openLibrary')}</Link>
                        </div>
                    ) : (
                        <div className="book-hero-actions">
                            <button type="button" className="tag-follow" onClick={() => handleAdd('want-to-read')}>
                                {t('bookPage.wantToRead')}
                            </button>
                            <button type="button" className="tag-follow following" onClick={() => handleAdd('reading')}>
                                {t('bookPage.startReading')}
                            </button>
                        </div>
                    )}

                    {actionError && <Notice message={actionError} />}
                </div>
            </section>

            {book.description && (
                <section className="card book-section">
                    <h2 className="display book-section-title">{t('bookPage.synopsis')}</h2>
                    <p className="book-synopsis">{book.description}</p>
                </section>
            )}

            <section className="card book-section">
                <h2 className="display book-section-title">
                    {t('bookPage.reviewsTitle')} <span className="follow-count">{book.reviews.length}</span>
                </h2>

                {book.reviews.length === 0 && <p className="profile-about-empty">{t('bookPage.noReviews')}</p>}

                {book.reviews.map((review) => (
                    <article key={review.id} className="book-review-item">
                        <img className="search-avatar" src={getAvatarSrc(review.avatarUrl)} alt="" />

                        <div className="book-review-body">
                            <div className="book-review-head">
                                <Link to={`/u/${review.username}`} className="post-author">{review.displayName}</Link>
                                <span className="post-date">{timeAgo(review.createdAt)}</span>
                            </div>

                            {review.rating > 0 && <StarRating value={review.rating} size={16} />}

                            <p className="book-review-text">{review.review}</p>

                            <div className="book-review-foot">
                                {review.isMine ? (
                                    <span className="book-review-count">{t('bookPage.likes', { count: review.likeCount })}</span>
                                ) : (
                                    <button
                                        type="button"
                                        className={`post-action ${review.hasLiked ? 'active' : ''}`}
                                        onClick={() => handleLike(review)}
                                        aria-pressed={review.hasLiked}
                                    >
                                        {t('posts.like')} ({review.likeCount})
                                    </button>
                                )}
                                <span className="book-review-count">{t('book.comments', { count: review.commentCount })}</span>
                            </div>
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}

export default BookPage