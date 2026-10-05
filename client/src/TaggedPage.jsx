import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PostCard from './PostCard';
import BookCover from './BookCover';
import Notice from './Notice';
import { apiFetch } from './api';

function TaggedPage({ currentUser }) {
    const { slug } = useParams();
    const { t, i18n } = useTranslation();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/tagged/${encodeURIComponent(slug)}`)
            .then((result) => {
                if (!ignore) {
                    setData(result);
                    setError('');
                }
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [slug, i18n.language]);

    const handlePostChange = (postId, changes) => {
        setData((current) => ({
            ...current,
            posts: current.posts.map((post) => (post.id === postId ? { ...post, ...changes } : post)),
        }));
    };

    const handlePostDeleted = (postId) => {
        setData((current) => ({
            ...current,
            posts: current.posts.filter((post) => post.id !== postId),
        }));
    };

    if (error) {
        return (
            <main className="page tagged-page">
                <div className="card tagged-hero">
                    <div>
                        <div className="tagged-kicker">{t('tagged.kicker')}</div>
                        <h1 className="display tagged-title">#{slug}</h1>
                    </div>
                </div>
                <Notice message={error} />
            </main>
        );
    }

    if (!data) {
        return (
            <main className="page tagged-page">
                <div className="section-label">{t('tagged.loading')}</div>
            </main>
        );
    }

    return (
        <main className="page tagged-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('tagged.kicker')}</div>
                    <h1 className="display tagged-title">#{data.tag.name}</h1>
                    <p className="tagged-count">{t('tagged.postCount', { count: data.posts.length })}</p>
                </div>
            </div>

            <div className="tagged-layout">
                <div className="post-list tagged-posts">
                    {data.posts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUserId={currentUser.id}
                            onChange={handlePostChange}
                            onDeleted={handlePostDeleted}
                            activeTag={data.tag.slug}
                        />
                    ))}
                </div>

                {data.relatedTags.length > 0 && (
                    <div className="card tagged-box tagged-related">
                        <h2 className="display tagged-box-title">{t('tagged.related')}</h2>
                        <div className="post-tags">
                            {data.relatedTags.map((tag) => (
                                <Link key={tag.slug} to={`/tagged/${tag.slug}`} className="pill post-tag">
                                    #{tag.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {data.books.length > 0 && (
                    <div className="card tagged-box tagged-books">
                        <h2 className="display tagged-box-title">{t('tagged.books')}</h2>
                        {data.books.map((book) => (
                            <div key={book.id} className="tagged-book">
                                <BookCover src={book.coverImage} className="tagged-book-cover" />
                                <div>
                                    <div className="display tagged-book-title">{book.title}</div>
                                    <div className="tagged-book-meta">
                                        {book.author} · {t('tagged.mentions', { count: book.mentions })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default TaggedPage