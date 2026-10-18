import { useTranslation } from "react-i18next";

const THING_ICONS = [
    <path d="M5 8h11v5.5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16 9.5h1.5a2.5 2.5 0 0 1 0 5H16" />,
    <path d="M6 4h8l4 4v12H6z M14 4v4h4" />,
    <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />,
    <path d="M12 3l2 6.6L20 12l-6 2.4L12 21l-2-6.6L4 12l6-2.4z" />,
];

function ProfileAbout({ profile, isMe }) {
    const { t } = useTranslation();
    const name = profile.displayName;

    const things = (profile.favoriteThings || '')
        .split('\n')
        .map((thing) => thing.trim())
        .filter((thing) => thing !== '');

    return (
        <div className="profile-about-layout">
            <div className="card profile-about">
                <h2 className="display profile-about-title">{t('profile.aboutTitle', { name })}</h2>
                {profile.bio && <p className="profile-about-lead">{profile.bio}</p>}

                {profile.aboutMe ? (
                    <p className="profile-about-text">{profile.aboutMe}</p>
                ) : (
                    <p className="profile-about-text profile-about-empty">
                        {isMe ? t('profile.aboutEmpty') : t('profileAbout.emptyOther', { name })}
                    </p>
                )}

                {profile.favoriteQuote && (
                    <div className="profile-quote">
                        <div className="profile-quote-label">{t('profile.favoriteQuote')}</div>
                        <p className="profile-quote-text">{profile.favoriteQuote}</p>
                    </div>
                )}
            </div>

            <div className="card profile-things">
                <h3 className="display profile-side-title">{t('profile.favoriteThings')}</h3>

                {things.length === 0 ? (
                    <p className="profile-about-empty">{t('profile.nothingAdded')}</p>
                ) : (
                    <ul className="profile-things-list">
                        {things.map((thing, index) => (
                            <li key={index}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="1.6"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    {THING_ICONS[index % THING_ICONS.length]}
                                </svg>
                                {thing}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default ProfileAbout