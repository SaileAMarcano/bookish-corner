import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';
import Icon from './Icon';
import Notice from './Notice';
import SearchBookResult from './SearchBookResult';
import { apiFetch } from './api';
import { searchBookKey } from './searchUtils';

function AuthorBooks({ name, books, onAdded }) {
    const { t } = useTranslation();
    const [items, setItems] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    const [busy, setBusy] = useState(false);
    const [catalogOnly, setCatalogOnly] = useState(false);
    const pending = useRef(false);

    useEffect(() => {
        let ignore = false;
        apiFetch(`/api/author-books?${new URLSearchParams({ name, page: 0 })}`)
            .then((data) => { if (!ignore) { setItems(data.items); setHasMore(data.hasMore); setCatalogOnly(Boolean(data.externalUnavailable)); setError(''); } })
            .catch((err) => { if (!ignore) setError(err.message); });
        return () => { ignore = true; };
    }, [name, retry]);

    const loadMore = async () => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError('');
        try {
            const data = await apiFetch(`/api/author-books?${new URLSearchParams({ name, page: page + 1 })}`);
            setItems((current) => [...current, ...data.items.filter((next) => !current.some((item) => searchBookKey(item) === searchBookKey(next)))]);
            setHasMore(data.hasMore);
            setCatalogOnly(Boolean(data.externalUnavailable));
            setPage(page + 1);
        } catch (err) { setError(err.message); }
        finally { pending.current = false; setBusy(false); }
    };

    return (
        <section className="author-books" aria-label={t('discoverySearch.authorBooks', { name })}>
            {items === null && !error && <p role="status">{t('home.searching')}</p>}
            {catalogOnly && <p className="author-catalog-note" role="status">{t('discoverySearch.catalogOnly')}</p>}
            {items?.map((book) => <SearchBookResult key={searchBookKey(book)} book={book} books={books} onAdded={onAdded} />)}
            {items?.length === 0 && <EmptyState title={t('home.noBooks')} />}
            {error && <Notice message={error} onRetry={items ? loadMore : () => setRetry((value) => value + 1)} />}
            {hasMore && !error && <button type="button" className="ghost-button home-load-more" onClick={loadMore} disabled={busy}>{t(busy ? 'home.loadingMore' : 'home.loadMore')}</button>}
        </section>
    );
}

function AuthorPage({ books, onLibraryChange }) {
    const { name } = useParams();
    const { t, i18n } = useTranslation();
    return (
        <main className="page discovery-page author-page">
            <header className="discovery-header"><div className="brand-kicker"><Icon name="feather" />{t('discoverySearch.author')}</div><h1 className="display">{name}</h1><p>{t('discoverySearch.authorBooks', { name })}</p></header>
            <Link className="author-back" to="/explore"><Icon name="arrowLeft" size={15} />{t('nav.explore')}</Link>
            <AuthorBooks key={`${name}|${i18n.language}`} name={name} books={books} onAdded={onLibraryChange} />
        </main>
    );
}

export default AuthorPage;
