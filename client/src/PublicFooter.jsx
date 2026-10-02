import { useTranslation } from 'react-i18next';

const FOOTER_WORDS = ['footer.word1', 'footer.word2', 'footer.word3'];

function PublicFooter() {
    const { t } = useTranslation();

    return (
        <footer className="public-footer">
            <p className="display public-footer-title">{t('footer.title')}</p>

            <p className="public-footer-words">
                {FOOTER_WORDS.map((word) => (
                    <span key={word}>{t(word)}</span>
                ))}
            </p>

            <p className="public-footer-credit">{t('footer.credit')}</p>
        </footer>
    );
}

export default PublicFooter;