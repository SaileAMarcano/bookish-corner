import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Icon from './Icon';
import { apiFetch } from './api';
import { libraryMatch } from './searchUtils';

function SearchBookResult({ book, books, onAdded }) {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [addedId, setAddedId] = useState(null);
    const [added, setAdded] = useState(false);
    const [error, setError] = useState('');
    const pending = useRef(false);
    const match = libraryMatch(book, books);
    const bookId = book.bookId || match?.bookId || addedId;
    const inLibrary = Boolean(match) || added;

    const handleAdd = async () => {
        if (pending.current || inLibrary) return;
        pending.current = true;
        setBusy(true);
        setError('');
        try {
            const result = book.bookId
                ? await apiFetch('/api/user-books', { method: 'POST', body: { bookId: book.bookId } })
                : await apiFetch('/api/user-books/from-search', { method: 'POST', body: { openLibraryKey: book.openLibraryKey } });
            setAdded(true);
            setAddedId(result.book?.id || result.bookId || book.bookId);
            await onAdded();
        } catch (err) { setError(err.message); }
        finally { pending.current = false; setBusy(false); }
    };

    return (
        <article className="discovery-book-result">
            <div className="discovery-book-cover-wrap">
                {bookId ? <Link to={`/book/${bookId}`} className="discovery-book-cover-link" aria-label={t('discoverySearch.openBook', { title: book.title })}>
                    <BookCover src={book.coverImage} className="discovery-result-cover" title={book.title} author={book.author} bookId={bookId} />
                </Link> : <BookCover src={book.coverImage} className="discovery-result-cover" title={book.title} author={book.author} bookId={book.openLibraryKey} />}
            </div>
            <div className="discovery-book-caption">
                <div className="discovery-result-info">
                    {bookId ? <Link to={`/book/${bookId}`} className="display discovery-result-title">{book.title}</Link> : <strong className="display discovery-result-title">{book.title}</strong>}
                    <Link className="discovery-result-meta" to={`/author/${encodeURIComponent(book.author)}`}>{book.author}</Link>
                    {book.year && <span className="discovery-result-year">{book.year}</span>}
                </div>
                {inLibrary ? <span className="discovery-result-added"><Icon name="check" size={15} />{t('app.inLibrary')}</span>
                    : <button type="button" className="discovery-result-action" onClick={handleAdd} disabled={busy} aria-label={t('discoverySearch.addBook', { title: book.title })}>{t(busy ? 'discoverySearch.adding' : 'app.add')}</button>}
            </div>
            {error && <p className="discovery-result-error" role="alert">{error}</p>}
        </article>
    );
}

export default SearchBookResult;
