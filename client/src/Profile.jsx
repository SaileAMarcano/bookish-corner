import { useState, useEffect } from "react";

function Profile({ onSaved }) {
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [aboutMe, setAboutMe] = useState('');
    const [favoriteQuote, setFavoriteQuote] = useState('');
    const [favoriteThings, setFavoriteThings] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [tiktokUrl, setTiktokUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);

    useEffect(() => {
        fetch('http://localhost:3000/api/profile', {
            credentials: 'include',
        })
            .then((res) => res.json())
            .then((data) => {
                setDisplayName(data.displayName || '');
                setBio(data.bio || '');
                setAboutMe(data.aboutMe || '');
                setFavoriteQuote(data.favoriteQuote || '');
                setFavoriteThings(data.favoriteThings || '');
                setInstagramUrl(data.instagramUrl || '');
                setTiktokUrl(data.tiktokUrl || '');
                setAvatarUrl(data.avatarUrl);
            });
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('displayName', displayName);
        formData.append('bio', bio);
        formData.append('favoriteQuote', favoriteQuote);
        formData.append('favoriteThings', favoriteThings);
        formData.append('aboutMe', aboutMe);
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

            .then((res) => res.json())
            .then((data) => {
                setAvatarUrl(data.avatarUrl);
                onSaved();
            });
    };

    return (
        <div className="profile-page">
            <h2 className="display profile-title">Edit profile</h2>

            <div className="card profile-card">
                <div className="profile-avatar-row">
                    {avatarUrl ? (
                        <img
                            className="profile-avatar"
                            src={`http://localhost:3000${avatarUrl}`}
                            alt="Profile photo"
                        />
                    ) : (
                        <div className="profile-avatar-empty"></div>
                    )}

                    <div className="profile-field">
                        <label className="profile-label">Profile photo</label>
                        <input
                            className="profile-file"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setAvatarFile(e.target.files[0])}
                        />
                    </div>
                </div>

                <form className="profile-form" onSubmit={handleSubmit}>
                    <div className="profile-field">
                        <label className="profile-label">Display Name</label>
                        <input
                            className="profile-input"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="How you want to be shown"
                            maxLength={40}
                        />
                    </div>

                    <div className="profile-field">
                        <label className="profile-label">Bio</label>
                        <textarea
                            className="profile-textarea"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell other readers about yourself..."
                        />
                    </div>

                    <div className="profile-field">
                        <label className="profile-label">About Me</label>
                        <textarea
                            className="profile-textarea"
                            value={aboutMe}
                            onChange={(e) => setAboutMe(e.target.value)}
                            placeholder="The longer version. What you read, what you love, what you're looking for..."
                            maxLength={600}
                        />
                    </div>

                    <div className="profile-field">
                        <label className="profile-label">Favorite quote from a book</label>
                        <textarea
                            className="profile-textarea"
                            value={favoriteQuote}
                            onChange={(e) => setFavoriteQuote(e.target.value)}
                            placeholder="Good books make good days."
                            maxLength={200}
                        />
                    </div>

                    <div className="profile-field">
                        <label className="profile-label">A few favorite things</label>
                        <textarea
                            className="profile-textarea"
                            value={favoriteThings}
                            onChange={(e) => setFavoriteThings(e.target.value)}
                            placeholder={`One per line:
Coffee & rainy afternoons
Annotated paperbacks
Slow Sundays at bookstores`}
                            maxLength={300}
                        />
                    </div>

                    <div className="profile-field">
                        <label className="profile-label">Instagram</label>
                        <input
                            className="profile-input"
                            type="text"
                            value={instagramUrl}
                            onChange={(e) => setInstagramUrl(e.target.value)}
                            placeholder="https://instagram.com/suukibo_"
                        />
                    </div>

                    <div className="profile-field">
                        <label className="profile-label">TikTok</label>
                        <input
                            className="profile-input"
                            type="text"
                            value={tiktokUrl}
                            onChange={(e) => setTiktokUrl(e.target.value)}
                            placeholder="https://tiktok.com/@suukibo_"
                        />
                    </div>

                    <button className="profile-save" type="submit">Save changes</button>
                </form>
            </div >
        </div >
    );
}

export default Profile;