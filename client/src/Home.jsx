import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { timeAgo, quoteOfTheDay, sortByLastRead, pageSummary, nightstandMessage } from './utils';
import { apiFetch } from './api';
import BookModal from './BookModal';
import Notice from './Notice';
import BookCover from './BookCover';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import ActivityCard from './ActivityCard';

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

    useEffect(() => {
        let ignore = false;
        setFeed(null);
        setFeedError('');

        apiFetch(`/api/feed?tab=${feedTab}`)
            .then((data) => {
                if (!ignore) setFeed(data.items);
            })
            .catch((error) => {
                if (!ignore) setFeedError(error.message);
            });

        return () => {
            ignore = true;
        };
    }, [feedTab, i18n.language, reloadCount]);

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
    const thisYear = String(new Date().getFullYear());
    const booksThisYear = books.filter(
        (book) => book.status === 'finished' && book.finishedAt?.startsWith(thisYear)).length;
    const goal = currentUser.readingGoal;
    const goalPercent = goal ? Math.min(100, Math.round((booksThisYear * 100) / goal)) : 0;
    const quote = quoteOfTheDay();
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
                </section>
            </div>

            <aside className="home-side">
                <div className="card home-card">
                    <div className="home-card-head">
                        <Icon name="reading" size={18} />
                        <h3 className="display home-card-title">{t('home.currentGoal')}</h3>
                    </div>

                    {goal ? (
                        <>
                            <div className="progress">
                                <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${goalPercent}%` }}></div>
                                </div>
                                <div className="progress-label">{booksThisYear}/{goal}</div>
                            </div>
                            <div className="home-muted">{t('home.booksThisYear')}</div>
                        </>
                    ) : (
                        <Link to="/profile/edit" className="home-goal-link">{t('home.setGoal')}</Link>
                    )}

                    <div className="home-note">
                        <Icon name="sparkle" size={14} />
                        {t('home.smallSteps')}
                    </div>
                </div>

                <div className="card home-card">
                    <div className="home-card-head">
                        <Icon name="sparkle" size={18} />
                        <h3 className="display home-card-title">{t('home.motivation')}</h3>
                    </div>
                    <p className="display home-quote">"{quote.text}"</p>
                    <div className="home-muted">— {quote.author}</div>
                </div>

            </aside>
            {selectedBook && (<BookModal book={selectedBook} onClose={() => setSelectedId(null)}
                onUpdate={onUpdate}
            />
            )}
        </main>
    );
}

export default Home
