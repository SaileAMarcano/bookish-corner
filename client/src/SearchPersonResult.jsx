import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';
import { getAvatarSrc } from './utils';

function SearchPersonResult({ person, onChange }) {
    const { t } = useTranslation();
    const [following, setFollowing] = useState(Boolean(person.isFollowing));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const pending = useRef(false);

    const handleFollow = async () => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError('');
        try {
            const result = await apiFetch(`/api/users/${encodeURIComponent(person.username)}/follow`, { method: following ? 'DELETE' : 'POST' });
            setFollowing(result.isFollowing);
            onChange(person.id, result.isFollowing);
        } catch (err) { setError(err.message); }
        finally { pending.current = false; setBusy(false); }
    };

    return (
        <div className="discovery-person-result">
            <div className="discovery-result-row">
                <img className="search-avatar" src={getAvatarSrc(person.avatarUrl)} alt="" />
                <Link className="discovery-result-info" to={`/u/${person.username}`}>
                    <strong className="discovery-result-title">{person.displayName}</strong><span className="discovery-result-meta">@{person.username}</span>
                </Link>
                <button type="button" className="discovery-result-action" aria-pressed={following} onClick={handleFollow} disabled={busy}>{t(following ? 'userPage.followingButton' : 'userPage.follow')}</button>
            </div>
            {error && <p className="discovery-result-error" role="alert">{error}</p>}
        </div>
    );
}

export default SearchPersonResult;
