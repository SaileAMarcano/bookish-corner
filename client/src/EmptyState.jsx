import Icon from './Icon';

function EmptyState({ title, description, kind = 'books', compact = false, children }) {
    const icon = { books: 'library', favorites: 'favorites', writing: 'feather', soon: 'moon', readers: 'following', lists: 'lists', bookmark: 'bookmark' }[kind] || 'library';

    return (
        <div className={`brand-empty ${compact ? 'brand-empty-compact' : ''}`}>
            <svg className="brand-empty-window" viewBox="0 0 100 116" aria-hidden="true">
                <path d="M13 108V47a37 37 0 0 1 74 0v61Z" fill="var(--surface)" stroke="var(--rose-ink)" strokeWidth="1.5" />
                <path d="M19 103V47a31 31 0 0 1 62 0v56Z" fill="var(--rose-soft)" opacity=".55" />
                <path d="M68 23c.5 4 2.5 6.5 6.5 7-4 .5-6 3-6.5 7-.5-4-2.5-6.5-6.5-7 4-.5 6-3 6.5-7Z" fill="var(--logo-gold)" stroke="var(--logo-ink)" strokeWidth="1" strokeLinejoin="round" />
                <path d="M33 30c.3 2 1.3 3.2 3.3 3.5-2 .3-3 1.5-3.3 3.5-.3-2-1.3-3.2-3.3-3.5 2-.3 3-1.5 3.3-3.5Z" fill="var(--logo-gold)" />
                <path d="M28 94h44M31 98h38" stroke="var(--rose-ink)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="brand-empty-icon" aria-hidden="true"><Icon name={icon} size={25} /></span>
            <div className="brand-empty-copy">
                <p className="display brand-empty-title">{title}</p>
                {description && <p>{description}</p>}
                {children}
            </div>
        </div>
    );
}

export default EmptyState;
