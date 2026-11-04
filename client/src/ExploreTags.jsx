import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import EmptyState from './EmptyState';
import Notice from './Notice';
import { apiFetch } from './api';

function ExploreTags({ followed, popular, initiallyOpen = false }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(initiallyOpen);
    const [term, setTerm] = useState('');
    const [result, setResult] = useState({ term: '', items: [], error: '' });
    const [retry, setRetry] = useState(0);
    const inputRef = useRef(null);
    const panelId = useId();
    const cleanTerm = term.trim();
    const loading = cleanTerm.length >= 2 && result.term !== cleanTerm;
    const shown = cleanTerm.length >= 2 ? (loading ? [] : result.items) : popular;

    useEffect(() => {
        if (!open || cleanTerm.length < 2) return;
        let ignore = false;
        const timer = setTimeout(() => {
            apiFetch(`/api/tags?q=${encodeURIComponent(cleanTerm)}`)
                .then((items) => { if (!ignore) setResult({ term: cleanTerm, items, error: '' }); })
                .catch((error) => { if (!ignore) setResult({ term: cleanTerm, items: [], error: error.message }); });
        }, 300);
        return () => { ignore = true; clearTimeout(timer); };
    }, [open, cleanTerm, retry]);

    useEffect(() => { if (open) inputRef.current?.focus({ preventScroll: true }); }, [open]);

    const toggle = () => setOpen((value) => !value);
    const button = <button type="button" className="explore-tags-button" onClick={toggle} aria-expanded={open} aria-controls={panelId}>{t(open ? 'exploreArt.hideTags' : 'exploreArt.exploreTags')}<Icon name="arrowRight" size={17} /></button>;

    return (
        <>
            {followed.length ? (
                <div className="explore-followed-block">
                    <h3 className="section-label explore-tags-heading">{t('tagged.followedTitle')}</h3>
                    <div className="explore-tags">{followed.map((tag) => <Link key={tag.slug} to={`/tagged/${tag.slug}`} className="explore-tag explore-tag-followed"><strong>#{tag.name}</strong><span>{t('tagged.postCount', { count: tag.postCount })}</span></Link>)}</div>
                    {button}
                </div>
            ) : (
                <div className="explore-tags-welcome">
                    <div className="explore-books-spot"><img src="/explore/books-empty.png" width="360" height="240" alt="" decoding="async" /></div>
                    <div className="explore-tags-welcome-copy"><h3 className="display">{t('exploreArt.noFollowed')}</h3><p>{t('exploreArt.tagLead')}</p>{button}</div>
                </div>
            )}
            {open && <div className="explore-tag-discovery" id={panelId}>
                <label className="discovery-search"><Icon name="tag" /><input ref={inputRef} type="search" maxLength={80} value={term} onChange={(event) => setTerm(event.target.value)} aria-label={t('exploreArt.searchTags')} placeholder={t('exploreArt.searchTags')} /></label>
                <h3 className="section-label explore-tags-heading">{t(cleanTerm.length >= 2 ? 'exploreArt.tagResults' : 'tagged.popularTitle')}</h3>
                {loading && <p role="status">{t('tagged.loading')}</p>}
                {!loading && result.term === cleanTerm && result.error && <Notice message={result.error} onRetry={() => setRetry((value) => value + 1)} />}
                {!loading && shown.length > 0 && <div className="explore-tags">{shown.map((tag) => <Link key={tag.slug} to={`/tagged/${tag.slug}`} className="explore-tag"><strong>#{tag.name}</strong></Link>)}</div>}
                {!loading && !shown.length && !(result.term === cleanTerm && result.error) && <EmptyState compact kind="writing" title={t('exploreArt.noTags')} description={t('exploreArt.createTagHint')}><Link to="/">{t('posts.publish')}</Link></EmptyState>}
            </div>}
        </>
    );
}

export default ExploreTags;
