import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';


function PublicBand({ quote, text }) {
    const { t } = useTranslation();

    return (
        <section className="public-band">
            <p className="display public-band-quote">{quote}</p>
            <p className="public-band-text">{text}</p>
            <Link to="/signup" className="public-signup public-cta">{t('public.startReading')}
                <Icon name="arrowRight" size={18} />
            </Link>
        </section>
    );
}

export default PublicBand;