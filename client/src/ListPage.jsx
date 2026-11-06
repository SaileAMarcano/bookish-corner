import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import StarRating from './StarRating';
import EmptyState from './EmptyState';
import ListCard from './ListCard';
import ListForm from './ListForm';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';
import { getAvatarSrc, timeAgo } from './utils';

const MORE_LISTS = 3;

function ListPage({ currentUser, books, onLibraryChange }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [list, setList] = useState(null);
    const [moreLists, setMoreLists] = useState([]);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/lists/${encodeURIComponent(id)}`)
            .then((data) => {
                if (ignore) return;
                setList(data);
                setError('');
                return apiFetch(`/api/users/${encodeURIComponent(data.username)}/lists`);
            })
            .then((others) => {
                if (!ignore && others) {
                    setMoreLists(others.filter((item) => String(item.id) !== String(id)).slice(0, MORE_LISTS));
                }
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [id, i18n.language]);

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(timer);
    }, [copied]);

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href)
            .then(() => setCopied(true))
            .catch(() => setActionError(t('listPage.copyFailed')));
    };

    const handleAdd = (bookId) => {
        setActionError('');
        apiFetch('/api/user-books', { method: 'POST', body: { bookId, status: 'want-to-read' } })
            .then(() => onLibraryChange())
            .catch((err) => setActionError(err.message));
    };

    const handleSaved = (saved) => {
        setList(saved);
        setEditing(false);
    };

    const handleDelete = () => {
        setActionError('');
        apiFetch(`/api/lists/${list.id}`, { method: 'DELETE' })
            .then(() => navigate('/profile?tab=lists'))
            .catch((err) => setActionError(err.message));
    };

    if (error) {
        return (
            <main className="page list-page">
                <Notice message={error} />
            </main>
        );
    }

    if (!list) {
        return (
            <main className="page list-page">
                <div className="section-label">{t('listPage.loading')}</div>
            </main>
        );
    }

    const isMine = list.userId === currentUser.id;
    const ownerLink = isMine ? '/profile?tab=lists' : `/u/${list.username}?tab=lists`;
    const middle = (list.preview.length - 1) / 2;

    return (
        <main className="page list-page">
            <button type="button" className="ghost-button post-page-back" onClick={() => navigate(-1)}>
                <Icon name="arrowLeft" size={14} />
                {t('postPage.back')}
            </button>

            <section className="card list-hero">
                <div className="list-card-fan list-hero-fan" aria-hidden="true">
                    {list.preview.length === 0 && <span className="list-card-nobooks">{t('lists.noBooks')}</span>}
                    {list.preview.map((book, index) => (
                        <span
                            key={book.id}
                            className="list-card-cover-wrap"
                            style={{ '--tilt': `${(index - middle) * 7}deg`, '--lift': `${Math.abs(index - middle) * 6}px` }}
                        >
                            <BookCover src={book.coverImage} title={book.title} author={book.author} bookId={book.id} className="list-card-cover" />
                        </span>
                    ))}
                </div>

                <div className="list-hero-info">
                    <span className="brand-kicker list-hero-kicker">
                        {t('listPage.kicker')}
                        {!list.isPublic && (
                            <span className="list-card-private">
                                <Icon name="lock" size={13} />
                                {t('lists.private')}
                            </span>
                        )}
                    </span>

                    <h1 className="display list-hero-title">{list.title}</h1>
                    {list.description && <p className="list-hero-description">{list.description}</p>}

                    <Link to={ownerLink} className="list-hero-owner">
                        <img className="search-avatar" src={getAvatarSrc(list.avatarUrl)} alt="" />
                        <span>
                            <span className="list-hero-owner-name">{t('listPage.by', { name: list.displayName })}</span>
                            <span className="list-hero-owner-meta">
                                {t('lists.bookCount', { count: list.bookCount })} · {t('listPage.updated', { time: timeAgo(list.updatedAt) })}
                            </span>
                        </span>
                    </Link>

                    {list.tags.length > 0 && (
                        <div className="post-tags">
                            {list.tags.map((tag) => (
                                <Link key={tag.slug} to={`/tagged/${tag.slug}`} className="pill post-tag">#{tag.name}</Link>
                            ))}
                        </div>
                    )}

                    <div className="list-hero-actions">
                        <button type="button" className="invite-action" onClick={handleCopy}>
                            <Icon name={copied ? 'check' : 'share'} size={15} />
                            {copied ? t('listPage.copied') : t('listPage.copyLink')}
                        </button>
                        {isMine && (
                            <>
                                <button type="button" className="invite-action" onClick={() => setEditing(true)}>
                                    <Icon name="pencil" size={15} />
                                    {t('lists.edit')}
                                </button>
                                <button type="button" className="invite-action list-hero-delete" onClick={() => setConfirmDelete(true)}>
                                    <Icon name="trash" size={15} />
                                    {t('lists.delete')}
                                </button>
                            </>
                        )}
                    </div>

                    {confirmDelete && (
                        <div className="post-confirm list-card-confirm" role="alert">
                            <p>{t('lists.confirmDelete', { title: list.title })}</p>
                            <div className="post-confirm-actions">
                                <button type="button" className="post-confirm-cancel" onClick={() => setConfirmDelete(false)}>
                                    {t('common.cancel')}
                                </button>
                                <button type="button" className="post-confirm-delete" onClick={handleDelete}>
                                    {t('lists.confirmYes')}
                                </button>
                            </div>
                        </div>
                    )}

                    {actionError && <Notice message={actionError} />}
                </div>
            </section>

            <section className="card book-section">
                <h2 className="display book-section-title">
                    {t('listPage.books')} <span className="follow-count">{list.books.length}</span>
                </h2>

                {list.books.length === 0 ? (
                    <EmptyState compact kind="lists" title={t('listPage.empty')} />
                ) : (
                    <ol className="list-page-books">
                        {list.books.map((book, index) => {
                            const mine = books.find((item) => item.bookId === book.id);

                            return (
                                <li key={book.id} className="list-page-book">
                                    <span className="list-page-number">{index + 1}</span>
                                    <Link to={`/book/${book.id}`} className="list-page-cover-link" aria-hidden="true" tabIndex={-1}>
                                        <BookCover src={book.coverImage} title={book.title} author={book.author} bookId={book.id} className="list-page-cover" />
                                    </Link>

                                    <div className="list-page-info">
                                        <h3 className="display list-page-title">
                                            <Link to={`/book/${book.id}`}>{book.title}</Link>
                                        </h3>
                                        <p className="list-page-author">{book.author}</p>

                                        <div className="list-page-rating">
                                            <StarRating value={book.averageRating || 0} size={15} />
                                            <span>
                                                {book.averageRating
                                                    ? t('bookPage.ratingSummary', { average: book.averageRating, count: book.ratingCount })
                                                    : t('bookPage.noRatings')}
                                            </span>
                                        </div>

                                        {book.daysToFinish && (
                                            <p className="list-page-days">
                                                <Icon name="clock" size={13} />
                                                {t('listPage.readIn', { count: book.daysToFinish })}
                                            </p>
                                        )}

                                        {book.note && (
                                            <blockquote className="list-page-note">
                                                <Icon name="feather" size={14} />
                                                <span>{book.note}</span>
                                            </blockquote>
                                        )}
                                    </div>

                                    <div className="list-page-action">
                                        {mine ? (
                                            <span className={`pill book-status status-${mine.status}`}>
                                                {t('bookPage.inYourLibrary', { status: t(`status.${mine.status}`) })}
                                            </span>
                                        ) : (
                                            <button type="button" className="tag-follow list-page-want" onClick={() => handleAdd(book.id)}>
                                                {t('bookPage.wantToRead')}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </section>

            {moreLists.length > 0 && (
                <section className="list-page-more">
                    <h2 className="display book-section-title">{t('listPage.moreFrom', { name: list.displayName })}</h2>
                    <div className="list-grid">
                        {moreLists.map((item) => <ListCard key={item.id} list={item} />)}
                    </div>
                </section>
            )}

            {editing && <ListForm list={list} onClose={() => setEditing(false)} onSaved={handleSaved} />}
        </main>
    );
}

export default ListPage;