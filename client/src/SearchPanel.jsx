import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookRequestBox from './BookRequestBox';
import EmptyState from './EmptyState';
import Icon from './Icon';
import Notice from './Notice';
import SearchBookResult from './SearchBookResult';
import SearchPersonResult from './SearchPersonResult';
import { apiFetch } from './api';
import { searchBookKey } from './searchUtils';

const TYPES = ['books', 'people', 'authors'];

function SearchPanel({ q, books, onAdded, onChange, onClose, type = 'books', onTypeChange }) {
    const { t, i18n } = useTranslation();
    const panelRef = useRef(null);
    const [data, setData] = useState({ key: '' });
    const [retry, setRetry] = useState(0);
    const term = q.trim();
    const key = `${term}|${i18n.language}`;
    const current = data.key === key ? data[type] : null;
    const loading = term.length >= 2 && !current;

    useEffect(() => {
        const handleOutside = (event) => {
            if (panelRef.current?.contains(event.target) || event.target.closest?.('[data-search-trigger]')) return;
            onClose();
        };
        document.addEventListener('pointerdown', handleOutside);
        return () => document.removeEventListener('pointerdown', handleOutside);
    }, [onClose]);

    useEffect(() => {
        if (term.length < 2) return;
        let ignore = false;
        const endpoints = { books: '/api/search-books', people: '/api/users', authors: '/api/search-authors' };
        const timer = setTimeout(() => {
            for (const [category, endpoint] of Object.entries(endpoints)) {
                apiFetch(`${endpoint}?q=${encodeURIComponent(term)}`)
                    .then((items) => {
                        if (!ignore) setData((previous) => ({ ...(previous.key === key ? previous : { key }), [category]: { items, error: '' } }));
                    })
                    .catch((error) => {
                        if (!ignore) setData((previous) => ({ ...(previous.key === key ? previous : { key }), [category]: { items: [], error: error.message } }));
                    });
            }
        }, 350);
        return () => { ignore = true; clearTimeout(timer); };
    }, [term, key, retry]);

    const changePerson = (id, following) => setData((previous) => previous.key !== key ? previous : {
        ...previous, people: { ...previous.people, items: previous.people.items.map((person) => person.id === id ? { ...person, isFollowing: following } : person) },
    });

    return createPortal(
        <section className="discovery-search-panel" id="discovery-search-panel" ref={panelRef} role="region" aria-labelledby="discovery-search-title">
            <header className="discovery-search-header">
                <h2 id="discovery-search-title" className="display">{t('discoverySearch.title')}</h2>
                <form className="discovery-search" role="search" onSubmit={(event) => event.preventDefault()}>
                    <Icon name="search" />
                    <input type="search" autoFocus maxLength={120} value={q} onChange={(event) => onChange(event.target.value)} placeholder={t('discoverySearch.placeholder')} aria-label={t('discoverySearch.placeholder')} autoComplete="off" />
                </form>
                <div className="discovery-search-types" role="group" aria-label={t('discoverySearch.typeLabel')}>
                    {TYPES.map((category) => <button key={category} type="button" className={type === category ? 'active' : ''} onClick={() => onTypeChange(category)} aria-pressed={type === category}>
                        <Icon name={{ books: 'library', people: 'following', authors: 'feather' }[category]} size={16} />{t(`discoverySearch.types.${category}`)}
                    </button>)}
                </div>
            </header>
            <div className="discovery-search-content" aria-live="polite" aria-busy={loading}>
                {term.length < 2 && <EmptyState compact kind="writing" title={t('discoverySearch.start')} />}
                {loading && <p className="discovery-search-status" role="status">{t('home.searching')}</p>}
                {term.length >= 2 && current?.error && <Notice message={current.error} onRetry={() => setRetry((value) => value + 1)} />}
                {term.length >= 2 && current && !current.error && <>
                    {!current.items.length && <EmptyState compact kind={type === 'people' ? 'readers' : 'books'} title={t(`discoverySearch.empty.${type}`)} />}
                    {type === 'books' && current.items.length > 0 && <>
                        <p className="discovery-book-count">{t('discoverySearch.bookCount', { count: current.items.length })}</p>
                        <div className="discovery-book-grid">{current.items.map((book) => <SearchBookResult key={searchBookKey(book)} book={book} books={books} onAdded={onAdded} />)}</div>
                    </>}
                    {type === 'people' && current.items.map((person) => <SearchPersonResult key={person.id} person={person} onChange={changePerson} />)}
                    {type === 'authors' && current.items.map((author) => <Link key={author.name} className="discovery-author-result discovery-result-row" to={`/author/${encodeURIComponent(author.name)}`}>
                        <span className="discovery-author-icon"><Icon name="feather" size={22} /></span>
                        <span className="discovery-result-info"><strong className="display discovery-result-title">{author.name}</strong><span className="discovery-result-meta">{author.catalogCount ? t('discoverySearch.catalogBooks', { count: author.catalogCount }) : t('discoverySearch.openBooks')}</span></span>
                        <Icon name="arrowRight" size={17} />
                    </Link>)}
                    {type === 'books' && <BookRequestBox key={key} q={term} />}
                </>}
            </div>
            <p className="discovery-search-hint">{t('discoverySearch.keepOpen')}</p>
        </section>, document.body
    );
}

export default SearchPanel;
