import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SimilarReaders from './SimilarReaders';
import SearchBox from './SearchBox';
import EmptyState from './EmptyState';
import Icon from './Icon';
import Notice from './Notice';
import { apiFetch } from './api';
import { genreLabel } from './utils';

function ExplorePage({ currentUser, searchTerm, onSearch, onOpenSearch, searchOpen }) {
    const { t, i18n } = useTranslation();
    const { hash } = useLocation();
    const [content, setContent] = useState(null);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let ignore = false;
        Promise.all([apiFetch('/api/tags/popular'), apiFetch('/api/genres'), apiFetch('/api/tags/followed')])
            .then(([tags, genres, followed]) => {
                if (!ignore) { setContent({ tags, genres, followed }); setError(''); }
            })
            .catch((err) => { if (!ignore) setError(err.message); });
        return () => { ignore = true; };
    }, [retry, i18n.language]);

    useEffect(() => {
        if (!content) return;
        const section = { '#tags': 'explore-tags', '#genres': 'explore-genres' }[hash];
        if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
    }, [content, hash]);

    return (
        <main className="page discovery-page">
            <header className="discovery-header">
                <div className="brand-kicker"><Icon name="sparkle" />{t('explorePage.kicker')}</div>
                <h1 className="display">{t('explorePage.title')}</h1>
                <p>{t('explorePage.lead')}</p>
            </header>

            <SearchBox variant="explore" q={searchTerm} onChange={onSearch} onOpen={onOpenSearch} open={searchOpen} />

            <div className="explore-layout">
                <div className="explore-main">
                    {error && <Notice message={error} onRetry={() => setRetry((value) => value + 1)} />}
                    {!content && !error && <p role="status">{t('tagged.loading')}</p>}
                    {content && <>
                        <section className="explore-section" id="explore-tags">
                            <div className="discovery-section-heading">
                                <h2 className="display"><Icon name="tag" />{t('explorePage.tags')}</h2>
                            </div>
                            <h3 className="section-label explore-tags-heading">{t('tagged.followedTitle')}</h3>
                            {content.followed.length ? (
                                <div className="explore-tags">
                                    {content.followed.map((tag) => <Link key={tag.slug} to={`/tagged/${tag.slug}`} className="explore-tag explore-tag-followed">
                                        <strong>#{tag.name}</strong><span>{t('tagged.postCount', { count: tag.postCount })}</span>
                                    </Link>)}
                                </div>
                            ) : <EmptyState compact kind="writing" title={t('tagged.followedEmpty')} />}
                            <h3 className="section-label explore-tags-heading">{t('tagged.popularTitle')}</h3>
                            {content.tags.length ? (
                                <div className="explore-tags">
                                    {content.tags.map((tag) => <Link key={tag.slug} to={`/tagged/${tag.slug}`} className="explore-tag">
                                        <strong>#{tag.name}</strong><span>{t('tagged.postCount', { count: tag.postCount })}</span>
                                    </Link>)}
                                </div>
                            ) : <EmptyState compact kind="writing" title={t('tagged.empty')} />}
                        </section>

                        <section className="explore-section" id="explore-genres">
                            <div className="discovery-section-heading">
                                <h2 className="display"><Icon name="library" />{t('explorePage.genres')}</h2>
                            </div>
                            <div className="explore-genres">
                                {content.genres.map((genre, index) => <Link key={genre.slug} to={`/genre/${genre.slug}`} className="explore-genre" data-tone={index % 4}>
                                    <Icon name="library" size={23} />
                                    <strong className="display">{genreLabel(genre.name)}</strong>
                                    <span>{t('genrePage.bookCount', { count: genre.bookCount })}</span>
                                </Link>)}
                            </div>
                        </section>
                    </>}
                </div>
                <aside className="explore-side">
                    <SimilarReaders key={currentUser.username} username={currentUser.username} />
                    <Link className="card explore-reviews-link" to="/reviews">
                        <Icon name="feather" size={25} />
                        <strong className="display">{t('explorePage.reviews')}</strong>
                        <span>{t('explorePage.reviewsLead')}</span>
                        <span className="explore-link-label">{t('explorePage.openReviews')}<Icon name="arrowRight" size={16} /></span>
                    </Link>
                </aside>
            </div>
        </main>
    );
}

export default ExplorePage;
