import { useTranslation } from 'react-i18next';

function SupporterBadge({ size = 20 }) {
    const { t } = useTranslation();
    const label = t('supporter.badge');

    return (
        <img className="supporter-badge" src="/badges/supporter.webp" alt={label} title={label} width={size} height={size} />
    );
}

export default SupporterBadge;
