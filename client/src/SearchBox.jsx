import { useTranslation } from 'react-i18next';
import Icon from './Icon';

function SearchBox({ q, onChange, onOpen, open, variant = 'topbar' }) {
    const { t } = useTranslation();
    return (
        <div className={variant === 'explore' ? 'explore-search-box' : 'search-box'} data-search-trigger>
            <form className={variant === 'explore' ? 'explore-search-form' : 'topbar-search'} role="search" onSubmit={(event) => { event.preventDefault(); onOpen(); }}>
                <Icon name="search" size={18} />
                <input
                    type="search"
                    maxLength={120}
                    placeholder={t('discoverySearch.placeholder')}
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
