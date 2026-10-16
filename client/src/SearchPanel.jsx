import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';
import { getAvatarSrc } from './utils';


function SearchPanel({ q, books, onAdded, onError, onClose }) {
    const { t, i18n } = useTranslation();
    const [results, setResults] = useState([]);
    const [people, setPeople] = useState([]);
    const [isSearching, setIsSearching] = useState(true);
    const [searchError, setSearchError] = useState('');

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

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/users?q=${encodeURIComponent(q)}`)
            .then((data) => {
                if (!ignore) setPeople(data);
            })
            .catch(() => {
                if (!ignore) setPeople([]);
            });
        return () => {
            ignore = true;
        };
    }, [q]);

    const handleAdd = (book) => {

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

            {people.length > 0 && (
                <>
                    <div className="search-section">{t('home.peopleTitle')}</div>
                    {people.map((person) => (
                        <Link key={person.id} to={`/u/${person.username}`} className="search-result search-person">
                            <img className="search-avatar" src={getAvatarSrc(person.avatarUrl)} alt="" />
                            <div className="search-info">
                                <div className="search-title">{person.displayName}</div>
                                <div className="search-author">@{person.username}</div>
                            </div>
                            {person.isFollowing && <span className="search-added">{t('home.followingBadge')}</span>}
                        </Link>
                    ))}
                    <div className="search-section">{t('home.booksTitle')}</div>
                </>
            )}

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
