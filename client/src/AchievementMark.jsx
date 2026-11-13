import { useTranslation } from 'react-i18next';

function AchievementMark({ milestoneKey, level = 'gold', className = '' }) {
    const { t } = useTranslation();
    return (
        <img className={`achievement-mark achievement-mark-${level} ${className}`}
            src={'/badges/' + milestoneKey + '.webp'}
            alt={`${t(`milestones.items.${milestoneKey}.name`)} · ${t(`achievementArt.levels.${level}`)}`} />
    );
}

export default AchievementMark;
