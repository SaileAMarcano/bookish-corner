import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import BookCover from './BookCover';
import { apiFetch } from './api';

const QUICK_LIMIT = 4;     // how many books the dropdown shows
const MIN_LENGTH = 2;      // shorter searches wait
const WAIT_MS = 350;       // pause after the last key before searching

// The search bar of the top bar, with "quick results" that drop down while you type.
// "Search" / Enter (with nothing selected) / "See all" open the full results on the current page.
function SearchBox({ q, books, onSubmit, onClear, onAdded, onError }) {
    const { t, i18n } = useTranslation();
    const [term, setTerm] = useState(q);
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState({ term: '', items: [], error: '' });
    const [active, setActive] = useState(-1);
    const boxRef = useRef(null);

    // When the URL search changes (Search, Clear, a book added...), the bar shows the same text.
    const [shownQ, setShownQ] = useState(q);
    if (q !== shownQ) {
        setShownQ(q);
        setTerm(q);
    }

    const cleanTerm = term.trim();
    const showDropdown = open && cleanTerm.length >= MIN_LENGTH;
    const isLoading = showDropdown && results.term !== cleanTerm;

    // Debounce: wait until she stops typing, then ask for a few results.
    useEffect(() => {
        if (!open || cleanTerm.length < MIN_LENGTH) return;

        let ignore = false;
        const timer = setTimeout(() => {
            apiFetch(`/api/search-books?q=${encodeURIComponent(cleanTerm)}&limit=${QUICK_LIMIT}`)
                .then((data) => {
                    if (!ignore) setResults({ term: cleanTerm, items: data, error: '' });
                })
                .catch((error) => {
                    if (!ignore) setResults({ term: cleanTerm, items: [], error: error.message });
                });
        }, WAIT_MS);

        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, [cleanTerm, open, i18n.language]);

    // Clicking anywhere outside the search closes the dropdown.
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [open]);

    const addedIds = books.map((b) => b.bookId);
    const addedKeys = books.map((b) => b.openLibraryKey);
    const isAdded = (book) => addedIds.includes(book.bookId) || addedKeys.includes(book.openLibraryKey);

    const items = isLoading ? [] : results.items;

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
            .then(() => {
                setTerm('');
                setOpen(false);
                onAdded();
            })
            .catch((error) => onError(error.message));
    };

    const showAll = () => {
        if (cleanTerm === '') return;
        setOpen(false);
        onSubmit(cleanTerm);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Enter on a highlighted book adds it; otherwise it opens all the results.
        if (showDropdown && active >= 0 && items[active]) {
            if (!isAdded(items[active])) handleAdd(items[active]);
            return;
        }
        showAll();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (!showDropdown || items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((index) => (index + 1) % items.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((index) => (index <= 0 ? items.length - 1 : index - 1));
        }
    };

    const handleClear = () => {
        setTerm('');
        setOpen(false);
        onClear();
    };

    return (
        <div className="search-box" ref={boxRef}>
            <form className="topbar-search" onSubmit={handleSubmit} role="search">
                <Icon name="search" size={18} />
                <input
                    type="text"
                    placeholder={t('app.searchPlaceholder')}
                    value={term}
                    onChange={(e) => {
                        setTerm(e.target.value);
                        setActive(-1);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    aria-label={t('app.searchLabel')}
                    aria-expanded={showDropdown}
                    aria-controls="quick-results"
                    autoComplete="off"
                />
                {term && (
                    <button type="button" className="search-clear" onClick={handleClear} aria-label={t('app.clearSearch')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                )}
                <button type="submit" className="pill topbar-search-button">{t('app.search')}</button>
            </form>

            {showDropdown && (
                <div className="quick-results" id="quick-results">
                    <div className="quick-head">
                        <span className="display quick-title">{t('app.quickResults')}</span>
                        <span className="quick-hint">{t('app.quickHint')}</span>
                    </div>

                    {isLoading && <div className="quick-empty">{t('app.quickSearching')}</div>}
                    {!isLoading && results.error && <div className="quick-empty">{results.error}</div>}
                    {!isLoading && !results.error && items.length === 0 && (
                        <div className="quick-empty">{t('app.quickEmpty')}</div>
                    )}

                    {items.map((book, index) => (
                        <div
                            key={book.bookId || book.openLibraryKey}
                            className={`quick-item ${index === active ? 'active' : ''}`}
                            onMouseEnter={() => setActive(index)}
                        >
                            <BookCover src={book.coverImage} className="quick-cover" />

                            <div className="quick-info">
                                <div className="display quick-book-title">{book.title}</div>
                                <div className="quick-book-meta">
                                    {book.author}{book.year ? ` · ${book.year}` : ''}
                                </div>
                            </div>

                            {isAdded(book) ? (
                                <span className="quick-added" title={t('app.inLibrary')}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                                    </svg>
                                    <span className="quick-label">{t('app.inLibrary')}</span>
                                </span>
                            ) : (
                                <button type="button" className="quick-add" onClick={() => handleAdd(book)} aria-label={t('app.add')}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    <span className="quick-label">{t('app.add')}</span>
                                </button>
                            )}
                        </div>
                    ))}

                    <button type="button" className="quick-all" onClick={showAll}>
                        <Icon name="search" size={18} />
                        <span className="display">{t('app.seeAll', { q: cleanTerm })}</span>
                        <span aria-hidden="true">→</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default SearchBox;
