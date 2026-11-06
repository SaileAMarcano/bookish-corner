import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCover from './BookCover';
import Icon from './Icon';

function ListCard({ list }) {
    const { t } = useTranslation();
    const middle = (list.preview.length - 1) / 2;
    const link = `/lists/${list.id}`;

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
                <h3 className="display list-card-title">
                    <Link to={link}>{list.title}</Link>
                </h3>

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
                    <span className="list-card-stat">
                        <Icon name="sparkle" size={15} />
                        <span aria-hidden="true">{list.likeCount}</span>
                        <span className="sr-only">{t('lists.likeCount', { count: list.likeCount })}</span>
                    </span>
                    <span className="list-card-stat">
                        <Icon name="comment" size={15} />
                        <span aria-hidden="true">{list.commentCount}</span>
                        <span className="sr-only">{t('lists.commentCount', { count: list.commentCount })}</span>
                    </span>
                </footer>
            </div>
        </article>
    );
}

export default ListCard;