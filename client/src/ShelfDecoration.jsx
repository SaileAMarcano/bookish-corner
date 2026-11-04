const SHAPES = {
    candle: <>
        <path d="M24 5c-8 9 3 10-1 17 10-5 10-12 1-17Z" fill="var(--star-fill)" />
        <path d="M24 21v6M16 27h16v27H16zM12 54h24v4H12z" fill="var(--amber-soft)" />
    </>,
    quill: <>
        <path d="M21 28C18 15 24 5 39 1c1.5 6-.5 11-4 14.5l-4.5.5 2.5 2.5c-3.5 4.5-7.5 7.5-12 9.5z" fill="var(--logo-lavender)" />
        <path d="M19 35 35 6" />
        <path d="M18.5 29.5h11v5h-11z" fill="var(--logo-gold)" />
        <path d="M18.5 34.5c-5 1.5-8.5 4.8-8.5 10V54a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3v-9.5c0-5.2-3.5-8.5-8.5-10Z" fill="var(--logo-sage)" />
        <path d="M14.5 44c0-2.3 1.3-4 3.5-5" stroke="var(--logo-paper)" />
    </>,
    stars: <>
        <path d="M17 12h14v8l5 7v30H12V27l5-7z" fill="var(--sage-soft)" />
        <path d="M16 8h16v5H16z" fill="var(--clay-soft)" />
        <path d="M22 27c.5 4 2.5 6.5 6.5 7-4 .5-6 3-6.5 7-.5-4-2.5-6.5-6.5-7 4-.5 6-3 6.5-7zM29.5 43c.3 2 1.3 3.2 3.3 3.5-2 .3-3 1.5-3.3 3.5-.3-2-1.3-3.2-3.3-3.5 2-.3 3-1.5 3.3-3.5z" fill="var(--logo-gold)" />
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