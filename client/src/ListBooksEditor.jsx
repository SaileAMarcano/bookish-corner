import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Icon from './Icon';
import { apiFetch } from './api';

const BOOKS_MAX = 100;
const NOTE_MAX = 280;
const WAIT_MS = 250;

function moveItem(items, from, to) {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}

function ListBooksEditor({ books, onChange }) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [results, setResults] = useState({ term: '', items: [] });
    const [dragIndex, setDragIndex] = useState(null);

    const term = search.trim();
    const chosenIds = books.map((book) => book.id);
    const isFull = books.length >= BOOKS_MAX;

    useEffect(() => {
        if (term.length < 2) return;

        let ignore = false;
        const timer = setTimeout(() => {
            apiFetch(`/api/search-books?q=${encodeURIComponent(term)}&source=catalog`)
                .then((data) => {
                    if (!ignore) setResults({ term, items: data });
                })
                .catch(() => {
                    if (!ignore) setResults({ term, items: [] });
                });
        }, WAIT_MS);

        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, [term]);

    const searched = term.length >= 2 && results.term === term;
    const options = searched ? results.items.filter((item) => item.bookId && !chosenIds.includes(item.bookId)) : [];

    const addBook = (item) => {
        onChange([...books, { id: item.bookId, title: item.title, author: item.author, coverImage: item.coverImage, note: '' }]);
        setSearch('');
    };

    const removeBook = (index) => {
        onChange(books.filter((book, i) => i !== index));
    };

    const changeNote = (index, note) => {
        onChange(books.map((book, i) => (i === index ? { ...book, note } : book)));
    };

    const moveBook = (from, to) => {
        if (to < 0 || to >= books.length) return;
        onChange(moveItem(books, from, to));
    };

    const handleDragStart = (e, index) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.setDragImage(e.currentTarget.closest('li'), 24, 24);
        setDragIndex(index);
    };

    const handleDrop = (e, index) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== index) moveBook(dragIndex, index);
        setDragIndex(null);
    };

    return (
        <div className="list-books-editor">
            <div className="list-books-search">
                <Icon name="search" size={16} />
                <input
                    type="search"
                    className="edit-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('lists.form.searchBooks')}
                    aria-label={t('lists.form.searchBooks')}
                    disabled={isFull}
                />
            </div>

            {searched && (
                <div className="post-picker list-books-results">
                    {options.length === 0 ? (
                        <p className="post-picker-empty">{t('lists.form.noResults')}</p>
                    ) : (
                        options.map((item) => (
                            <button key={item.bookId} type="button" className="post-picker-option" onClick={() => addBook(item)}>
                                <BookCover src={item.coverImage} title={item.title} author={item.author} bookId={item.bookId} className="post-picker-cover" />
                                <span>
                                    <span className="post-picker-title">{item.title}</span>
                                    <span className="post-picker-author">{item.author}</span>
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}

            <p className="edit-hint">
                {t('lists.form.bookLimit', { count: books.length, max: BOOKS_MAX })}
                {books.length > 1 && ` · ${t('lists.form.dragHint')}`}
            </p>

            {books.length > 0 && (
                <ol className="list-book-rows">
                    {books.map((book, index) => (
                        <li
                            key={book.id}
                            className={`list-book-row ${dragIndex === index ? 'dragging' : ''}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, index)}
                        >
                            <span
                                className="list-book-grip"
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnd={() => setDragIndex(null)}
                                aria-hidden="true"
                            >
                                <Icon name="more" size={16} />
                            </span>
                            <span className="list-book-number">{index + 1}</span>
                            <BookCover src={book.coverImage} title={book.title} author={book.author} bookId={book.id} className="post-picker-cover" />

                            <div className="list-book-info">
                                <span className="post-picker-title">{book.title}</span>
                                <span className="post-picker-author">{book.author}</span>
                                <input
                                    className="edit-input list-book-note"
                                    value={book.note}
                                    onChange={(e) => changeNote(index, e.target.value)}
                                    placeholder={t('lists.form.notePlaceholder')}
                                    aria-label={t('lists.form.noteFor', { title: book.title })}
                                    maxLength={NOTE_MAX}
                                />
                            </div>

                            <div className="list-book-actions">
                                <button type="button" className="list-book-move up" onClick={() => moveBook(index, index - 1)} disabled={index === 0} aria-label={t('lists.form.moveUp', { title: book.title })}>
                                    <Icon name="chevronDown" size={16} />
                                </button>
                                <button type="button" className="list-book-move" onClick={() => moveBook(index, index + 1)} disabled={index === books.length - 1} aria-label={t('lists.form.moveDown', { title: book.title })}>
                                    <Icon name="chevronDown" size={16} />
                                </button>
                                <button type="button" className="list-book-move remove" onClick={() => removeBook(index)} aria-label={t('lists.form.remove', { title: book.title })}>
                                    <Icon name="close" size={16} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

export default ListBooksEditor;