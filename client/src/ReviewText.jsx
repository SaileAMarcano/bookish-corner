import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

function ReviewText({ text, isSpoiler = false, className = '' }) {
    const { t } = useTranslation();
    const contentId = useId();
    const [revealedText, setRevealedText] = useState(null);
    const revealed = revealedText === text;

    if (!isSpoiler) {
        return <p className={className}>{text}</p>;
    }

    return (
        <div className="review-spoiler">
            <div className="review-spoiler-warning">
                <Icon name="eyeOff" size={17} />
                <span>{t('reviewSpoiler.warning')}</span>
                <button
                    type="button"
                    aria-expanded={revealed}
                    aria-controls={contentId}
                    onClick={(event) => {
                        event.stopPropagation();
                        setRevealedText(revealed ? null : text);
                    }}
                >
                    {t(revealed ? 'reviewSpoiler.hide' : 'reviewSpoiler.show')}
                </button>
            </div>
            <p id={contentId} className={className} hidden={!revealed}>
                {revealed ? text : null}
            </p>
        </div>
    );
}

export default ReviewText;
