import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Notice from './Notice';
import { apiFetch } from './api';
import { genreLabel } from './utils';

function GenrePage() {
    const { slug } = useParams();
    const { t, i18n } = useTranslation();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/genres/${encodeURIComponent(slug)}`)
            .then((result) => {
                if (!ignore) {
                    setData(result);
                    setError('');
                }
            })

            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [slug, i18n.language]);

    if (error) {
        return (
            <main className="page tagged-page">
                <Notice message={error} />
                <Link to="/genres" className="genre-all">{t('genrePage.allGenres')}</Link>
            </main>
        );
    }

    if (!data) {
        return (
            <main className="page tagged-page">
                <div className="section-label">{t('tagged.loading')}</div>
            </main>
        );
    }

    return (
        <main className="page tagged-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('genrePage.kicker')}</div>
                    <h1 className="display tagged-title">{genreLabel(data.genre)}</h1>
                    <p className="tagged-count">{t('genrePage.bookCount', { count: data.books.length })}</p>
                </div>

                <Link to="/genres" className="genre-all">{t('genrePage.allGenres')}</Link>
            </div>

            {data.books.length === 0 ? (
                <p className="tags-empty">{t('genrePage.empty', { genre: genreLabel(data.genre) })}</p>
            ) : (
                <div className="genre-books">
                    {data.books.map((book) => (
                        <div key={book.id} className="card genre-book">
                            <BookCover src={book.coverImage} className="genre-book-cover" />
                            <div className="display genre-book-title">{book.title}</div>
                            <div className="genre-book-author">{book.author}</div>
                            <div className="genre-book-meta">
                                {t('genrePage.readers', { count: book.readers })}
                                {book.averageRating !== null && ` · ★ ${book.averageRating}`}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}

export default GenrePage