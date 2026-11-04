import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BookModal from './BookModal';
import EmptyState from './EmptyState';
import Icon from './Icon';
import Notice from './Notice';
import ReviewBookPicker from './ReviewBookPicker';
import ReviewCard from './ReviewCard';
import { apiFetch } from './api';

function ReviewResults({ query, scope, order, onEdit, editableIds }) {
    const { t } = useTranslation();
    const [items, setItems] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [error, setError] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);
    const loadingRef = useRef(false);
    const url = (number) => `/api/reviews?${new URLSearchParams({ q: query, scope, order, page: number })}`;

    useEffect(() => {
        let ignore = false;
        const params = new URLSearchParams({ q: query, scope, order, page: 0 });
        apiFetch(`/api/reviews?${params}`)
            .then((data) => { if (!ignore) { setItems(data.items); setHasMore(data.hasMore); } })
            .catch((err) => { if (!ignore) setError(err.message); });
        return () => { ignore = true; };
    }, [query, scope, order]);

    const loadMore = async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoadingMore(true);
        setError('');
        try {
            const data = await apiFetch(url(page + 1));
            setItems((current) => [...current, ...data.items.filter((next) => !current.some((item) => item.id === next.id))]);
            setHasMore(data.hasMore);
            setPage(page + 1);
        } catch (err) { setError(err.message); }
        finally { loadingRef.current = false; setLoadingMore(false); }
    };

    const changeReview = (id, changes) => setItems((current) => current.map((review) => review.id === id ? { ...review, ...changes } : review));

    return (
        <section className="review-results" aria-label={t('reviewsPage.results')} aria-busy={items === null && !error}>
            {items === null && !error && <p role="status">{t('posts.loading')}</p>}
            {items?.length === 0 && <div className="card"><EmptyState kind="writing" title={t('reviewsPage.empty')} description={t('reviewsPage.emptyHint')} /></div>}
            {items?.map((review) => <ReviewCard key={review.id} review={review} onChange={changeReview} onEdit={editableIds.includes(review.id) ? onEdit : undefined} />)}
            {error && <Notice message={error} onRetry={items ? loadMore : undefined} />}
            {hasMore && !error && <button type="button" className="ghost-button home-load-more" onClick={loadMore} disabled={loadingMore}>{t(loadingMore ? 'home.loadingMore' : 'home.loadMore')}</button>}
        </section>
    );
}

function ReviewsPage({ books, booksStatus, onLibraryChange }) {
    const { t, i18n } = useTranslation();
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState('all');
    const [order, setOrder] = useState('recent');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [revision, setRevision] = useState(0);

    const handleSaved = async () => { await onLibraryChange(); setRevision((value) => value + 1); };

    return (
        <main className="page discovery-page reviews-page">
            <header className="discovery-header discovery-header-actions">
                <div><div className="brand-kicker"><Icon name="feather" />{t('reviewsPage.kicker')}</div><h1 className="display">{t('nav.reviews')}</h1><p>{t('reviewsPage.lead')}</p></div>
                <button className="brand-primary" type="button" onClick={() => setPickerOpen(true)} disabled={booksStatus === 'loading'}><Icon name="feather" />{t('reviewsPage.write')}</button>
            </header>
            <div className="review-toolbar">
                <div className="profile-tabs" role="group" aria-label={t('reviewsPage.scopeLabel')}>
                    {['all', 'following'].map((value) => <button type="button" key={value} className={`profile-tab ${scope === value ? 'active' : ''}`} aria-pressed={scope === value} onClick={() => setScope(value)}>{t(`reviewsPage.scope.${value}`)}</button>)}
                </div>
                <form className="review-search-form" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); }}>
                    <label className="discovery-search"><Icon name="search" /><input type="search" maxLength={120} aria-label={t('reviewsPage.search')} placeholder={t('reviewsPage.search')} value={search} onChange={(event) => { setSearch(event.target.value); if (!event.target.value) setQuery(''); }} /></label>
                    <button type="submit" className="ghost-button">{t('reviewsPage.searchButton')}</button>
                    <select aria-label={t('reviewsPage.orderLabel')} value={order} onChange={(event) => setOrder(event.target.value)}><option value="recent">{t('reviewsPage.recent')}</option><option value="popular">{t('reviewsPage.popular')}</option></select>
                </form>
            </div>
            <ReviewResults key={JSON.stringify([query, scope, order, i18n.language, revision])} query={query} scope={scope} order={order} onEdit={(id) => setSelectedBook(books.find((book) => book.id === id))} editableIds={books.map((book) => book.id)} />
            <button type="button" className="review-refresh" onClick={() => setRevision((value) => value + 1)}>{t('reviewsPage.refresh')}</button>
            {pickerOpen && <ReviewBookPicker books={books} onClose={() => setPickerOpen(false)} onSelect={(book) => { setPickerOpen(false); setSelectedBook(book); }} />}
            {selectedBook && <BookModal book={selectedBook} initialTab="review" onClose={() => setSelectedBook(null)} onUpdate={handleSaved} />}
        </main>
    );
}

export default ReviewsPage;
