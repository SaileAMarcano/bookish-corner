import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import { apiFetch } from './api';
import { getAvatarSrc } from './utils';

function FollowList({ username }) {
    const { t } = useTranslation();
    const [lists, setLists] = useState(null);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');

    const base = `/api/users/${encodeURIComponent(username)}`;

    useEffect(() => {
        let ignore = false;

        Promise.all([apiFetch(`${base}/followers`), apiFetch(`${base}/following`)])
            .then(([followers, following]) => {
                if (!ignore) setLists({ followers, following });
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [base]);

    const handleFollow = (person) => {
        setActionError('');
        apiFetch(`/api/users/${encodeURIComponent(person.username)}/follow`, {
            method: person.isFollowing ? 'DELETE' : 'POST',
        })
            .then((state) => {
                const update = (list) =>
                    list.map((item) => (item.id === person.id ? { ...item, isFollowing: state.isFollowing } : item));
                setLists((current) => ({ followers: update(current.followers), following: update(current.following) }));
            })
            .catch((err) => setActionError(err.message));
    };

    if (error) {
        return <Notice message={error} />;
    }

    if (!lists) {
        return <div className="card profile-empty">{t('follows.loading')}</div>;
    }

    const renderList = (title, people, emptyText) => (
        <section className="card follow-box">
            <h2 className="display follow-title"> {title} <span className="follow-count">{people.length}</span></h2>

            {people.length === 0 ? (
                <p className="profile-about-empty">{emptyText}</p>
            ) : (
                <ul className="follow-list">
                    {people.map((person) => (
                        <li key={person.id} className="follow-row">
                            <img className="search-avatar" src={getAvatarSrc(person.avatarUrl)} alt="" />

                            <Link to={`/u/${person.username}`} className="follow-name">
                                <span className="search-title">{person.displayName}</span>
                                <span className="search-author">@{person.username}</span>
                            </Link>

                            <button type="button" className={`tag-follow follow-button ${person.isFollowing ? 'following' : ''}`} onClick={() => handleFollow(person)} aria-pressed={person.isFollowing}>
                                {person.isFollowing ? t('userPage.followingButton') : t('userPage.follow')}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );

    return (
        <>
            {actionError && <Notice message={actionError} />}

            <div className="follow-layout">
                {renderList(t('userPage.followers'), lists.followers, t('follows.noFollowers'))}
                {renderList(t('userPage.followingCount'), lists.following, t('follows.noFollowing'))}
            </div>

        </>
    );
}

export default FollowList