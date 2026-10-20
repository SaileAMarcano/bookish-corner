import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { ProfileBadge } from './MilestoneSeal';
import { getAvatarSrc, parseDbDate } from './utils';

function ProfileHeader({ profile, onShowFollows, children }) {
    const { t, i18n } = useTranslation();

    const joined = parseDbDate(profile.createdAt).toLocaleDateString(i18n.language, {
        month: 'long',
        year: 'numeric',
    });

    const stats = [
        { number: profile.booksRead, label: t('profile.statBooksRead') },
        { number: profile.reviewsCount, label: t('profile.statReviews') },
        { number: profile.currentlyReading, label: t('profile.statReading') },
        { number: profile.followerCount, label: t('userPage.followers'), opensFollows: true },
        { number: profile.followingCount, label: t('userPage.followingCount'), opensFollows: true },
    ];

    return (
        <section className="card profile-header">
            <img className="profile-header-banner banner-light" src="/profile-banner-light.jpg" alt="" />
            <img className="profile-header-banner banner-dark" src="/profile-banner-dark.jpg" alt="" />

            <div className="profile-header-body">
                <div className="profile-header-top">
                    <div className="profile-header-avatar">
                        <img src={getAvatarSrc(profile.avatarUrl)} alt="" />
                    </div>

                    <div className="profile-header-names">
                        <div className='profile-name-row'>
                            <h1 className="display profile-name">{profile.displayName}</h1>
                            {profile.badge && <ProfileBadge milestoneKey={profile.badge} />}
                        </div>
                        <div className="profile-username">@{profile.username}</div>
                    </div>

                    <div className="profile-header-actions">{children}</div>
                </div>

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
        </section>
    );
}

export default ProfileHeader