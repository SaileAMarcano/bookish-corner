import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Icon from './Icon';
import { apiFetch } from './api';

function ListCard({ list, onChange, onEdit, onDelete }) {
    const { t } = useTranslation();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const middle = (list.preview.length - 1) / 2;
    const link = `/lists/${list.id}`;

    const toggle = (action, isOn) => {
        setBusy(true);
        apiFetch(`/api/lists/${list.id}/${action}`, { method: isOn ? 'DELETE' : 'POST' })
            .then((changes) => onChange(list.id, changes))
            .catch(() => {})
            .finally(() => setBusy(false));
    };

    return (
        <article className="card list-card">
            <Link to={link} className="list-card-fan" tabIndex={-1} aria-hidden="true">
                {list.preview.length === 0 ? (
                    <span className="list-card-nobooks">{t('lists.noBooks')}</span>
                ) : (
                    list.preview.map((book, index) => (
                        <span
                            key={book.id}
                            className="list-card-cover-wrap"
                            style={{ '--tilt': `${(index - middle) * 7}deg`, '--lift': `${Math.abs(index - middle) * 6}px` }}
                        >
                            <BookCover src={book.coverImage} title={book.title} author={book.author} bookId={book.id} className="list-card-cover" />
                        </span>
                    ))
                )}
            </Link>

            <div className="list-card-body">
                <div className="list-card-head">
                    <h3 className="display list-card-title">
                        <Link to={link}>{list.title}</Link>
                    </h3>

                    {onEdit && (
                        <button type="button" className="post-edit" onClick={() => onEdit(list)} aria-label={t('lists.edit')} title={t('lists.edit')}>
                            <Icon name="pencil" />
                        </button>
                    )}
                    {onDelete && (
                        <button type="button" className="post-delete" onClick={() => setConfirmDelete(true)} aria-label={t('lists.delete')} title={t('lists.delete')}>
                            <Icon name="trash" />
                        </button>
                    )}
                </div>

                {confirmDelete && (
                    <div className="post-confirm list-card-confirm" role="alert">
                        <p>{t('lists.confirmDelete', { title: list.title })}</p>
                        <div className="post-confirm-actions">
                            <button type="button" className="post-confirm-cancel" onClick={() => setConfirmDelete(false)}>
                                {t('common.cancel')}
                            </button>
                            <button type="button" className="post-confirm-delete" onClick={() => onDelete(list)}>
                                {t('lists.confirmYes')}
                            </button>
                        </div>
                    </div>
                )}

                <p className="list-card-meta">
                    {t('lists.bookCount', { count: list.bookCount })}
                    {!list.isPublic && (
                        <span className="list-card-private">
                            <Icon name="lock" size={13} />
                            {t('lists.private')}
                        </span>
                    )}
                </p>

                {list.description && <p className="list-card-description">{list.description}</p>}

                {list.tags.length > 0 && (
                    <div className="post-tags">
                        {list.tags.map((tag) => (
                            <Link key={tag.slug} to={`/tagged/${tag.slug}`} className="pill post-tag">#{tag.name}</Link>
                        ))}
                    </div>
                )}

                <footer className="list-card-foot">
                    <button
                        type="button"
                        className={`list-card-stat list-card-toggle ${list.hasLiked ? 'active' : ''}`}
                        onClick={() => toggle('like', list.hasLiked)}
                        aria-pressed={list.hasLiked}
                        disabled={busy}
                    >
                        <Icon name="sparkle" size={15} />
                        <span aria-hidden="true">{list.likeCount}</span>
                        <span className="sr-only">{t('lists.likeCount', { count: list.likeCount })}</span>
                    </button>
                    <span className="list-card-stat">
                        <Icon name="comment" size={15} />
                        <span aria-hidden="true">{list.commentCount}</span>
                        <span className="sr-only">{t('lists.commentCount', { count: list.commentCount })}</span>
                    </span>
                    <button
                        type="button"
                        className={`list-card-stat list-card-toggle list-card-save ${list.hasSaved ? 'active' : ''}`}
                        onClick={() => toggle('save', list.hasSaved)}
                        aria-pressed={list.hasSaved}
                        aria-label={list.hasSaved ? t('posts.saved') : t('posts.save')}
                        title={list.hasSaved ? t('posts.saved') : t('posts.save')}
                        disabled={busy}
                    >
                        <Icon name="bookmark" size={15} />
                    </button>
                </footer>
            </div>
        </article>
    );
}

export default ListCard;