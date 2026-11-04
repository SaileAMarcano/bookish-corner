import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import EmptyState from './EmptyState';
import Icon from './Icon';

function ReviewBookPicker({ books, onSelect, onClose }) {
    const { t } = useTranslation();
    const dialogRef = useRef(null);
    const [search, setSearch] = useState('');
    const term = search.trim().toLocaleLowerCase();
    const shown = books.filter((book) => `${book.title} ${book.author}`.toLocaleLowerCase().includes(term));

    useEffect(() => {
        const dialog = dialogRef.current;
        const previousOverflow = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
    }, []);

    return (
        <dialog ref={dialogRef} className="review-book-picker" aria-labelledby="review-picker-title" onCancel={onClose}>
            <header><h2 className="display" id="review-picker-title">{t('reviewsPage.chooseBook')}</h2><button type="button" onClick={onClose} aria-label={t('common.close')}><Icon name="close" /></button></header>
            <p>{t('reviewsPage.chooseHint')}</p>
            <label className="discovery-search"><Icon name="search" /><input type="search" aria-label={t('reviewsPage.searchLibrary')} placeholder={t('reviewsPage.searchLibrary')} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <div className="review-picker-list">
                {shown.map((book) => <button key={book.id} type="button" onClick={() => onSelect(book)}>
                    <BookCover src={book.coverImage} className="review-picker-cover" title={book.title} author={book.author} bookId={book.bookId} />
                    <span><strong className="display">{book.title}</strong><small>{book.author}</small></span><Icon name="feather" />
                </button>)}
                {!shown.length && <EmptyState compact title={t(books.length ? 'reviewsPage.noBookMatches' : 'reviewsPage.noLibraryBooks')}>
                    {!books.length && <Link onClick={onClose} to="/library">{t('nav.library')}</Link>}
                </EmptyState>}
            </div>
        </dialog>
    );
}

export default ReviewBookPicker;
