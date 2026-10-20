import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';

function MilestoneCelebration({ currentUser, books }) {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [showBeta, setShowBeta] = useState(false);

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/users/${encodeURIComponent(currentUser.username)}/milestones`)
            .then((milestones) => {
                if (ignore) return;

                const betaIsNew = milestones.some(
                    (milestone) => milestone.key === 'beta-tester' && milestone.achieved && !milestone.seen
                );

                if (betaIsNew) {
                    setShowBeta(true);
                    // Saved as seen right away, so it is not shown again on the next page.
                    apiFetch('/api/milestones/seen', { method: 'POST', body: { keys: ['beta-tester'] } }).catch(() => { });
                }
            })
            .catch(() => { });

        return () => {
            ignore = true;
        };
    }, [currentUser.username, location.pathname, books]);

    // Escape closes it, like any other window.
    useEffect(() => {
        if (!showBeta) return;

        const handleKey = (event) => {
            if (event.key === 'Escape') setShowBeta(false);
        };
        document.addEventListener('keydown', handleKey);

        return () => document.removeEventListener('keydown', handleKey);
    }, [showBeta]);

    if (!showBeta) return null;

    const close = () => setShowBeta(false);

    const seeAchievements = () => {
        close();
        navigate('/achievements');
    };

    return (
        <div className="celebration-overlay" onClick={close}>
            <div
                className="beta-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="beta-title"
                onClick={(event) => event.stopPropagation()}
            >
                <img className="beta-frame" src="/celebrations/beta-frame.svg" alt="" />

                <div className="beta-sheet">
                    <div className="beta-seal">
                        <img className="beta-badge" src="/badges/beta-tester.webp" alt="" />
                        <img className="beta-stars" src="/celebrations/beta-stars.svg" alt="" />
                    </div>

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
        </div>
    );
}

export default MilestoneCelebration