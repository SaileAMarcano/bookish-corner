import { useTranslation } from 'react-i18next';
import Icon from './Icon';

export const PROFILE_TABS = ['posts', 'reviews', 'lists', 'library', 'favorites', 'about'];

function ProfileTabs({ activeTab, onChange }) {
    const { t } = useTranslation();

    return (
        <div className="card profile-tabs">
            {PROFILE_TABS.map((tab) => (
                <button key={tab} type="button" className={`profile-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => onChange(tab)}>
                    <Icon name={tab} />
                    {t(`profileTabs.${tab}`)}
                </button>
            ))}
        </div>
    );
}

export default ProfileTabs