import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { ProfileBadge } from './MilestoneSeal';
import { getAvatarSrc, parseDbDate } from './utils';

function ProfileHeader({ profile, onShowFollows, children }) {
    const { t, i18n } = useTranslation();
    const [copied, setCopied] = useState(false);

    const joined = parseDbDate(profile.createdAt).toLocaleDateString(i18n.language, {
        month: 'long',
        year: 'numeric',
    });

    const stats = [
        { number: profile.booksRead, label: t('profile.statBooksRead') },
        { number: profile.reviewsCount, label: t('profile.statReviews') },
        { number: profile.followerCount, label: t('userPage.followers'), opensFollows: true },
        { number: profile.followingCount, label: t('userPage.followingCount'), opensFollows: true },
    ];

    // Copies the public link of this profile and says so on the button for 2 seconds.
    const handleShare = () => {
        const link = `${window.location.origin}/u/${profile.username}`;

        navigator.clipboard
            .writeText(link)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => { });
    };

    return (
        <section className="profile-header">
            <img className="profile-header-banner banner-light" src="/profile-banner-light.jpg" alt="" />
            <img className="profile-header-banner banner-dark" src="/profile-banner-dark.jpg" alt="" />

            <div className="profile-header-body">
                <div className="profile-header-avatar">
                    <img src={getAvatarSrc(profile.avatarUrl)} alt="" />
                </div>

                <div className="profile-header-info">
                    <div className="profile-name-row">
                        <h1 className="display profile-name">{profile.displayName}</h1>
                        {profile.badge && <ProfileBadge milestoneKey={profile.badge} />}
                    </div>
                    <div className="profile-username">@{profile.username}</div>

                    {profile.bio && <p className="profile-bio">{profile.bio}</p>}

                    <div className="profile-meta">
                        {profile.location && (
                            <span className="profile-meta-item">
                                <Icon name="mapPin" size={15} />
                                {profile.location}
                            </span>
                        )}

                        <span className="profile-meta-item">
                            <Icon name="calendar" size={15} />
                            {t('profileHeader.joined', { date: joined })}
                        </span>

                        {profile.instagramUrl && (
                            <a className="profile-meta-item profile-meta-link" href={profile.instagramUrl} target="_blank" rel="noopener noreferrer">
                                Instagram
                            </a>
                        )}

                        {profile.tiktokUrl && (
                            <a className="profile-meta-item profile-meta-link" href={profile.tiktokUrl} target="_blank" rel="noopener noreferrer">
                                TikTok
                            </a>
                        )}
                    </div>
                </div>

                <div className="profile-header-side">
                    <div className="profile-header-actions">
                        {children}

                        <button type="button" className="profile-share" onClick={handleShare}>
                            <Icon name="share" size={14} />
                            <span aria-live="polite">{copied ? t('profileHeader.copied') : t('profileHeader.share')}</span>
                        </button>
                    </div>

                    <div className="profile-header-stats">
                        {stats.map((stat) =>
                            stat.opensFollows ? (
                                <button key={stat.label} type="button" className="profile-header-stat profile-header-stat-button" onClick={onShowFollows}>
                                    <span className="profile-stat-number">{stat.number}</span>
                                    <span className="profile-stat-label">{stat.label}</span>
                                </button>
                            ) : (
                                <div key={stat.label} className="profile-header-stat">
                                    <div className="profile-stat-number">{stat.number}</div>
                                    <div className="profile-stat-label">{stat.label}</div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default ProfileHeader