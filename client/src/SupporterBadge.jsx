import { useTranslation } from 'react-i18next';
import Icon from './Icon';

function SupporterBadge({ size = 14 }) {
    const { t } = useTranslation();
    const label = t('supporter.badge');

    return (
        <span className="supporter-badge" title={label} role="img" aria-label={label}>
            <Icon name="favorites" size={size} />
        </span>
    );
}

export default SupporterBadge;
