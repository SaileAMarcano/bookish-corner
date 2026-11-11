import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const STARS = [1, 2, 3, 4, 5];
const STAR_PATH = 'M13.9 5.3L15 6.6Q15.9 7.7 17.2 8.2L18.7 8.8Q21.5 9.9 19.9 12.4L19 13.9Q18.3 15 18.2 16.4L18.1 18.1Q17.9 21.1 15 20.4L13.4 19.9Q12 19.6 10.6 19.9L9 20.4Q6.1 21.1 5.9 18.1L5.8 16.4Q5.7 15 5 13.9L4.1 12.4Q2.5 9.9 5.3 8.8L6.8 8.2Q8.1 7.7 9 6.6L10.1 5.3Q12 3 13.9 5.3Z';

function StarShape({ size }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d={STAR_PATH} strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}

function Sparkle() {
    return (
        <svg className="star-sparkle" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M5 0Q5.6 4.4 10 5Q5.6 5.6 5 10Q4.4 5.6 0 5Q4.4 4.4 5 0Z" />
        </svg>
    );
}

function StarRating({ value, onChange, size = 26 }) {
    const { t } = useTranslation();
    const [hovered, setHovered] = useState(0);
    const [burst, setBurst] = useState({ key: 0, value: 0 });
    const shown = hovered || value;

    const choose = (newValue) => {
        const next = newValue === value ? 0 : newValue;
        if (next > 0) {
            setBurst((current) => ({ key: current.key + 1, value: next }));
        }
        onChange(next);
    };

    const stars = (
        <div
            className="star-rating"
            onMouseLeave={() => setHovered(0)}
            role={onChange ? undefined : 'img'}
            aria-label={onChange ? undefined : t('stars.outOf', { value })}
        >
            {STARS.map((star) => {
                let fill = 0;
                if (shown >= star) fill = 100;
                else if (shown >= star - 0.5) fill = 50;

                const pops = burst.key > 0 && burst.value === value && star <= Math.ceil(value);
                const isTapped = pops && star === Math.ceil(value);

                return (
                    <span key={star} className="star">
                        <span
                            key={pops ? burst.key : 'still'}
                            className={`star-art ${pops ? 'star-pop' : ''}`}
                            style={pops ? { '--pop-delay': `${(star - 1) * 90}ms` } : undefined}
                        >
                            {isTapped && <span className="star-ring" aria-hidden="true" />}
                            {pops && fill === 100 && <span className="star-halo" aria-hidden="true" />}
                            <span className="star-empty">
                                <StarShape size={size} />
                            </span>
                            <span className="star-fill" style={{ width: `${fill}%` }}>
                                <StarShape size={size} />
                            </span>
                            {pops && fill === 100 && <Sparkle />}
                        </span>

                        {onChange && (
                            <>
                                <button
                                    type="button"
                                    className="star-half star-half-left"
                                    aria-label={t('stars.rate', { value: star - 0.5 })}
                                    onClick={() => choose(star - 0.5)}
                                    onMouseEnter={() => setHovered(star - 0.5)}
                                />
                                <button
                                    type="button"
                                    className="star-half star-half-right"
                                    aria-label={t('stars.rate', { value: star })}
                                    onClick={() => choose(star)}
                                    onMouseEnter={() => setHovered(star)}
                                />
                            </>
                        )}
                    </span>
                );
            })}
        </div>
    );

    if (!onChange) return stars;

    const label = value > 0 ? t(`stars.labels.${Math.ceil(value)}`) : '';

    return (
        <div className="star-rating-field">
            {stars}
            <span
                key={burst.value === value ? burst.key : 'still'}
                className={`star-label ${burst.key > 0 && burst.value === value ? 'star-label-pop' : ''}`}
                style={{ '--pop-delay': `${Math.ceil(value) * 90 + 120}ms` }}
            >
                {label}
            </span>
        </div>
    );
}

export default StarRating;