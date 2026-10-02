import { useTranslation } from 'react-i18next';

function Notice({ message, onRetry }) {
    const { t } = useTranslation();

    return (
        <div className="notice" role="alert">
            <p className="notice-text">{message}</p>
            {onRetry && (
                <button type="button" className="notice-retry" onClick={onRetry}>
                    {t('common.tryAgain')}
                </button>
            )}
        </div>
    );
}
export default Notice;
