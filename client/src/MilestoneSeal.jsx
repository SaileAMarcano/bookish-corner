import AchievementMark from './AchievementMark';

function MilestoneSeal({ milestoneKey, locked, level, size = 84 }) {
    return (
        <span className="seal window-seal" style={{ width: size, height: size }}>
            <AchievementMark milestoneKey={milestoneKey} level={level || (locked ? 'dim' : 'gold')} />
        </span>
    );
}

export function ProfileBadge({ milestoneKey }) {
    return <AchievementMark className="profile-badge" milestoneKey={milestoneKey} />;
}

export default MilestoneSeal;
