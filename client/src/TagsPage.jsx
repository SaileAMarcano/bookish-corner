import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Notice from './Notice';
import { apiFetch } from "./api";

function TagsPage() {
    const { t } = useTranslation();
    const [tags, setTags] = useState(null);
    const [followed, setFollowed] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([apiFetch('/api/tags/followed'), apiFetch('/api/tags/popular')])
            .then(([followedData, popularData]) => {
                setFollowed(followedData);
                setTags(popularData);
            })
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

            {followed && (
                <section>
                    <h2 className="section-label tags-section-title">{t('tagged.followedTitle')}</h2>
                    {followed.length === 0 ? (
                        <p className="tags-empty">{t('tagged.followedEmpty')}</p>
                    ) : (
                        <div className="tags-grid">
                            {followed.map((tag) => (
                                <Link key={tag.slug} to={`/tagged/${tag.slug}`} className="card tags-card tags-card-followed">
                                    <span className="display tags-name">#{tag.name}</span>
                                    <span className="tags-count">{t('tagged.postCount', { count: tag.postCount })}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {tags && (
                <section>
                    <h2 className="section-label tags-section-title">{t('tagged.popularTitle')}</h2>
                    {tags.length === 0 ? (
                        <p className="tags-empty">{t('tagged.empty')}</p>
                    ) : (
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
                </section>
            )}
        </main>
    );
}

export default TagsPage