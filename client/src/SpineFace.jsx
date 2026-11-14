const INK = '#2D241F';
const GOLD = '#E4B766';
const CREAM = '#FAF4E8';

const MOTIFS = {
    star: <path d="M0-9Q1.4-1.4 9 0Q1.4 1.4 0 9Q-1.4 1.4-9 0Q-1.4-1.4 0-9Z" fill={GOLD} />,
    heart: <path d="M0 7C-8 1-9-6-4-8C-2-9 0-7 0-5C0-7 2-9 4-8C9-6 8 1 0 7Z" fill={CREAM} />,
    flower: (
        <>
            <circle cx="0" cy="-5" r="3.6" fill={CREAM} />
            <circle cx="5" cy="0" r="3.6" fill={CREAM} />
            <circle cx="0" cy="5" r="3.6" fill={CREAM} />
            <circle cx="-5" cy="0" r="3.6" fill={CREAM} />
            <circle cx="0" cy="0" r="2.6" fill={GOLD} />
        </>
    ),
    quill: (
        <>
            <path d="M-6 9C-8 0 0-8 8-10C8-2 2 6-4 8Z" fill="#C9C6E8" />
            <path d="M-7 11C-3 3 2-4 7-9" fill="none" />
        </>
    ),
    key: (
        <>
            <circle cx="0" cy="-4" r="4" fill={GOLD} />
            <path d="M0 0V9M0 5H3.5M0 8.5H3" fill="none" />
        </>
    ),
    planet: (
        <>
            <circle cx="0" cy="0" r="5.5" fill={GOLD} />
            <path d="M-10 3C-6 6 6 2 10-3" fill="none" />
        </>
    ),
    moon: <path d="M3-9A9 9 0 1 0 3 9A7 7 0 0 1 3-9Z" fill={CREAM} />,
    hourglass: <path d="M-5-8H5L0 0L5 8H-5L0 0Z" fill={CREAM} />,
    leaf: (
        <>
            <path d="M-7 7C-7-4 2-8 8-8C8 2 1 7-7 7Z" fill="#A3BC8C" />
            <path d="M-7 7L3-3" fill="none" />
        </>
    ),
    bubble: <path d="M-8-6H8V4H-1L-5 8V4H-8Z" fill={CREAM} />,
};

export function SpineMotif({ motif, className = 'spine-motif' }) {
    return (
        <svg className={className} viewBox="-12 -12 24 24" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {MOTIFS[motif] || MOTIFS.star}
        </svg>
    );
}

function SpineFace({ title, cover, motif }) {
    const coverStyle = cover ? { backgroundImage: 'url(' + JSON.stringify(cover) + ')' } : undefined;

    return (
        <span className="spine-face" aria-hidden="true">
            <span className="spine-cap">
                <SpineMotif motif={motif} />
            </span>
            <span className="spine-body" style={coverStyle}>
                <span className="spine-title">{title}</span>
            </span>
        </span>
    );
}

export default SpineFace;
