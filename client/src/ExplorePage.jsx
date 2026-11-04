import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SimilarReaders from './SimilarReaders';
import SearchBox from './SearchBox';
import ExploreTags from './ExploreTags';
import { GENRE_ART, GENRE_ORDER } from './exploreArt';
import Icon from './Icon';
import Notice from './Notice';
import { apiFetch } from './api';
import { genreLabel } from './utils';

function ExplorePage({ currentUser, searchTerm, onSearch, onOpenSearch, searchOpen, onDiscoverPeople }) {
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

    const genres = content ? [...content.genres].sort((a, b) => {
        const first = GENRE_ORDER.indexOf(a.name);
        const second = GENRE_ORDER.indexOf(b.name);
        return (first === -1 ? 99 : first) - (second === -1 ? 99 : second);
    }) : [];

    return (
        <main className="page discovery-page explore-page">
            <div className="explore-layout">
                <div className="explore-main">
                    <header className="discovery-header">
                        <div className="brand-kicker"><Icon name="sparkle" />{t('explorePage.kicker')}</div>
                        <h1 className="display">{t('explorePage.title')}</h1>
                        <p>{t('explorePage.lead')}</p>
                    </header>
                    <SearchBox variant="explore" q={searchTerm} onChange={onSearch} onOpen={onOpenSearch} open={searchOpen} />
                    {error && <Notice message={error} onRetry={() => setRetry((value) => value + 1)} />}
                    {!content && !error && <p role="status">{t('tagged.loading')}</p>}
                    {content && <>
                        <section className="explore-section" id="explore-tags">
                            <div className="discovery-section-heading"><h2 className="display"><Icon name="tag" size={25} />{t('explorePage.tags')}</h2></div>
                            <ExploreTags key={hash} followed={content.followed} popular={content.tags} initiallyOpen={hash === '#tags'} />
                        </section>
                        <section className="explore-section" id="explore-genres">
                            <div className="discovery-section-heading"><h2 className="display"><Icon name="library" size={26} />{t('explorePage.genres')}</h2></div>
                            <div className="explore-genres">
                                {genres.map((genre) => <Link key={genre.slug} to={`/genre/${genre.slug}`} className="explore-genre">
                                    {GENRE_ART[genre.name] && <img className="explore-genre-art" src={`/explore/${GENRE_ART[genre.name]}.jpg`} alt="" width="960" height="320" loading="lazy" decoding="async" />}
                                    <span className="explore-genre-copy"><strong className="display">{genreLabel(genre.name)}</strong><span>{t('genrePage.bookCount', { count: genre.bookCount })}</span></span>
                                </Link>)}
                            </div>
                        </section>
                    </>}
                </div>
                <aside className="explore-side">
                    <SimilarReaders key={currentUser.username} username={currentUser.username} onDiscover={onDiscoverPeople} />
                    <Link className="card explore-reviews-link" to="/reviews">
                        <span className="explore-note-mark" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M9 59V28a23 23 0 0 1 46 0v31Z" fill="var(--rose-soft)" stroke="currentColor" /><path d="m56 5 1.5 4.5L62 11l-4.5 1.5L56 17l-1.5-4.5L50 11l4.5-1.5Z" fill="var(--amber)" /></svg><Icon name="feather" size={27} /></span>
                        <strong className="display">{t('explorePage.reviews')}</strong>
                        <span>{t('explorePage.reviewsLead')}</span>
                        <span className="explore-link-label">{t('explorePage.openReviews')}<Icon name="arrowRight" size={17} /></span>
                    </Link>
                </aside>
            </div>
        </main>
    );
}

export default ExplorePage;
