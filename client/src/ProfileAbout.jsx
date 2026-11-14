import { useTranslation } from "react-i18next";
import Icon from './Icon';

const THING_ICONS = ['coffee', 'file', 'favorites', 'sparkle'];

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
                                <Icon name={THING_ICONS[index % THING_ICONS.length]} size={15} />
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