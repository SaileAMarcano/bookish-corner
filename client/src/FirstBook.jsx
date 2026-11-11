import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import Notice from './Notice';
import SearchBookResult from './SearchBookResult';
import { apiFetch } from './api';
import { searchBookKey } from './searchUtils';

function FirstBook({ books, onAdded, onClose }) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const dialogRef = useRef(null);
    const inputRef = useRef(null);
    const [q, setQ] = useState('');
    const [popular, setPopular] = useState(null);
    const [results, setResults] = useState({ key: '', items: [], error: '' });
    const [retry, setRetry] = useState(0);
    const [addedTitle, setAddedTitle] = useState('');
    const term = q.trim();
    const key = `${term}|${i18n.language}|${retry}`;
    const searching = term.length >= 2;
    const loading = searching && results.key !== key;

    useEffect(() => {
        const dialog = dialogRef.current;
        const previousOverflow = document.body.style.overflow;
        dialog.showModal();
        inputRef.current?.focus();
        document.body.style.overflow = 'hidden';
        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        apiFetch('/api/books/popular')
            .then(setPopular)
            .catch(() => setPopular([]));
    }, [i18n.language]);

    useEffect(() => {
        if (!searching) return undefined;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            apiFetch(`/api/search-books?q=${encodeURIComponent(term)}&limit=6`, { signal: controller.signal })
                .then((items) => {
                    if (!controller.signal.aborted) setResults({ key, items, error: '' });
                })
                .catch((error) => {
                    if (!controller.signal.aborted) setResults({ key, items: [], error: error.message });
                });
        }, 350);
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [term, key, searching]);

    const handleAdded = (book) => async () => {
        await onAdded();
        setAddedTitle(book.title);
    };

    const goToLibrary = () => {
        onClose();
        navigate('/library');
    };

    const shown = searching ? results.items : popular || [];

    return (
        <dialog ref={dialogRef} className="review-book-picker first-book" aria-labelledby="first-book-title" onCancel={onClose}>
            <header>
                <div>
                    <span className="first-book-kicker">{t('firstBook.kicker')}</span>
                    <h2 className="display" id="first-book-title">{t('firstBook.title')}</h2>
                </div>
                <button type="button" onClick={onClose} aria-label={t('common.close')}><Icon name="close" /></button>
            </header>

            {addedTitle ? (
                <div className="first-book-done" role="status">
                    <span className="first-book-done-icon" aria-hidden="true"><Icon name="check" size={26} /></span>
                    <p className="display first-book-done-title">{t('firstBook.doneTitle')}</p>
                    <p>{t('firstBook.doneText', { title: addedTitle })}</p>
                    <div className="first-book-actions">
                        <button type="button" className="ghost-button" onClick={() => setAddedTitle('')}>{t('firstBook.addAnother')}</button>
                        <button type="button" className="edit-save" onClick={goToLibrary}>{t('firstBook.goToLibrary')}</button>
                    </div>
                </div>
            ) : (
                <>
                    <p>{t('firstBook.text')}</p>
                    <form className="discovery-search" role="search" onSubmit={(event) => event.preventDefault()}>
                        <Icon name="search" />
                        <input
                            ref={inputRef}
                            type="search"
                            maxLength={120}
                            value={q}
                            onChange={(event) => setQ(event.target.value)}
                            placeholder={t('firstBook.placeholder')}
                            aria-label={t('firstBook.placeholder')}
                            autoComplete="off"
                        />
                    </form>

                    <div className="first-book-content" aria-live="polite" aria-busy={loading}>
                        <h3 className="section-label first-book-label">{searching ? t('firstBook.results') : t('firstBook.popular')}</h3>
                        {loading && <p className="discovery-search-status" role="status">{t('home.searching')}</p>}
                        {searching && !loading && results.error && <Notice message={results.error} onRetry={() => setRetry((value) => value + 1)} />}
                        {searching && !loading && !results.error && !shown.length && <p className="first-book-empty">{t('firstBook.noResults')}</p>}
                        {!searching && popular === null && <p className="discovery-search-status" role="status">{t('admin.loading')}</p>}
                        {!loading && shown.length > 0 && (
                            <div className="discovery-book-grid first-book-grid">
                                {shown.map((book) => <SearchBookResult key={searchBookKey(book)} book={book} books={books} onAdded={handleAdded(book)} />)}
                            </div>
                        )}
                    </div>

                    <div className="first-book-actions">
                        <button type="button" className="ghost-button" onClick={onClose}>{t('firstBook.later')}</button>
                    </div>
                </>
            )}
        </dialog>
    );
}

export default FirstBook;
