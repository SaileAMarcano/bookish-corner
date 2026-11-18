import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star } from './MilestoneCelebration';

const TONES = ['gold', 'rose', 'gold', 'lavender'];

const TWINKLES = [
    [4, 6], [12, 18], [3, 32], [11, 46], [2, 60], [10, 74], [5, 88],
    [95, 8], [87, 20], [97, 34], [89, 48], [97, 62], [88, 76], [95, 90],
    [24, 2], [76, 2], [50, 0], [36, 5], [64, 5], [20, 94], [80, 94],
];

const BURST = [
    [-120, -40], [-90, -110], [-30, -140], [40, -135], [100, -100], [130, -30],
    [120, 50], [70, 110], [-10, 130], [-80, 105], [-130, 40],
];

function SupporterCelebration({ onClose }) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const seeProfile = () => {
        onClose();
        navigate('/profile');
    };

    return (
        <div className="celebration-overlay" onClick={onClose}>
            <div
                className="beta-card supporter-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="supporter-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="beta-twinkles" aria-hidden="true">
                    {TWINKLES.map(([left, top], index) => (
                        <Star
                            key={`${left}-${top}`}
                            className={`beta-twinkle star-tone-${TONES[index % TONES.length]}`}
                            size={6 + (index % 4) * 3}
                            style={{ left: `${left}%`, top: `${top}%`, '--appear-delay': `${(0.2 + index * 0.04).toFixed(2)}s`, '--twinkle-time': `${1.4 + (index % 5) * 0.45}s`, '--twinkle-delay': `${((index % 7) * 0.22).toFixed(2)}s` }}
                        />
                    ))}
                </div>

                <div className="supporter-medal">
                    <span className="supporter-medal-glow" aria-hidden="true" />
                    {BURST.map(([x, y], index) => (
                        <Star
                            key={`${x}-${y}`}
                            className={`supporter-burst star-tone-${TONES[index % TONES.length]}`}
                            size={10 + (index % 3) * 5}
                            style={{ '--burst-x': `${x}px`, '--burst-y': `${y}px`, '--burst-delay': `${(0.55 + (index % 5) * 0.06).toFixed(2)}s` }}
                        />
                    ))}
                    <img className="supporter-medal-image" src="/badges/supporter-large.webp" alt={t('supporter.badge')} width="180" height="180" />
                </div>

                <p className="supporter-kicker">{t('supporter.celebrate.kicker')}</p>
                <h2 id="supporter-title" className="display beta-title supporter-title">{t('supporter.celebrate.title')}</h2>
                <p className="beta-text">{t('supporter.celebrate.text')}</p>

                <div className="beta-actions">
                    <button type="button" className="profile-edit" onClick={seeProfile}>
                        {t('supporter.celebrate.profile')}
                    </button>
                    <button type="button" className="beta-close" onClick={onClose} autoFocus>
                        {t('supporter.celebrate.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SupporterCelebration;
