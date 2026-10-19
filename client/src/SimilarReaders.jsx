import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Notice from './Notice';
import { apiFetch } from "./api";
import { getAvatarSrc } from "./utils";

function SimilarReaders({ username }) {
    const { t } = useTranslation();
    const [readers, setReaders] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/users/${encodeURIComponent(username)}/similar`)
            .then((data) => {
                if (!ignore) setReaders(data.map((reader) => ({ ...reader, isFollowing: false })));
            })
            .catch(() => {
                if (!ignore) setReaders([]);
            });

        return () => {
            ignore = true;
        };
    }, [username]);

    const handleFollow = (reader) => {
        setError('');
        apiFetch(`/api/users/${encodeURIComponent(reader.username)}/follow`, {
            method: reader.isFollowing ? 'DELETE' : 'POST',
        })
            .then((state) =>
                setReaders((current) =>
                    current.map((item) => (item.id === reader.id ? { ...item, isFollowing: state.isFollowing } : item))
                )
            )
            .catch((err) => setError(err.message));
    };

    if (readers === null) return null;

    return (
        <section className="card profile-side-card">
            <h3 className="display profile-side-title">{t('similar.title')}</h3>

            {readers.length === 0 && <p className="profile-about-empty">{t('similar.empty')}</p>}

            {readers.map((reader) => (
                <div key={reader.id} className="similar-row">
                    <img className="search-avatar" src={getAvatarSrc(reader.avatarUrl)} alt="" />

                    <div className="similar-info">
                        <Link to={`/u/${reader.username}`} className="similar-name">{reader.displayName}</Link>
                        <div className="similar-shared">
                            {reader.sharedBooks > 0 && t('similar.books', { count: reader.sharedBooks })}
                            {reader.sharedBooks > 0 && reader.sharedTags > 0 && ' · '}
                            {reader.sharedTags > 0 && t('similar.tags', { count: reader.sharedTags })}
                        </div>
                    </div>

                    <button type="button" className={`tag-follow similar-follow ${reader.isFollowing ? 'following' : ''}`} onClick={() => handleFollow(reader)} aria-pressed={reader.isFollowing}>
                        {reader.isFollowing ? t('userPage.followingButton') : t('userPage.follow')}
                    </button>
                </div>
            ))}

            {error && <Notice message={error} />}
        </section>
    );
}

export default SimilarReaders