import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import SupportForm from './SupportForm';

const HELP_SECTIONS = [
    { id: 'start', icon: 'sparkle', items: ['what', 'firstBook', 'tour'] },
    { id: 'library', icon: 'library', items: ['statuses', 'progress', 'challenge', 'shelf'] },
    { id: 'community', icon: 'posts', items: ['post', 'spoilers', 'follow', 'tabs', 'notifications'] },
    { id: 'lists', icon: 'lists', items: ['create', 'order', 'save'] },
    { id: 'account', icon: 'settings', items: ['appearance', 'accessibility', 'delete', 'report'] },
    { id: 'beta', icon: 'mail', items: ['invite', 'problem'] },
];

function normalize(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function HelpPage() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

    const term = normalize(search.trim());
    const searching = term.length > 1;

    const sections = HELP_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => {
            if (!searching) return true;
            const question = t(`help.items.${section.id}.${item}.q`);
            const answer = t(`help.items.${section.id}.${item}.a`);
            return normalize(question + ' ' + answer).includes(term);
        }),
    })).filter((section) => section.items.length > 0);

    return (
        <main className="page help-page">
            <div className="edit-head">
                <h1 className="display edit-title">{t('help.title')}</h1>
                <p className="help-subtitle">{t('help.subtitle')}</p>
            </div>

            <div className="help-search">
                <Icon name="search" size={16} />
                <input
                    type="search"
                    className="edit-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('help.search')}
                    aria-label={t('help.search')}
                />
            </div>

            {sections.length === 0 ? (
                <p className="card help-empty" role="status">{t('help.noResults')}</p>
            ) : (
                <div className="help-sections">
                    {sections.map((section) => (
                        <section key={section.id} className="card help-section" aria-labelledby={`help-${section.id}`}>
                            <div className="settings-section-head">
                                <span className="settings-section-icon">
                                    <Icon name={section.icon} size={17} />
                                </span>
                                <h2 id={`help-${section.id}`} className="display settings-section-title">
                                    {t(`help.sections.${section.id}`)}
                                </h2>
                            </div>

                            <div className="help-questions">
                                {section.items.map((item) => (
                                    <details key={item} className="help-question" open={searching || undefined}>
                                        <summary>
                                            {t(`help.items.${section.id}.${item}.q`)}
                                            <Icon name="chevronDown" size={16} />
                                        </summary>
                                        <p>{t(`help.items.${section.id}.${item}.a`)}</p>
                                    </details>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <p className="help-legal">
                {t('help.legal')}{' '}
                <Link to="/guidelines">{t('legal.guidelines')}</Link>
                {' · '}
                <Link to="/privacy">{t('legal.privacy')}</Link>
                {' · '}
                <Link to="/terms">{t('legal.terms')}</Link>
            </p>

        <SupportForm />
        </main>
    );
}

export default HelpPage;