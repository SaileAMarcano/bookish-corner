import { useState, useEffect, useRef, useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';
import AchievementMark from './AchievementMark';

const NOTE_TIME = 4400;
const NOTE_LEAVE = 500;
const MANY = 3;

const STAR_PATH = 'M0-7c.5 4 2.5 6.5 7 7-4.5.5-6.5 3-7 7-.5-4-2.5-6.5-7-7 4.5-.5 6.5-3 7-7Z';
const BETA_WINDOW = 'M20 266V100a80 80 0 0 1 160 0v166Z';
const TONES = ['gold', 'rose', 'gold', 'lavender'];

const BETA_TWINKLES = [
    [4, 6], [12, 18], [3, 32], [11, 46], [2, 60], [10, 74], [5, 88],
    [95, 8], [87, 20], [97, 34], [89, 48], [97, 62], [88, 76], [95, 90],
    [24, 2], [76, 2], [50, 0], [36, 5], [64, 5], [20, 94], [80, 94],
];

const SKY_DOTS = Array.from({ length: 40 }, (_, index) => [24 + ((index * 41) % 152), 30 + ((index * 67) % 150), index % 5 ? 0.6 : 1]);

const SHOOTING_STARS = [[178, 40, 1.4], [150, 20, 3.6], [185, 90, 5.6]];

const CLOUD_LAYERS = [
    [110, 180, 200, 'back'],
    [90, 212, 230, 'middle'],
    [100, 240, 240, 'front'],
];

function cloudPuffs(cx, cy, width) {
    return Array.from({ length: 7 }, (_, index) => [cx - width / 2 + (index * width) / 6, cy - (index % 3) * 5, 14 + ((index * 7) % 10)]);
}

const NOTE_BURST = [
    [-70, -10], [-80, 40], [-60, 90], [-90, 140], [-55, 190],
    [70, -6], [82, 46], [62, 96], [90, 150], [56, 196],
    [-40, 230], [40, 236],
];

const NOTE_TWINKLES = [[-38, 30], [-50, 110], [-30, 180], [158, 40], [170, 120], [150, 190], [-22, 250], [160, 256]];

function Star({ className, style, size }) {
    return (
        <svg className={className} style={style} viewBox="-8 -8 16 16" width={size} height={size} aria-hidden="true">
            <path d={STAR_PATH} />
        </svg>
    );
}

function BetaWindow() {
    const id = useId().replaceAll(':', '');
    const [clouds, setClouds] = useState('loading');

    return (
        <svg className="beta-window" viewBox="0 0 200 276" aria-hidden="true">
            <defs>
                <clipPath id={`${id}-clip`}><path d={BETA_WINDOW} /></clipPath>
                <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#140F2E" />
                    <stop offset=".45" stopColor="#3A1E4E" />
                    <stop offset=".8" stopColor="#6E2A6A" />
                    <stop offset="1" stopColor="#8E3A7E" />
                </linearGradient>
                <radialGradient id={`${id}-halo`}>
                    <stop offset="0" stopColor="#F2A86A" stopOpacity=".75" />
                    <stop offset=".4" stopColor="#C8607A" stopOpacity=".35" />
                    <stop offset="1" stopColor="#C8607A" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`${id}-tail`} x1="0" y1="0" x2="1" y2="-1">
                    <stop offset="0" stopColor="#FFF1C9" />
                    <stop offset="1" stopColor="#FFF1C9" stopOpacity="0" />
                </linearGradient>
                <filter id={`${id}-soft`}><feGaussianBlur stdDeviation="3" /></filter>
            </defs>
            <g clipPath={`url(#${id}-clip)`}>
                <path d={BETA_WINDOW} fill={`url(#${id}-sky)`} />
                <g className="beta-sky-dots">
                    {SKY_DOTS.map(([x, y, r], index) => <circle key={index} cx={x} cy={y} r={r} style={{ '--twinkle-time': `${1.5 + (index % 4) * 0.6}s`, '--twinkle-delay': `${((index % 9) * 0.3).toFixed(1)}s` }} />)}
                </g>
                <g className="beta-moon">
                    <circle className="beta-moon-halo" cx="100" cy="110" r="46" fill={`url(#${id}-halo)`} />
                    <path className="beta-moon-shape" d="M104 94a17 17 0 1 0 10 30 14 14 0 1 1-10-30Z" />
                </g>
                {SHOOTING_STARS.map(([x, y, delay]) => (
                    <g key={delay} transform={`translate(${x} ${y})`}>
                        <g className="beta-shooting-star" style={{ '--shoot-delay': `${delay}s` }}>
                            <path d="M0 0L36-41" stroke={`url(#${id}-tail)`} />
                            <circle r="1.3" />
                        </g>
                    </g>
                ))}
                {clouds !== 'ready' && (
                    <g filter={`url(#${id}-soft)`}>
                        {CLOUD_LAYERS.map(([cx, cy, width, layer]) => (
                            <g key={layer} className={`beta-cloud beta-cloud-${layer}`}>
                                {cloudPuffs(cx, cy, width).map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} />)}
                                <rect x={cx - width / 2 - 14} y={cy} width={width + 28} height="140" />
                            </g>
                        ))}
                    </g>
                )}
                {clouds !== 'missing' && <image className={`beta-clouds ${clouds === 'ready' ? 'ready' : ''}`} href="/celebrations/beta-clouds.webp" x="-180" y="20" width="560" height="274" preserveAspectRatio="xMidYMax meet" onLoad={() => setClouds('ready')} onError={() => setClouds('missing')} />}
            </g>
            <path className="beta-window-frame" d={BETA_WINDOW} />
            <path className="beta-window-cross" d="M100 20V266M20 150H180" />
            <rect className="beta-window-sill" x="8" y="265" width="184" height="9" rx="2" />
        </svg>
    );
}

function MilestoneCelebration({ currentUser, books }) {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [showBeta, setShowBeta] = useState(false);
    const [notes, setNotes] = useState([]);
    const [leaving, setLeaving] = useState(false);

    const celebrated = useRef(new Set());

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/users/${encodeURIComponent(currentUser.username)}/milestones`)
            .then((milestones) => {
                if (ignore) return;

                const fresh = milestones
                    .filter((milestone) => milestone.achieved && !milestone.seen)
                    .map((milestone) => milestone.key)
                    .filter((key) => !celebrated.current.has(key));

                if (fresh.length === 0) return;
                fresh.forEach((key) => celebrated.current.add(key));

                if (fresh.includes('beta-tester')) {
                    setShowBeta(true);
                }

                const others = fresh.filter((key) => key !== 'beta-tester');
                if (others.length >= MANY) {
                    setNotes((current) => [...current, { key: others[0], count: others.length }]);
                } else if (others.length > 0) {
                    setNotes((current) => [...current, ...others.map((key) => ({ key }))]);
                }

                apiFetch('/api/milestones/seen', { method: 'POST', body: { keys: fresh } }).catch(() => { });
            })
            .catch(() => { });

        return () => {
            ignore = true;
        };
    }, [currentUser.username, location.pathname, books]);


    useEffect(() => {
        if (!showBeta) return;

        const handleKey = (event) => {
            if (event.key === 'Escape') setShowBeta(false);
        };
        document.addEventListener('keydown', handleKey);

        return () => document.removeEventListener('keydown', handleKey);
    }, [showBeta]);

    const note = showBeta ? null : notes[0];

    useEffect(() => {
        if (!note) return;

        const leave = setTimeout(() => setLeaving(true), NOTE_TIME);
        const next = setTimeout(() => {
            setLeaving(false);
            setNotes((current) => current.slice(1));
        }, NOTE_TIME + NOTE_LEAVE);

        return () => {
            clearTimeout(leave);
            clearTimeout(next);
        };
    }, [note]);

    const close = () => setShowBeta(false);

    const seeAchievements = () => {
        close();
        navigate('/achievements');
    };

    return (
        <>
            {showBeta && (
                <div className="celebration-overlay" onClick={close}>
                    <div
                        className="beta-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="beta-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="beta-twinkles" aria-hidden="true">
                            {BETA_TWINKLES.map(([left, top], index) => (
                                <Star
                                    key={`${left}-${top}`}
                                    className={`beta-twinkle star-tone-${TONES[index % TONES.length]}`}
                                    size={6 + (index % 4) * 3}
                                    style={{ left: `${left}%`, top: `${top}%`, '--appear-delay': `${(0.2 + index * 0.04).toFixed(2)}s`, '--twinkle-time': `${1.4 + (index % 5) * 0.45}s`, '--twinkle-delay': `${((index % 7) * 0.22).toFixed(2)}s` }}
                                />
                            ))}
                        </div>

                        <BetaWindow />

                        <h2 id="beta-title" className="display beta-title">{t('celebration.unlocked')}</h2>
                        <p className="beta-text">
                            <strong>{t('milestones.items.beta-tester.name')}</strong> · {t('celebration.betaText')}
                        </p>

                        <div className="beta-actions">
                            <button type="button" className="profile-edit" onClick={seeAchievements}>
                                {t('celebration.seeAll')}
                            </button>
                            <button type="button" className="beta-close" onClick={close} autoFocus>
                                {t('celebration.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {note && (
                <div key={note.key} className={`milestone-note ${leaving ? 'leaving' : ''}`} role="status">
                    <Link to="/achievements" className="milestone-note-link">
                        <span className="milestone-note-ribbon">
                            <span className="milestone-note-kicker">{t('celebration.newAchievement')}</span>
                            <AchievementMark className="milestone-note-badge" milestoneKey={note.key} />
                            <strong className="milestone-note-title">
                                {note.count
                                    ? t('celebration.manyTitle', { count: note.count })
                                    : t(`milestones.items.${note.key}.name`)}
                            </strong>
                            <span className="milestone-note-text">
                                {note.count ? t('celebration.manyText') : t(`milestones.items.${note.key}.rule`)}
                            </span>
                        </span>
                        <span className="milestone-note-charm" aria-hidden="true">
                            <span className="milestone-note-thread" />
                            <Star className="milestone-note-star" size={36} />
                        </span>
                    </Link>

                    <span className="milestone-note-stars" aria-hidden="true">
                        {NOTE_BURST.map(([x, y], index) => (
                            <Star
                                key={`burst-${x}-${y}`}
                                className={`milestone-note-burst star-tone-${TONES[index % TONES.length]}`}
                                size={8 + (index % 3) * 4}
                                style={{ top: `${70 + (index % 4) * 20}px`, '--burst-x': `${x}px`, '--burst-y': `${y - 80}px`, '--burst-delay': `${(0.45 + (index % 6) * 0.07).toFixed(2)}s` }}
                            />
                        ))}
                        {NOTE_TWINKLES.map(([x, y], index) => (
                            <Star
                                key={`twinkle-${x}-${y}`}
                                className={`milestone-note-twinkle star-tone-${TONES[index % TONES.length]}`}
                                size={7 + (index % 3) * 3}
                                style={{ left: `${x}px`, top: `${y}px`, '--appear-delay': `${(1.2 + index * 0.08).toFixed(2)}s`, '--twinkle-time': `${1.3 + (index % 4) * 0.4}s`, '--twinkle-delay': `${((index % 5) * 0.2).toFixed(1)}s` }}
                            />
                        ))}
                    </span>
                </div>
            )}
        </>
    );
}

export default MilestoneCelebration;
