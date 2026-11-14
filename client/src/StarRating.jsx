import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const STARS = [1, 2, 3, 4, 5];
const STAR_PATH = 'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z';

function StarShape({ size }) {
    return (
        <svg width={size} height={size} viewBox="-8 -8 272 272" aria-hidden="true">
            <path d={STAR_PATH} strokeWidth="16" strokeLinejoin="round" />
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