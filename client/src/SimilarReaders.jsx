import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Notice from './Notice';
import EmptyState from './EmptyState';
import Icon from './Icon';
import { apiFetch } from "./api";
import { getAvatarSrc } from "./utils";

function SimilarReaders({ username, onDiscover }) {
    const { t } = useTranslation();
    const [readers, setReaders] = useState(null);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/users/${encodeURIComponent(username)}/similar`)
            .then((data) => {
                if (!ignore) { setReaders(data.map((reader) => ({ ...reader, isFollowing: false }))); setError(''); }
            })
            .catch((err) => {
                if (!ignore) { setError(err.message); setReaders([]); }
            });

        return () => {
            ignore = true;
        };
    }, [username, retry]);

    const handleFollow = (reader) => {
        if (pending) return;
        setPending(true);
        setError('');
        apiFetch(`/api/users/${encodeURIComponent(reader.username)}/follow`, {
            method: reader.isFollowing ? 'DELETE' : 'POST',
        })
            .then((state) =>
                setReaders((current) =>
                    current.map((item) => (item.id === reader.id ? { ...item, isFollowing: state.isFollowing } : item))
                )
            )
            .catch((err) => setError(err.message))
            .finally(() => setPending(false));
    };

    return (
        <section className="profile-side-card">
            <h3 className="display profile-side-title">{t('similar.title')}</h3>

            {readers?.length === 0 && !error && <EmptyState compact kind="readers" title={t('similar.empty')} description={t('explorePage.readerHint')} />}

            {readers?.map((reader) => (
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

                    <button type="button" className={`tag-follow similar-follow ${reader.isFollowing ? 'following' : ''}`} disabled={pending} onClick={() => handleFollow(reader)} aria-pressed={reader.isFollowing}>
                        {reader.isFollowing ? t('userPage.followingButton') : t('userPage.follow')}
                    </button>
                </div>
            ))}

            {readers === null && <p role="status">{t('tagged.loading')}</p>}
            {onDiscover && <button type="button" className="explore-text-link" onClick={onDiscover}>{t('exploreArt.discoverPeople')}<Icon name="arrowRight" size={17} /></button>}
            {error && <Notice message={error} onRetry={() => setRetry((value) => value + 1)} />}
        </section>
    );
}

export default SimilarReaders