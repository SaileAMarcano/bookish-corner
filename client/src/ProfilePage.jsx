import { useState, useEffect } from 'react'

function ProfilePage({ version, onEditProfile }) {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        fetch('http://localhost:3000/api/profile', {
            credentials: 'include',
        })
            .then((res) => res.json())
            .then((data) => setProfile(data));
    }, [version]);

    if (!profile) {
        return (
            <main className="page">
                <div className="section-label">Loading profile...</div>
            </main>
        );
    }

    const avatarSrc = profile.avatarUrl
        ? `http://localhost:3000${profile.avatarUrl}`
        : '/default-avatar.png';

    return (
        <main className="page profile-view">
            <div className="profile-banner">
                <img className="profile-banner-image" src="/default-banner.png" alt="" />
            </div>

            <div className="card profile-view-card">
                <div className="profile-view-avatar">
                    <img src={avatarSrc} alt="" />
                </div>

                <div className="profile-info">
                    <h1 className="display profile-name">{profile.displayName}</h1>
                    <div className="profile-username">@{profile.username}</div>

                    {profile.bio && <p className="profile-bio">{profile.bio}</p>}

                    <div className="profile-stats">
                        <div className="profile-stat">
                            <div className="profile-stat-number">{profile.booksRead}</div>
                            <div className="profile-stat-label">Books read</div>
                        </div>
                        <div className="profile-stat">
                            <div className="profile-stat-number">{profile.reviewsCount}</div>
                            <div className="profile-stat-label">Reviews</div>
                        </div>
                        <div className="profile-stat">
                            <div className="profile-stat-number">{profile.currentlyReading}</div>
                            <div className="profile-stat-label">Currently reading</div>
                        </div>
                    </div>
                </div>

                <button className="profile-edit" onClick={onEditProfile}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                    Edit profile
                </button>
            </div>
        </main>
    );
}

export default ProfilePage