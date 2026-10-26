import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { timeAgo, sortByLastRead, pageSummary, nightstandMessage } from './utils';
import { apiFetch } from './api';
import BookModal from './BookModal';
import Notice from './Notice';
import BookCover from './BookCover';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import ActivityCard from './ActivityCard';
import HomeSide from './HomeSide';

const FEED_TABS = ['for-you', 'following', 'recent'];

function ContinueReading({ book, onOpen }) {
    const { t } = useTranslation();

    return (
        <div className="card continue-card">
            <BookCover src={book.coverImage} className="continue-cover" />

            <div className="continue-info">
                <div className="display continue-title">{book.title}</div>
                <div className="continue-author">{book.author}</div>

                <div className="progress">
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${book.progress || 0}%` }}></div>
                    </div>
                    <div className="progress-label">{book.progress || 0}%</div>
                </div>

                <div className="continue-meta">
                    <Icon name="library" size={15} />
                    <span>{pageSummary(book)}</span>
                </div>

                {book.lastReadAt && (
                    <div className="continue-last">{t('home.lastRead', { time: timeAgo(book.lastReadAt) })}</div>
                )}
            </div>
            <button type="button" className="pill continue-button" onClick={onOpen}>
                {t('home.updateProgress')}
            </button>
        </div>
    );
}

function Home({ books, currentUser, onUpdate, booksStatus }) {
    const { t, i18n } = useTranslation();
    const [feedTab, setFeedTab] = useState('for-you');
    const [feed, setFeed] = useState(null);
    const [feedError, setFeedError] = useState('');
    const [reloadCount, setReloadCount] = useState(0);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [moreError, setMoreError] = useState('');
    const tabRef = useRef(feedTab);

    useEffect(() => {
        let ignore = false;
        tabRef.current = feedTab;
        setFeed(null);
        setFeedError('');
        setPage(0);
        setHasMore(false);
        setMoreError('');

        apiFetch(`/api/feed?tab=${feedTab}`)
            .then((data) => {
                if (ignore) return;
                setFeed(data.items);
                setHasMore(data.hasMore);
            })
            .catch((error) => {
                if (!ignore) setFeedError(error.message);
            });

        return () => {
            ignore = true;
        };
    }, [feedTab, i18n.language, reloadCount]);

    const handleLoadMore = () => {
        const tab = feedTab;
        const nextPage = page + 1;
        setIsLoadingMore(true);
        setMoreError('');

        apiFetch(`/api/feed?tab=${tab}&page=${nextPage}`)
            .then((data) => {
                if (tabRef.current !== tab) return;

                setFeed((current) => {
                    const shown = new Set(current.map((item) => `${item.type}-${item.id}`));
                    const newItems = data.items.filter((item) => !shown.has(`${item.type}-${item.id}`));
                    return [...current, ...newItems];
                });
                setPage(nextPage);
                setHasMore(data.hasMore);
            })
            .catch((error) => setMoreError(error.message))
            .finally(() => setIsLoadingMore(false));
    };

    const handlePostCreated = (post) => {
        setFeed((current) => [{ type: 'post', ...post }, ...(current || [])]);
    };

    const handlePostChange = (postId, changes) => {
        setFeed((current) =>
            current.map((item) => (item.type === 'post' && item.id === postId ? { ...item, ...changes } : item))
        );
    };

    const handlePostDeleted = (postId) => {
        setFeed((current) => current.filter((item) => !(item.type === 'post' && item.id === postId)));
    };

    const handleActivityChange = (activityId, changes) => {
        setFeed((current) =>
            current.map((item) => (item.type === 'activity' && item.id === activityId ? { ...item, ...changes } : item))
        );
    };

    const readingBooks = books.filter((book) => book.status === 'reading');
    const continueBook = sortByLastRead(readingBooks)[0];
    const [selectedId, setSelectedId] = useState(null);
    const selectedBook = books.find((book) => book.id === selectedId);
    const emptyMessage = nightstandMessage(booksStatus, books);

    return (
        <main className="page home">
            <div className="home-main">
                <h1 className="display home-welcome">{t('home.welcomeBack', { name: currentUser.displayName })}</h1>

                <section className="home-section">
                    <div className="home-section-head">
                        <h2 className="display home-section-title">{t('home.continueReading')}</h2>
                        <Link to="/reading" className="home-section-link">{t('common.viewAll')}</Link>
                    </div>

                    {continueBook ? (
                        <ContinueReading key={continueBook.id} book={continueBook} onOpen={() => setSelectedId(continueBook.id)} />
                    ) : (
                        emptyMessage && <div className="card home-empty">{emptyMessage}</div>
                    )}
                </section>

                <section className="post-list home-feed">
                    <PostComposer books={books} onCreated={handlePostCreated} />

                    <div className="profile-tabs home-tabs">
                        {FEED_TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                className={`profile-tab ${feedTab === tab ? 'active' : ''}`}
                                onClick={() => setFeedTab(tab)}
                                aria-pressed={feedTab === tab}
                            >
                                {t(`home.feedTabs.${tab}`)}
                            </button>
                        ))}
                    </div>

                    {feedError && <Notice message={feedError} onRetry={() => setReloadCount((count) => count + 1)} />}

                    {!feedError && feed === null && (
                        <div className="card profile-empty">{t('posts.loading')}</div>
                    )}

                    {feed && feed.length === 0 && (
                        <div className="card profile-empty">{t(`home.feedEmpty.${feedTab}`)}</div>
                    )}

                    {feed && feed.map((item) =>
                        item.type === 'post' ? (
                            <PostCard
                                key={`post-${item.id}`}
                                post={item}
                                currentUserId={currentUser.id}
                                onChange={handlePostChange}
                                onDeleted={handlePostDeleted}
                                books={books}
                            />
                        ) : (
                            <ActivityCard
                                key={`activity-${item.id}`}
                                activity={item}
                                currentUserId={currentUser.id}
                                onChange={handleActivityChange}
                            />
                        )
                    )}

                    {moreError && <Notice message={moreError} onRetry={handleLoadMore} />}

                    {feed && hasMore && !moreError && (
                        <button type="button" className="ghost-button home-load-more" onClick={handleLoadMore} disabled={isLoadingMore}>
                            {isLoadingMore ? t('home.loadingMore') : t('home.loadMore')}
                        </button>
                    )}

                </section>
            </div>

            <HomeSide books={books} currentUser={currentUser} />

            {selectedBook && (<BookModal book={selectedBook} onClose={() => setSelectedId(null)}
                onUpdate={onUpdate}
            />
            )}
        </main>
    );
}

export default Home
