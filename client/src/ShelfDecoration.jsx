const SHAPES = {
    candle: <>
        <path d="M24 5c-8 9 3 10-1 17 10-5 10-12 1-17Z" fill="var(--star-fill)" />
        <path d="M24 21v6M16 27h16v27H16zM12 54h24v4H12z" fill="var(--amber-soft)" />
    </>,
    quill: <>
        <path d="M37 5C18 9 11 23 14 39 26 34 38 20 37 5Z" fill="var(--lavender)" />
        <path d="m14 47 20-35M23 27l8-1M19 35l8-1" />
        <path d="M10 48h17l4 10H6z" fill="var(--sage)" />
    </>,
    stars: <>
        <path d="M17 12h14v8l5 7v30H12V27l5-7z" fill="var(--sage-soft)" />
        <path d="M16 8h16v5H16z" fill="var(--clay-soft)" />
        <path d="m22 28 2 6 6 2-6 2-2 6-2-6-6-2 6-2zM29 44l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="var(--star-fill)" />
    </>,
    flowers: <>
        <path d="M22 48V24m0 13L12 27m10 15 12-14" />
        <path d="M10 47h28l-5 12H15z" fill="var(--clay-soft)" />
        <path d="M22 12c-8-7-12 4-5 7-8 5 1 13 5 6 5 7 13-1 5-6 7-4 3-14-5-7Z" fill="var(--rose)" />
        <circle cx="22" cy="19" r="3" fill="var(--star-fill)" />
    </>,
    tea: <>
        <path d="M10 31h25v18a8 8 0 0 1-8 8h-9a8 8 0 0 1-8-8z" fill="var(--rose-soft)" />
        <path d="M35 35h3a7 7 0 0 1 0 14h-3M7 59h34M17 24c-6-6 6-8 0-15m10 15c-6-6 6-8 0-15" />
    </>,
};

function ShelfDecoration({ name }) {
    return (
        <svg className="year-shelf-object" viewBox="0 0 48 64" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            {SHAPES[name]}
        </svg>
    );
}

export default ShelfDecoration;