import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import BookCover from './BookCover';
import Notice from './Notice';
import { apiFetch } from './api';

const TEXT_MAX = 2000;
const BOOKS_MAX = 4;

function PostComposer({ books, onCreated }) {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [chosenBooks, setChosenBooks] = useState([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const [error, setError] = useState('');
    const [isSending, setIsSending] = useState(false);

    const hasContent = text.trim() !== '' || imageFile !== null || chosenBooks.length > 0;
    const canSend = hasContent && !isSending;

    const handleImage = (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;

        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const removeImage = () => {
        URL.revokeObjectURL(imagePreview);
        setImageFile(null);
        setImagePreview('');
    };

    const chosenIds = chosenBooks.map((book) => book.bookId);
    const cleanFilter = filter.trim().toLowerCase();
    const options = books
        .filter((book) => !chosenIds.includes(book.bookId))
        .filter((book) =>
            book.title.toLowerCase().includes(cleanFilter) ||
            book.author.toLowerCase().includes(cleanFilter)
        )
        .slice(0, 6);

    const chooseBook = (book) => {
        setChosenBooks([...chosenBooks, book]);
        setFilter('');
        if (chosenBooks.length + 1 >= BOOKS_MAX) {
            setPickerOpen(false);
        }
    };

    const removeBook = (bookId) => {
        setChosenBooks(chosenBooks.filter((book) => book.bookId !== bookId));
    };

    const clearForm = () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setText('');
        setImageFile(null);
        setImagePreview('');
        setChosenBooks([]);
        setPickerOpen(false);
        setFilter('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSend) return;

        const formData = new FormData();
        formData.append('text', text);
        formData.append('bookIds', chosenIds.join(','));
        if (imageFile) {
            formData.append('image', imageFile);
        }

        setIsSending(true);
        setError('');
        apiFetch('/api/posts', { method: 'POST', body: formData })
            .then((post) => {
                onCreated(post);
                clearForm();
            })
            .catch((err) => setError(err.message))
            .finally(() => setIsSending(false));
    };

    return (
        <form className="card post-composer" onSubmit={handleSubmit}>
            <textarea
                className="post-composer-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('posts.placeholder')}
                aria-label={t('posts.placeholder')}
                maxLength={TEXT_MAX}
                rows={3}
            />
            <div className="post-composer-counter">{text.length} / {TEXT_MAX}</div>

            {imagePreview && (
                <div className="post-composer-image">
                    <img src={imagePreview} alt="" />
                    <button
                        type="button"
                        className="post-composer-remove"
                        onClick={removeImage}
                        aria-label={t('posts.removeImage')}
                    >
                        <Icon name="close" size={16} />
                    </button>
                </div>
            )}

            {chosenBooks.length > 0 && (
                <div className="post-composer-books">
                    {chosenBooks.map((book) => (
                        <span key={book.bookId} className="pill post-composer-book">
                            {book.title}
                            <button
                                type="button"
                                onClick={() => removeBook(book.bookId)}
                                aria-label={t('posts.removeBook', { title: book.title })}
                            >
                                <Icon name="close" size={14} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {pickerOpen && (
                <div className="post-picker">
                    <input
                        className="post-picker-input"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder={t('posts.filterBooks')}
                        aria-label={t('posts.filterBooks')}
                        autoFocus
                    />

                    {options.length === 0 && <p className="post-picker-empty">{t('posts.noMatches')}</p>}

                    {options.map((book) => (
                        <button
                            type="button"
                            key={book.bookId}
                            className="post-picker-option"
                            onClick={() => chooseBook(book)}
                        >
                            <BookCover src={book.coverImage} className="post-picker-cover" />
                            <span>
                                <span className="post-picker-title">{book.title}</span>
                                <span className="post-picker-author">{book.author}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {error && <Notice message={error} />}

            <div className="post-composer-bar">
                <label className="post-tool">
                    <Icon name="image" />
                    {t('posts.image')}
                    <input type="file" accept="image/jpeg,image/png,image/gif" onChange={handleImage} hidden />
                </label>

                <button
                    type="button"
                    className={`post-tool ${pickerOpen ? 'active' : ''}`}
                    onClick={() => setPickerOpen(!pickerOpen)}
                    disabled={chosenBooks.length >= BOOKS_MAX}
                    aria-expanded={pickerOpen}
                >
                    <Icon name="library" />
                    {t('posts.book')} ({chosenBooks.length}/{BOOKS_MAX})
                </button>

                <button type="submit" className="post-composer-send" disabled={!canSend}>
                    {isSending ? t('posts.publishing') : t('posts.publish')}
                </button>
            </div>
        </form>
    );
}

export default PostComposer