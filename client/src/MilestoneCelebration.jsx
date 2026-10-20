import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';

const NOTE_TIME = 4000;
const NOTE_LEAVE = 400;
const MANY = 3;


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
            )}

            {note && (
                <div key={note.key} className={`milestone-note ${leaving ? 'leaving' : ''}`} role="status">
                    <Link to="/achievements" className="milestone-note-link">
                        <img className="milestone-note-badge" src={`/badges/${note.key}.webp`} alt="" />

                        <span className="milestone-note-info">
                            <strong className="milestone-note-title">
                                {note.count
                                    ? t('celebration.manyTitle', { count: note.count })
                                    : t(`milestones.items.${note.key}.name`)}
                            </strong>
                            <span className="milestone-note-text">
                                {note.count ? t('celebration.manyText') : t(`milestones.items.${note.key}.rule`)}
                            </span>
                        </span>
                    </Link>

                    <img className="milestone-note-vine" src="/celebrations/toast-vine.svg" alt="" />
                </div>
            )}
        </>
    );
}

export default MilestoneCelebration