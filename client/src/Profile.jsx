import { useState, useEffect } from "react";

function Profile() {
    const [bio, setBio] = useState('');
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
                setBio(data.bio || '');
                setInstagramUrl(data.instagramUrl || '');
                setTiktokUrl(data.tiktokUrl || '');
                setAvatarUrl(data.avatarUrl);
            });
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('bio', bio);
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
                        <label className="profile-label">Bio</label>
                        <textarea
                            className="profile-textarea"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell other readers about yourself..."
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
            </div>
        </div>
    );
}

export default Profile;