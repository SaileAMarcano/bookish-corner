import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import Notice from './Notice';
import ReadingChallenge from './ReadingChallenge';
import { apiFetch } from './api';
import { getAvatarSrc, quoteOfTheDay } from './utils';

const TAGS_SHOWN = 10;
const READERS_SHOWN = 3;

function HomeSide({ books, currentUser }) {
    const { t } = useTranslation();
    const [tags, setTags] = useState(null);
    const [readers, setReaders] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let ignore = false;

        Promise.all([
            apiFetch('/api/tags/popular'),
            apiFetch(`/api/users/${encodeURIComponent(currentUser.username)}/following`),
        ])
            .then(([tagsData, readersData]) => {
                if (ignore) return;
                setTags(tagsData.slice(0, TAGS_SHOWN));
                setReaders(readersData.slice(0, READERS_SHOWN));
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [currentUser.username]);

    const quote = quoteOfTheDay();

    return (
        <aside className="home-side">
            <ReadingChallenge books={books} readingGoal={currentUser.readingGoal} isMe />

            {error && <Notice message={error} />}

            {tags && (
                <section className="card profile-side-card">
                    <div className="profile-side-head">
                        <h3 className="display profile-side-title">{t('home.popularTags')}</h3>
                        <Link to="/tags" className="profile-side-more" aria-label={t('home.seeAllTags')}>
                            <Icon name="chevronRight" size={18} />
                        </Link>
                    </div>

                    {tags.length === 0 ? (
                        <p className="profile-about-empty">{t('home.noTags')}</p>
                    ) : (
                        <div className="post-tags home-side-tags">
                            {tags.map((tag) => (
                                <Link key={tag.slug} to={`/tagged/${tag.slug}`} className="pill post-tag">
                                    #{tag.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {readers && (
                <section className="card profile-side-card">
                    <div className="profile-side-head">
                        <h3 className="display profile-side-title">{t('home.readersYouFollow')}</h3>
                        <Link to="/profile?tab=following" className="profile-side-more" aria-label={t('home.seeAllFollowing')}>
                            <Icon name="chevronRight" size={18} />
                        </Link>
                    </div>

                    {readers.length === 0 ? (
                        <p className="profile-about-empty">{t('home.noFollowing')}</p>
                    ) : (
                        <ul className="home-readers">
                            {readers.map((reader) => (
                                <li key={reader.id}>
                                    <Link to={`/u/${reader.username}`} className="home-reader">
                                        <img className="search-avatar" src={getAvatarSrc(reader.avatarUrl)} alt="" />
                                        <span className="home-reader-text">
                                            <span className="search-title">{reader.displayName}</span>
                                            <span className="search-author">@{reader.username}</span>
                                            {reader.bio && <span className="home-reader-bio">{reader.bio}</span>}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            <section className="card profile-side-card">
                <h3 className="display profile-side-title">{t('home.motivation')}</h3>
                <p className="display home-quote">"{quote.text}"</p>
                <div className="home-muted">— {quote.author}</div>
            </section>
        </aside>
    );
}

export default HomeSide