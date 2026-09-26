const FOOTER_WORDS = ['Good books', 'Kind people', 'Brighter days'];

function PublicFooter() {
    return (
        <footer className="public-footer">
            <p className="display public-footer-title">A cozy space for readers</p>

            <p className="public-footer-words">
                {FOOTER_WORDS.map((word) => (
                    <span key={word}>{word}</span>
                ))}
            </p>

            <p className="public-footer-credit">Built by Suukibo</p>
        </footer>
    );
}

export default PublicFooter;