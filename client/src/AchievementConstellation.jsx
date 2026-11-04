import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { achievementLevel, CONSTELLATION_POINTS } from './achievementUtils';

const WINDOW_PATH = 'M24 366V140a116 116 0 0 1 232 0v226Z';
const STAR_PATH = 'M0-7c.5 4 2.5 6.5 7 7-4.5.5-6.5 3-7 7-.5-4-2.5-6.5-7-7 4.5-.5 6.5-3 7-7Z';
const START = 0.3;
const STEP = 0.45;
const SKY_DOTS = [
    [101, 50], [177, 48], [188, 64], [61, 78], [53, 104], [229, 90],
    [43, 133], [231, 146], [38, 166], [71, 168], [222, 176], [232, 203],
    [55, 224], [87, 236], [42, 248], [72, 259], [207, 237], [231, 286],
    [198, 278], [220, 315], [65, 303], [95, 322],
];

function AchievementConstellation({ milestones }) {
    const { t } = useTranslation();
    const id = useId().replaceAll(':', '');
    const earned = milestones.filter((milestone) => milestone.achieved).length;
    const count = t('milestones.count', { count: earned, total: milestones.length });
    const progress = milestones.length ? (earned * 100) / milestones.length : 0;
    const nextIndex = milestones.findIndex((milestone) => !milestone.achieved);

    let order = 0;
    const delays = milestones.map((milestone) => (milestone.achieved ? START + STEP * order++ : 0));

    return (
        <section className="card constellation-card" aria-labelledby={`${id}-title`}>
            <h2 id={`${id}-title`} className="display">{t('achievementArt.title')}</h2>
            <p>{t('achievementArt.lead')}</p>
            <svg className="achievement-constellation" viewBox="0 0 280 390" role="img" aria-label={t('achievementArt.summary', { count: earned, total: milestones.length })}>
                <defs>
                    <clipPath id={`${id}-window`}><path d={WINDOW_PATH} /></clipPath>
                    <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
                        <stop className="constellation-sky-top" offset="0" />
                        <stop className="constellation-sky-middle" offset=".65" />
                        <stop className="constellation-sky-bottom" offset="1" />
                    </linearGradient>
                    <radialGradient id={`${id}-haze`}>
                        <stop className="constellation-haze-center" offset="0" />
                        <stop className="constellation-haze-edge" offset="1" />
                    </radialGradient>
                    <radialGradient id={`${id}-glow`}>
                        <stop className="constellation-glow-center" offset="0" />
                        <stop className="constellation-glow-middle" offset=".5" />
                        <stop className="constellation-glow-edge" offset="1" />
                    </radialGradient>
                    <radialGradient id={`${id}-gold`} cx=".5" cy=".5" r=".6">
                        <stop className="constellation-gold-core" offset="0" />
                        <stop className="constellation-gold-light" offset=".55" />
                        <stop className="constellation-gold-edge" offset="1" />
                    </radialGradient>
                </defs>
                <g clipPath={`url(#${id}-window)`}>
                    <path fill={`url(#${id}-sky)`} d={WINDOW_PATH} />
                    <ellipse fill={`url(#${id}-haze)`} cx="104" cy="114" rx="140" ry="158" />
                    <ellipse fill={`url(#${id}-haze)`} cx="184" cy="304" rx="132" ry="88" />
                    <g className="constellation-dust">
                        {SKY_DOTS.map(([x, y], index) => <circle key={`${x}-${y}`} cx={x} cy={y} r=".75" style={{ '--twinkle-time': `${2 + (index % 3)}s`, '--twinkle-delay': `${(index * 0.2).toFixed(1)}s` }} />)}
                    </g>
                    <path className="constellation-hill constellation-hill-back" d="M24 338c28-10 39-11 69-2s59 8 86 3 49-11 77-4v31H24Z" />
                    <path className="constellation-hill constellation-hill-middle" d="M24 347c31 8 54 12 83 6s55-14 81-13 42 10 68 9v17H24Z" />
                    <path className="constellation-hill constellation-hill-front" d="M24 351c34-8 51 1 83 8s53 2 82-4 44-8 67-5v16H24Z" />
                    <g aria-hidden="true">
                        {milestones.map((milestone, index) => {
                            const point = CONSTELLATION_POINTS[index];
                            const previous = CONSTELLATION_POINTS[index - 1];
                            if (!point || !previous) return null;
                            const lit = milestone.achieved && milestones[index - 1].achieved;
                            const length = Math.hypot(point[0] - previous[0], point[1] - previous[1]).toFixed(1);
                            return <path key={milestone.key} className={`constellation-line ${lit ? 'lit' : ''}`} style={lit ? { '--line-length': length, '--line-delay': `${(delays[index] - STEP + 0.05).toFixed(2)}s` } : undefined} d={`M${previous[0]} ${previous[1]}L${point[0]} ${point[1]}`} />;
                        })}
                    </g>
                    {milestones.map((milestone, index) => {
                        const point = CONSTELLATION_POINTS[index];
                        if (!point) return null;
                        const level = achievementLevel(milestone);
                        const next = index === nextIndex;
                        return <g key={milestone.key} className={`constellation-point constellation-tone-${[5, 6, 8, 10].includes(index) ? 'rose' : 'sage'} constellation-point-${level} ${next ? 'constellation-point-next' : ''}`} transform={`translate(${point[0]} ${point[1]})`} style={milestone.achieved ? { '--star-delay': `${delays[index].toFixed(2)}s`, '--rays-delay': `${(delays[index] + 1 + index * 0.7).toFixed(2)}s` } : undefined}>
                            <title>{t(`milestones.items.${milestone.key}.name`)} · {t(`achievementArt.levels.${level}`)}</title>
                            {milestone.achieved && <circle className="constellation-star-glow" fill={`url(#${id}-glow)`} r="16" />}
                            {milestone.achieved && <path className="constellation-star-rays" d="M0-15V15M-15 0H15" />}
                            {next && <circle className="constellation-next-ring" r="6" />}
                            <path className="constellation-star" d={STAR_PATH} fill={milestone.achieved ? `url(#${id}-gold)` : undefined} />
                        </g>;
                    })}
                </g>
                <path className="constellation-frame" d={WINDOW_PATH} />
                <path className="constellation-frame-inner" d="M26 364V140a114 114 0 0 1 228 0v224Z" />
            </svg>
            <p className="constellation-count">{count}</p>
            <div className="constellation-progress" role="progressbar" aria-label={t('achievementArt.title')} aria-valuemin={0} aria-valuemax={milestones.length || 1} aria-valuenow={earned} aria-valuetext={count}>
                <span style={{ width: `${progress}%` }} />
            </div>
            <ul className="achievement-legend">
                {['dim', 'silver', 'gold'].map((level) => <li key={level}><i className={`legend-${level}`} />{t(`achievementArt.levels.${level}`)}</li>)}
            </ul>
            <p className="constellation-note">{t('achievementArt.levelHint')}</p>
        </section>
    );
}

export default AchievementConstellation;
