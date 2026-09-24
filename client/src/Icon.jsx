const ICONS = {
    home: (
        <>
            <path d="M4 11l8-7 8 7" />
            <path d="M6 9.5V20h12V9.5" />
            <path d="M10 20v-5h4v5" />
        </>
    ),
    reading: <path d="M7 3.5h10v17l-5-3.5-5 3.5z" />,
    library: (
        <>
            <path d="M4 4h5.5a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4z" />
            <path d="M20 4h-5.5a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20z" />
        </>
    ),
    reviews: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z" />,
    favorites: <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />,
    about: (
        <>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
        </>
    ),
    posts: (
        <>
            <rect x="5" y="3" width="14" height="18" rx="2.5" />
            <path d="M9 8h6M9 12h6M9 16h3" />
        </>
    ),
    following: (
        <>
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3 20c0-3.2 2.7-5.4 6-5.4s6 2.2 6 5.4" />
            <path d="M16 5.3a3.2 3.2 0 0 1 0 5.8" />
            <path d="M17.5 14.9c2.6.5 4.5 2.4 4.5 5.1" />
        </>
    ),
    search: (
        <>
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
        </>
    ),
};

function Icon({ name, size = 17 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            {ICONS[name]}
        </svg>
    );
}

export default Icon