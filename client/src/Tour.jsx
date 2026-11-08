import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import Icon from './Icon';

const GAP = 14;
const PADDING = 8;
const CARD_WIDTH =340;
const CARD_HEIGHT = 230;
const EDGE = 16;
const MOBILE_WIDTH = 600;

function findTarget(name) {
    const elements = document.querySelectorAll(`[data-tour="${name}"]`);
    return [...elements].find((element) => element.getClientRects().length > 0) || null;
}

function cardPosition(rect) {
    if (!rect || window.innerWidth < MOBILE_WIDTH) return null;

    const width = Math.min(CARD_WIDTH, window.innerWidth - EDGE * 2);
    const centered = rect.left + rect.width / 2 - width / 2;
    const left = Math.min(Math.max(EDGE, centered), window.innerWidth - width - EDGE);

    if (rect.bottom + GAP + CARD_HEIGHT < window.innerHeight) {
        return { top: rect.bottom + GAP, left, width };
    }
    if (rect.top - GAP - CARD_HEIGHT > 0) {
        return { bottom: window.innerHeight - rect.top + GAP, left, width };
    }
    if (rect.right + GAP + width < window.innerWidth) {
        const top = Math.min(Math.max(EDGE, rect.top), window.innerHeight - CARD_HEIGHT - EDGE);
        return { top, left: rect.right + GAP, width };
    }
    return null;
}

function Tour({ steps, showWelcome, onClose }) {
    const { t } = useTranslation();
    const [started, setStarted] = useState(!showWelcome);
    const [index, setIndex] = useState(0);
    const [rect, setRect] = useState(null);
    const cardRef = useRef(null);

    const step = steps[index];
    const isLast = index === steps.length - 1;

    const measure = useCallback(() => {
        const target = findTarget(step.target);
        setRect(target ? target.getBoundingClientRect() : null);
    }, [step.target]);

    useEffect(() => {
        if (!started) {
            cardRef.current?.focus();
            return undefined;
        }

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        findTarget(step.target)?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });

        const frame = requestAnimationFrame(measure);
        const timer = setInterval(measure, 400);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        cardRef.current?.focus();

        return () => {
            cancelAnimationFrame(frame);
            clearInterval(timer);
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [measure, step.target, started]);

    const goNext = () => {
        if (isLast) {
            onClose('finished');
        } else {
            setIndex(index + 1);
        }
    };

    const goBack = () => {
        if (index > 0) setIndex(index - 1);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose('skipped');
        } else if (e.key === 'ArrowRight' && started) {
            goNext();
        } else if (e.key === 'ArrowLeft' && started) {
            goBack();
        } else if (e.key === 'Tab') {
            const buttons = [...cardRef.current.querySelectorAll('button')];
            const first = buttons[0];
            const last = buttons[buttons.length - 1];

            if (e.shiftKey && (document.activeElement === first || document.activeElement === cardRef.current)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };

    if (!started) {
        return createPortal(
            <div className="tour">
                <div className="tour-backdrop" />
                <div
                    ref={cardRef}
                    className="tour-card centered tour-welcome"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tour-title"
                    aria-describedby="tour-text"
                    tabIndex={-1}
                    onKeyDown={handleKeyDown}
                >
                    <span className="tour-count">{t('tour.welcome.kicker')}</span>
                    <h2 id="tour-title" className="display tour-title">{t('tour.welcome.title')}</h2>
                    <p id="tour-text" className="tour-text">{t('tour.welcome.text')}</p>
                    <div className="tour-actions tour-welcome-actions">
                        <button type="button" className="ghost-button tour-back" onClick={() => onClose('skipped')}>
                            {t('tour.welcome.later')}
                        </button>
                        <button type="button" className="edit-save tour-next" onClick={() => setStarted(true)}>
                            {t('tour.welcome.start')}
                            <Icon name="arrowRight" size={15} />
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    const position = cardPosition(rect);
    let placement = '';
    if (!position) {
        placement = rect ? (rect.top + rect.height / 2 > window.innerHeight / 2 ? 'dock-top' : 'dock-bottom') : 'centered';
    }

    return createPortal(
        <div className="tour">
            {rect ? (
                <div
                    className="tour-spotlight"
                    style={{
                        top: rect.top - PADDING,
                        left: rect.left - PADDING,
                        width: rect.width + PADDING * 2,
                        height: rect.height + PADDING * 2,
                    }}
                />
            ) : (
                <div className="tour-backdrop" />
            )}

            <div
                ref={cardRef}
                className={`tour-card ${placement}`}
                style={position || undefined}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-title"
                aria-describedby="tour-text"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                <div className="tour-head">
                    <span className="tour-count">{t('tour.count', { current: index + 1, total: steps.length })}</span>
                    <button type="button" className="tour-skip" onClick={() => onClose('skipped')}>
                        {t('tour.skip')}
                    </button>
                </div>

                <h2 id="tour-title" className="display tour-title">{step.title}</h2>
                <p id="tour-text" className="tour-text">{step.text}</p>

                <div className="tour-foot">
                    <div className="tour-dots" aria-hidden="true">
                        {steps.map((item, i) => (
                            <span key={item.target} className={`tour-dot ${i === index ? 'active' : ''}`} />
                        ))}
                    </div>

                    <div className="tour-actions">
                        {index > 0 && (
                            <button type="button" className="ghost-button tour-back" onClick={goBack}>
                                <Icon name="arrowLeft" size={14} />
                                {t('tour.back')}
                            </button>
                        )}
                        <button type="button" className="edit-save tour-next" onClick={goNext}>
                            {isLast ? t('tour.finish') : t('tour.next')}
                            {!isLast && <Icon name="arrowRight" size={15} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default Tour;