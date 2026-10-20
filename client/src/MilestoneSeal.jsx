import { useTranslation } from 'react-i18next';
import Icon from './Icon';

function MilestoneSeal({ milestoneKey, locked, size = 84 }) {
    const { t } = useTranslation();

    return (
        <span className={`seal ${locked ? 'seal-locked' : ''}`} style={{ width: size, height: size }}>
            <img
                className="seal-image"
                src={`/badges/${milestoneKey}.webp`}
                alt={t(`milestones.items.${milestoneKey}.name`)}
            />

            {locked && (
                <span className="seal-lock">
                    <Icon name="lock" size={13} />
                </span>
            )}
        </span>
    );
}

export function ProfileBadge({ milestoneKey }) {
    const { t } = useTranslation();
    const name = t(`milestones.items.${milestoneKey}.name`);

    return <img className="profile-badge" src={`/badges/${milestoneKey}.webp`} alt={name} title={name} />;
}

export default MilestoneSeal