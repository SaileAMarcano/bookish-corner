import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import Icon from './Icon';
import BookCover from './BookCover';
import BookEditorForm from './BookEditorForm';
import { apiFetch } from './api';

function AdminCatalog() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [books, setBooks] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let ignore = false;

        const timer = setTimeout(() => {
            apiFetch(`/api/editor/books?q=${encodeURIComponent(search)}`)
                .then((data) => {
                    if (!ignore) setBooks(data);
                })
                .catch((err) => {
                    if (!ignore) setError(err.message);
                });
        }, 300);

        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, [search, version]);

    const handleSaved = (text) => {
        setMessage(text);
        setEditingId(null);
        setVersion((current) => current + 1);
    };

    const handleEdit = (id) => {
        setMessage('');
        setEditingId(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (book) => {
        if (confirmId !== book.id) {
            setConfirmId(book.id);
            return;
        }

        setError('');
        setMessage('');
        apiFetch(`/api/editor/books/${book.id}`, { method: 'DELETE' })
            .then(() => {
                setConfirmId(null);
                setMessage(t('catalog.deleted', { title: book.title }));
                setVersion((current) => current + 1);
            })
            .catch((err) => {
                setConfirmId(null);
                setError(err.message);
            });
    };

    return (
        <main className="page admin-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('catalog.kicker')}</div>
                    <h1 className="display tagged-title">{t('catalog.title')}</h1>
                    <p className="tagged-count">{t('catalog.lead')}</p>
                </div>
            </div>

            {message && <p className="admin-message catalog-message" role="status">{message}</p>}

            <div className="catalog-columns">
                <BookEditorForm
                    key={`${editingId ?? 'new'}-${version}`}
                    bookId={editingId}
                    onSaved={handleSaved}
                    onCancel={() => setEditingId(null)}
                />

                <section className="card admin-box">
                    <h2 className="section-label">{t('catalog.listTitle')}</h2>

                    <label className="admin-search">
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('catalog.searchPlaceholder')}
                            aria-label={t('catalog.searchPlaceholder')}
                        />
                    </label>

                    {error && <Notice message={error} />}

                    {!books ? (
                        <p className="tags-empty">{t('admin.loading')}</p>
                    ) : books.length === 0 ? (
                        <p className="tags-empty">{t('catalog.empty')}</p>
                    ) : (
                        <ul className="follow-list">
                            {books.map((book) => (
                                <li key={book.id} className="follow-row">
                                    <BookCover src={book.coverImage} className="catalog-list-cover" />

                                    <div className="follow-name">
                                        <Link to={`/book/${book.id}`} className="search-title">{book.title}</Link>
                                        <span className="search-author">
                                            {book.author}
                                            {book.year && ` · ${book.year}`}
                                        </span>
                                        <span className="search-author">
                                            {t('catalog.readers', { count: book.readers })}
                                            {book.addedBy && ` · ${t('catalog.addedBy', { username: book.addedBy })}`}
                                        </span>
                                    </div>

                                    <button type="button" className="invite-action" onClick={() => handleEdit(book.id)}>
                                        <Icon name="pencil" size={14} />
                                        {t('catalog.edit')}
                                    </button>
                                    <button
                                        type="button"
                                        className="invite-action"
                                        onClick={() => handleDelete(book)}
                                        aria-label={t('catalog.delete')}
                                    >
                                        {confirmId === book.id ? t('catalog.confirmDelete') : <Icon name="trash" size={14} />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
}

export default AdminCatalog;