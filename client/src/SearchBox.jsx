import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

const NARROW = '(max-width: 640px)';

function subscribe(callback) {
    const query = window.matchMedia(NARROW);
    query.addEventListener('change', callback);
    return () => query.removeEventListener('change', callback);
}

function isNarrow() {
    return window.matchMedia(NARROW).matches;
}

function SearchBox({ q, onChange, onOpen, open, variant = 'topbar' }) {
    const { t } = useTranslation();
    const narrow = useSyncExternalStore(subscribe, isNarrow);
    const placeholder = variant === 'topbar' && narrow ? t('app.searchPlaceholder') : t('discoverySearch.placeholder');
    return (
        <div className={variant === 'explore' ? 'explore-search-box' : 'search-box'} data-search-trigger data-tour={variant === 'explore' ? undefined : 'search'}>
            <form className={variant === 'explore' ? 'explore-search-form' : 'topbar-search'} role="search" aria-label={variant === 'explore' ? t('nav.explore') : t('discoverySearch.title')} onSubmit={(event) => { event.preventDefault(); onOpen(); }}>
                <Icon name="search" size={18} />
                <input
                    type="search"
                    role="combobox"
                    maxLength={120}
                    placeholder={placeholder}
                    aria-label={t('discoverySearch.placeholder')}
                    value={q}
                    onChange={(event) => onChange(event.target.value)}
                    onFocus={onOpen}
                    aria-expanded={open}
                    aria-controls="discovery-search-panel"
                    autoComplete="off"
                />
                {q && <button type="button" className="search-clear" onClick={() => onChange('')} aria-label={t('app.clearSearch')}><Icon name="close" size={14} /></button>}
            </form>
        </div>
    );
}

export default SearchBox;
