import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { LEGAL_PAGES, LEGAL_TEXTS, LEGAL_UPDATED } from './legalTexts';

function withBold(text) {
    return text.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 ? <strong key={index}>{part}</strong> : part));
}

function toBlocks(body) {
    const blocks = [];

    for (const line of body.split('\n')) {
        const item = line.match(/^(- |\d+\. )(.*)$/);
        const last = blocks[blocks.length - 1];

        if (item) {
            const type = item[1] === '- ' ? 'ul' : 'ol';
            if (last?.type === type) {
                last.items.push(item[2]);
            } else {
                blocks.push({ type, items: [item[2]] });
            }
        } else if (line.startsWith('## ')) {
            blocks.push({ type: 'h2', text: line.slice(3) });
        } else if (line.trim()) {
            blocks.push({ type: 'p', text: line });
        }
    }

    return blocks;
}

function LegalPage({ doc, signedIn }) {
    const { t, i18n } = useTranslation();
    const language = i18n.language === 'es' ? 'es' : 'en';
    const text = LEGAL_TEXTS[language][doc];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [doc]);

    return (
        <div className="public-page">
            <PublicHeader signedIn={signedIn} />

            <main className="legal-page">
                <nav className="legal-tabs" aria-label={t('legal.nav')}>
                    {Object.entries(LEGAL_PAGES).map(([path, page]) => (
                        <NavLink key={page} to={path} className="legal-tab">
                            {t(`legal.${page}`)}
                        </NavLink>
                    ))}
                </nav>

                <article className="card legal-card">
                    <h1 className="display legal-title">{text.title}</h1>
                    <p className="legal-updated">{t('legal.updated', { date: LEGAL_UPDATED[language] })}</p>

                    {toBlocks(text.body).map((block, index) => {
                        if (block.type === 'h2') return <h2 key={index} className="display legal-heading">{withBold(block.text)}</h2>;
                        if (block.type === 'p') return <p key={index}>{withBold(block.text)}</p>;
                        const List = block.type;
                        return (
                            <List key={index}>
                                {block.items.map((item) => <li key={item}>{withBold(item)}</li>)}
                            </List>
                        );
                    })}
                </article>
            </main>

            <PublicFooter />
        </div>
    );
}

export default LegalPage;
