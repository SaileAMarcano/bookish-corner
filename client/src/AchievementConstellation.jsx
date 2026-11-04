import { useTranslation } from 'react-i18next';
import { achievementLevel, CONSTELLATION_POINTS } from './achievementUtils';

function AchievementConstellation({ milestones }) {
    const { t } = useTranslation();
    const earned = milestones.filter((milestone) => milestone.achieved).length;
    return (
        <section className="card constellation-card" aria-labelledby="constellation-title">
            <h2 id="constellation-title" className="display">{t('achievementArt.title')}</h2>
            <p>{t('achievementArt.lead')}</p>
            <svg className="achievement-constellation" viewBox="0 0 280 390" role="img" aria-label={t('achievementArt.summary', { count: earned, total: milestones.length })}>
                <path className="constellation-sky" d="M24 366V140a116 116 0 0 1 232 0v226Z" />
                <path className="constellation-frame" d="M24 366V140a116 116 0 0 1 232 0v226ZM32 358V140a108 108 0 0 1 216 0v218Z" />
                {milestones.map((milestone, index) => {
                    const point = CONSTELLATION_POINTS[index];
                    const previous = CONSTELLATION_POINTS[index - 1];
                    if (!point) return null;
                    const [x, y] = point;
                    return <g key={milestone.key} className={`constellation-point constellation-point-${achievementLevel(milestone)}`}>
                        <title>{t(`milestones.items.${milestone.key}.name`)} · {t(`achievementArt.levels.${achievementLevel(milestone)}`)}</title>
                        {previous && <path className={`constellation-line ${milestone.achieved && milestones[index - 1].achieved ? 'lit' : ''}`} d={`M${previous[0]} ${previous[1]}L${x} ${y}`} />}
                        <path className="constellation-star" d={`M${x} ${y - 7}c.5 4 2.5 6.5 7 7-4.5.5-6.5 3-7 7-.5-4-2.5-6.5-7-7 4.5-.5 6.5-3 7-7Z`} />
                    </g>;
                })}
                <g className="constellation-art">
                    <path className="constellation-feather" d="M177 297c-4-17 4-30 24-35 2 8-1 15-5 19l-6 1 3 3c-4 6-10 10-16 12Z" />
                    <path d="M176 306 199 268" />
                    <path className="constellation-cork" d="M170 298h14v6h-14Z" />
                    <path className="constellation-bottle" d="M170 304c-6 2-10 6-10 12v8a3 3 0 0 0 3 3h28a3 3 0 0 0 3-3v-8c0-6-4-10-10-12Z" />
                    <path className="constellation-book-top" d="M80 327h76v14H80a7 7 0 0 1 0-14Z" />
                    <path className="constellation-pages" d="M156 327h40v14h-40Z" />
                    <path className="constellation-book-bottom" d="M68 341h92v16H68a8 8 0 0 1 0-16Z" />
                    <path className="constellation-pages" d="M160 341h44v16h-44Z" />
                    <path className="constellation-band" d="M92 327v14M82 341v16" />
                </g>
            </svg>
            <p className="constellation-count">{t('milestones.count', { count: earned, total: milestones.length })}</p>
            <ul className="achievement-legend">
                {['dim', 'silver', 'gold'].map((level) => <li key={level}><i className={`legend-${level}`} />{t(`achievementArt.levels.${level}`)}</li>)}
            </ul>
            <p className="constellation-note">{t('achievementArt.levelHint')}</p>
        </section>
    );
}

export default AchievementConstellation;
