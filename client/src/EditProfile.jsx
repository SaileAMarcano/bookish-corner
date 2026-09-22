import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
    const navigate = useNavigate();

    const [loaded, setLoaded] = useState(null);
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [aboutMe, setAboutMe] = useState('');
    const [favoriteQuote, setFavoriteQuote] = useState('');
    const [favoriteThings, setFavoriteThings] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [tiktokUrl, setTiktokUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const fillForm = (data) => {
        setUsername(data.username || '');
        setDisplayName(data.displayName || '');
        setBio(data.bio || '');
        setLocation(data.location || '');
        setAboutMe(data.aboutMe || '');
        setFavoriteQuote(data.favoriteQuote || '');
        setFavoriteThings(data.favoriteThings || '');
        setInstagramUrl(data.instagramUrl || '');
        setTiktokUrl(data.tiktokUrl || '');
        setAvatarUrl(data.avatarUrl);
    };

    useEffect(() => {
        fetch('http://localhost:3000/api/profile', { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                setLoaded(data);
                fillForm(data);
            });
    }, []);

    const handleDiscard = () => {
        if (loaded) fillForm(loaded);
        setAvatarFile(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);

        const formData = new FormData();
        formData.append('displayName', displayName);
        formData.append('bio', bio);
        formData.append('location', location);
        formData.append('aboutMe', aboutMe);
        formData.append('favoriteQuote', favoriteQuote);
        formData.append('favoriteThings', favoriteThings);
        formData.append('instagramUrl', instagramUrl);
        formData.append('tiktokUrl', tiktokUrl);

        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        fetch('http://localhost:3000/api/profile', {
            method: 'PATCH',
            credentials: 'include',
            body: formData,
        })
            .then((res) => {
                if (!res.ok) throw new Error('Could not save profile');
                return res.json();
            })
            .then((data) => {
                setLoaded(data);
                fillForm(data);
                setAvatarFile(null);
                setIsSaving(false);
                if (onSaved) onSaved();
                navigate('/profile');
            })
            .catch((error) => {
                console.error(error);
                setIsSaving(false);
            });
    };

    const avatarSrc = avatarUrl
        ? `http://localhost:3000${avatarUrl}`
        : '/default-avatar.png';

    return (
        <main className="page edit-page">
            <div className="edit-breadcrumb">
                <Link to="/profile">My profile</Link>
                <span>›</span>
                <span>Edit profile</span>
            </div>

            <div className="edit-head">
                <h1 className="display edit-title">Edit profile</h1>
                <Link to="/profile" className="ghost-button">← Back to profile</Link>
            </div>

            <form className="edit-layout" onSubmit={handleSubmit}>
                <div className="edit-side">
                    <div className="card edit-avatar-card">
                        <div className="edit-avatar">
                            <img src={avatarSrc} alt="" />
                        </div>

                        <label className="edit-avatar-label">
                            Change profile picture
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setAvatarFile(e.target.files[0])}
                            />
                        </label>

                        <p className="edit-avatar-hint">JPG, PNG or GIF · 5 MB max.</p>
                        {avatarFile && <p className="edit-avatar-chosen">{avatarFile.name}</p>}
                    </div>

                    <div className="edit-reminder">
                        <div className="edit-reminder-title">Little reminder</div>
                        <p>Your profile is your cozy corner. Make it feel like you.</p>
                    </div>
                </div>

                <div className="edit-main">
                    <Section
                        title="Your bookish identity"
                        subtitle="Update the details your readers will see."
                    >
                        <div className="edit-row">
                            <div className="edit-field">
                                <label className="edit-label">Display name</label>
                                <input
                                    className="edit-input"
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    maxLength={40}
                                />
                            </div>

                            <div className="edit-field">
                                <label className="edit-label">Username</label>
                                <input className="edit-input" type="text" value={`@${username}`} disabled />
                                <p className="edit-hint">Your username can't be changed.</p>
                            </div>
                        </div>

                        <div className="edit-field">
                            <label className="edit-label">Bio</label>
                            <textarea
                                className="edit-textarea"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                maxLength={BIO_MAX}
                                placeholder="A line or two for the top of your profile."
                            />
                            <div className="edit-counter">{bio.length} / {BIO_MAX}</div>
                        </div>

                        <div className="edit-field">
                            <label className="edit-label">Location</label>
                            <input
                                className="edit-input"
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                maxLength={60}
                                placeholder="Bogotá, Colombia"
                            />
                        </div>
                    </Section>

                    <Section
                        title="Your story"
                        subtitle="The longer version, for whoever's curious."
                    >
                        <div className="edit-field">
                            <label className="edit-label">About me</label>
                            <textarea
                                className="edit-textarea edit-textarea-tall"
                                value={aboutMe}
                                onChange={(e) => setAboutMe(e.target.value)}
                                maxLength={600}
                                placeholder="What you read, what you love, what you're looking for..."
                            />
                        </div>

                        <div className="edit-field">
                            <label className="edit-label">Favorite quote from a book</label>
                            <textarea
                                className="edit-textarea"
                                value={favoriteQuote}
                                onChange={(e) => setFavoriteQuote(e.target.value)}
                                maxLength={200}
                                placeholder="Good books make good days."
                            />
                        </div>

                        <div className="edit-field">
                            <label className="edit-label">A few favorite things</label>
                            <textarea
                                className="edit-textarea"
                                value={favoriteThings}
                                onChange={(e) => setFavoriteThings(e.target.value)}
                                maxLength={300}
                                placeholder={`One per line:
Coffee & rainy afternoons
Annotated paperbacks`}
                            />
                        </div>
                    </Section>

                    <Section
                        title="Find me elsewhere"
                        subtitle="Where readers can keep up with you."
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

                    <div className="edit-actions">
                        <button type="button" className="edit-discard" onClick={handleDiscard}>
                            Discard changes
                        </button>
                        <button type="submit" className="edit-save" disabled={isSaving}>
                            {isSaving ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </div>
            </form>
        </main>
    );
}

export default EditProfile