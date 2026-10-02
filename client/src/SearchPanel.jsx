import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';

// Search results from the top bar. App shows this panel on top of whatever page
// you are on (Home, profile, Currently Reading...), so searching never changes the page.
function SearchPanel({ q, books, onAdded, onError, onClose }) {
    const { t, i18n } = useTranslation();
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(true);
    const [searchError, setSearchError] = useState('');

    // App gives this panel key={q}: a new search starts a fresh panel (state back to "Searching...").
    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/search-books?q=${encodeURIComponent(q)}`)
            .then((data) => {
                if (!ignore) {
                    setResults(data);
                    setSearchError('');
                }
            })
            .catch((error) => {
                if (!ignore) {
                    setResults([]);
                    setSearchError(error.message);
                }
            })
            .finally(() => {
                if (!ignore) setIsSearching(false);
            });

        return () => {
            ignore = true;
        };
    }, [q, i18n.language]);

    const handleAdd = (book) => {
        // Books from our catalog already have an id; the rest come from Open Library.
        const request = book.bookId
            ? apiFetch('/api/user-books', { method: 'POST', body: { bookId: book.bookId } })
            : apiFetch('/api/user-books/from-search', {
                method: 'POST',
                body: {
                    openLibraryKey: book.openLibraryKey,
                    title: book.title,
                    author: book.author,
                    coverImage: book.coverImage,
                },
            });

        request
            .then(() => onAdded())
            .catch((error) => onError(error.message));
    };

    const addedIds = books.map((b) => b.bookId);
    const addedKeys = books.map((b) => b.openLibraryKey);
    const isAdded = (book) => addedIds.includes(book.bookId) || addedKeys.includes(book.openLibraryKey);

    return (
        <section className="card home-search">
            <div className="home-search-head">
                <div className="section-label">{t('home.resultsFor', { q })}</div>
                <button className="home-search-clear" onClick={onClose}>
                    {t('home.clear')}
                </button>
            </div>

            {isSearching && <div className="search-empty">{t('home.searching')}</div>}
            {!isSearching && searchError && <div className="search-empty">{searchError}</div>}
            {!isSearching && !searchError && results.length === 0 && (
                <div className="search-empty">{t('home.noBooks')}</div>
            )}

            {!isSearching && results.map((book) => (
                <div key={book.bookId || book.openLibraryKey} className="search-result">
                    {book.coverImage ? (
                        <img className="search-cover" src={book.coverImage} alt={book.title} />
                    ) : (
                        <div className="search-cover search-cover-empty"></div>
                    )}

                    <div className="search-info">
                        <div className="search-title">{book.title}</div>
                        <div className="search-author">
                            {book.author}{book.year ? ` · ${book.year}` : ''}
                        </div>
                    </div>

                    {isAdded(book) ? (
                        <span className="search-added">{t('home.added')}</span>
                    ) : (
                        <button className="comment-button" onClick={() => handleAdd(book)}>{t('home.add')}</button>
                    )}
                </div>
            ))}
        </section>
    );
}

export default SearchPanel;
