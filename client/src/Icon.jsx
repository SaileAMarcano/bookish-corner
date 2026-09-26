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
    sparkle: <path d="M12 3l2 6.6L20 12l-6 2.4L12 21l-2-6.6L4 12l6-2.4z" />,

    mail: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M3.5 7l8.5 6 8.5-6" />
        </>
    ),
    lock: (
        <>
            <rect x="5" y="11" width="14" height="10" rx="2.5" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
    ),
    eye: (
        <>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
        </>
    ),
    eyeOff: (
        <>
            <path d="M3 3l18 18" />
            <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.9 3.9" />
            <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
    ),

    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,

    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,

    arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
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