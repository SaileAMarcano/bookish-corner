import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';
import { getAvatarSrc } from './utils';
import Notice from './Notice';

const BIO_MAX = 160;

function Section({ title, subtitle, children }) {
    return (
        <div className="card edit-card">
            <div className="edit-card-head">
                <span className="edit-card-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3l2.3 9.7L24 12l-9.7 2.3L12 24l-2.3-9.7L0 12l9.7-2.3z" />
                    </svg>
                </span>
                <div>
                    <h2 className="display edit-card-title">{title}</h2>
                    <p className="edit-card-sub">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

function EditProfile({ onSaved }) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [loaded, setLoaded] = useState(null);
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [readingGoal, setReadingGoal] = useState('');
    const [aboutMe, setAboutMe] = useState('');
    const [favoriteQuote, setFavoriteQuote] = useState('');
    const [favoriteThings, setFavoriteThings] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [tiktokUrl, setTiktokUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [saveError, setSaveError] = useState('');

    const fillForm = (data) => {
        setUsername(data.username || '');
        setDisplayName(data.displayName || '');
        setBio(data.bio || '');
        setLocation(data.location || '');
        setReadingGoal(data.readingGoal || '');
        setAboutMe(data.aboutMe || '');
        setFavoriteQuote(data.favoriteQuote || '');
        setFavoriteThings(data.favoriteThings || '');
        setInstagramUrl(data.instagramUrl || '');
        setTiktokUrl(data.tiktokUrl || '');
        setAvatarUrl(data.avatarUrl);
    };

    const loadProfile = () => {
        setLoadError('');
        apiFetch('/api/profile')
            .then((data) => {
                setLoaded(data);
                fillForm(data);
            })
            .catch((error) => setLoadError(error.message));
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const handleDiscard = () => {
        if (loaded) fillForm(loaded);
        setAvatarFile(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError('');

        const formData = new FormData();
        formData.append('displayName', displayName);
        formData.append('bio', bio);
        formData.append('location', location);
        formData.append('readingGoal', readingGoal);
        formData.append('aboutMe', aboutMe);
        formData.append('favoriteQuote', favoriteQuote);
        formData.append('favoriteThings', favoriteThings);
        formData.append('instagramUrl', instagramUrl);
        formData.append('tiktokUrl', tiktokUrl);

        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        apiFetch('/api/profile', { method: 'PATCH', body: formData })
            .then((data) => {
                setLoaded(data);
                fillForm(data);
                setAvatarFile(null);
                if (onSaved) onSaved();
                navigate('/profile');
            })
            .catch((error) => setSaveError(error.message))
            .finally(() => setIsSaving(false));
    };

    const avatarSrc = getAvatarSrc(avatarUrl);

    return (
        <main className="page edit-page">
            <div className="edit-breadcrumb">
                <Link to="/profile">{t('edit.myProfile')}</Link>
                <span>›</span>
                <span>{t('edit.title')}</span>
            </div>

            <div className="edit-head">
                <h1 className="display edit-title">{t('edit.title')}</h1>
                <Link to="/profile" className="ghost-button">{t('edit.back')}</Link>
            </div>

            {loadError ? (
                <Notice message={loadError} onRetry={loadProfile} />
            ) : (

                <form className="edit-layout" onSubmit={handleSubmit}>
                    <div className="edit-side">
                        <div className="card edit-avatar-card">
                            <div className="edit-avatar">
                                <img src={avatarSrc} alt="" />
                            </div>

                            <label className="edit-avatar-label">
                                {t('edit.changePicture')}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setAvatarFile(e.target.files[0])}
                                />
                            </label>

                            <p className="edit-avatar-hint">{t('edit.avatarHint')}</p>
                            {avatarFile && <p className="edit-avatar-chosen">{avatarFile.name}</p>}
                        </div>

                        <div className="edit-reminder">
                            <div className="edit-reminder-title">{t('edit.reminderTitle')}</div>
                            <p>{t('edit.reminderText')}</p>
                        </div>
                    </div>

                    <div className="edit-main">
                        <Section
                            title={t('edit.identityTitle')}
                            subtitle={t('edit.identitySub')}
                        >
                            <div className="edit-row">
                                <div className="edit-field">
                                    <label className="edit-label">{t('edit.displayName')}</label>
                                    <input
                                        className="edit-input"
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        maxLength={40}
                                    />
                                </div>

                                <div className="edit-field">
                                    <label className="edit-label">{t('edit.username')}</label>
                                    <input className="edit-input" type="text" value={`@${username}`} disabled />
                                    <p className="edit-hint">{t('edit.usernameHint')}</p>
                                </div>
                            </div>

                            <div className="edit-field">
                                <label className="edit-label">{t('edit.bio')}</label>
                                <textarea
                                    className="edit-textarea"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    maxLength={BIO_MAX}
                                    placeholder={t('edit.bioPlaceholder')}
                                />
                                <div className="edit-counter">{bio.length} / {BIO_MAX}</div>
                            </div>

                            <div className="edit-field">
                                <label className="edit-label">{t('edit.location')}</label>
                                <input
                                    className="edit-input"
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    maxLength={60}
                                    placeholder={t('edit.locationPlaceholder')}
                                />
                            </div>

                            <div className="edit-field">
                                <label className="edit-label">{t('edit.goal')}</label>
                                <input className="edit-input" type="number" min="1" max="365" value={readingGoal} onChange={(e) => setReadingGoal(e.target.value)} placeholder="20" />
                            </div>
                        </Section>

                        <Section
                            title={t('edit.storyTitle')}
                            subtitle={t('edit.storySub')}
                        >
                            <div className="edit-field">
                                <label className="edit-label">{t('edit.aboutMe')}</label>
                                <textarea
                                    className="edit-textarea edit-textarea-tall"
                                    value={aboutMe}
                                    onChange={(e) => setAboutMe(e.target.value)}
                                    maxLength={600}
                                    placeholder={t('edit.aboutPlaceholder')}
                                />
                            </div>

                            <div className="edit-field">
                                <label className="edit-label">{t('edit.quote')}</label>
                                <textarea
                                    className="edit-textarea"
                                    value={favoriteQuote}
                                    onChange={(e) => setFavoriteQuote(e.target.value)}
                                    maxLength={200}
                                    placeholder={t('edit.quotePlaceholder')}
                                />
                            </div>

                            <div className="edit-field">
                                <label className="edit-label">{t('edit.things')}</label>
                                <textarea
                                    className="edit-textarea"
                                    value={favoriteThings}
                                    onChange={(e) => setFavoriteThings(e.target.value)}
                                    maxLength={300}
                                    placeholder={t('edit.thingsPlaceholder')}
                                />
                            </div>
                        </Section>

                        <Section
                            title={t('edit.elsewhereTitle')}
                            subtitle={t('edit.elsewhereSub')}
                        >
                            <div className="edit-row">
                                <div className="edit-field">
                                    <label className="edit-label">Instagram</label>
                                    <input
                                        className="edit-input"
                                        type="text"
                                        value={instagramUrl}
                                        onChange={(e) => setInstagramUrl(e.target.value)}
                                        placeholder="https://instagram.com/your-user"
                                    />
                                </div>

                                <div className="edit-field">
                                    <label className="edit-label">TikTok</label>
                                    <input
                                        className="edit-input"
                                        type="text"
                                        value={tiktokUrl}
                                        onChange={(e) => setTiktokUrl(e.target.value)}
                                        placeholder="https://tiktok.com/@your-user"
                                    />
                                </div>
                            </div>
                        </Section>

                        {saveError && <Notice message={saveError} />}

                        <div className="edit-actions">
                            <button type="button" className="edit-discard" onClick={handleDiscard}>
                                {t('edit.discard')}
                            </button>
                            <button type="submit" className="edit-save" disabled={isSaving || !loaded}>
                                {isSaving ? t('edit.saving') : t('edit.saveChanges')}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </main>
    );
}

export default EditProfile