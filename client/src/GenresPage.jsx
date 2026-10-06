import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import { apiFetch } from './api';
import { genreLabel } from './utils';

function GenresPage() {
    const { t } = useTranslation();
    const [genres, setGenres] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        apiFetch('/api/genres')
            .then((data) => setGenres(data))
            .catch((err) => setError(err.message));
    }, []);

    return (
        <main className="page tagged-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('genrePage.exploreKicker')}</div>
                    <h1 className="display tagged-title">{t('genrePage.exploreTitle')}</h1>
                    <p className="tagged-count">{t('genrePage.exploreLead')}</p>
                </div>
            </div>

            {error && <Notice message={error} />}

            {genres && (
                <div className="genres-grid">
                    {genres.map((genre) => (
                        <Link key={genre.slug} to={`/genre/${genre.slug}`} className="card genre-card">
                            <span className="display genre-card-name">{genreLabel(genre.name)}</span>
                            <span className="tags-count">{t('genrePage.bookCount', { count: genre.bookCount })}</span>
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}

export default GenresPage