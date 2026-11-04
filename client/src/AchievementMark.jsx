import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { ACHIEVEMENT_ICONS } from './achievementUtils';

function AchievementMark({ milestoneKey, level = 'gold', className = '' }) {
    const { t } = useTranslation();
    return (
        <svg className={`achievement-mark achievement-mark-${level} ${className}`} viewBox="0 0 72 88" role="img" aria-label={`${t(`milestones.items.${milestoneKey}.name`)} · ${t(`achievementArt.levels.${level}`)}`}>
            <path className="achievement-mark-fill" d="M5 83V35a31 31 0 0 1 62 0v48Z" />
            <path className="achievement-mark-frame" d="M5 83V35a31 31 0 0 1 62 0v48ZM10 78V35a26 26 0 0 1 52 0v43Z" />
            <path className="achievement-mark-star" d="M36 15c.4 3.6 2.4 5.6 6 6-3.6.4-5.6 2.4-6 6-.4-3.6-2.4-5.6-6-6 3.6-.4 5.6-2.4 6-6Z" />
            <g transform="translate(22 40)"><Icon name={ACHIEVEMENT_ICONS[milestoneKey] || 'sparkle'} size={28} /></g>
            <path className="achievement-mark-frame" d="M23 73h26" />
        </svg>
    );
}

export default AchievementMark;
