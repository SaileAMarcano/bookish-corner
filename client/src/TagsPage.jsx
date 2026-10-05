import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Notice from './Notice';
import { apiFetch } from "./api";

function TagsPage() {
    const { t } = useTranslation();
    const [tags, setTags] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        apiFetch('/api/tags/popular')
            .then((data) => setTags(data))
            .catch((err) => setError(err.message));
    }, []);

    return (
        <main className="page tagged-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('tagged.exploreKicker')}</div>
                    <h1 className="display tagged-title">{t('tagged.exploreTitle')}</h1>
                    <p className="tagged-count">{t('tagged.exploreLead')}</p>
                </div>
            </div>
            {error && <Notice message={error} />}

            {tags && tags.length === 0 && <p className="tags-empty">{t('tagged.empty')}</p>}

            {tags && tags.length > 0 && (
                <div className="tags-grid">
                    {tags.map((tag, index) => (
                        <Link key={tag.slug} to={`/tagged/${tag.slug}`} className="card tags-card">
                            <span className="tags-rank">{index + 1}</span>
                            <span className="display tags-name">#{tag.name}</span>
                            <span className="tags-count">{t('tagged.postCount', { count: tag.postCount })}</span>
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}

export default TagsPage