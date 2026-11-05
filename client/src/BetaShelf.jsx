const STAR_PATH = 'M0-8c.6 5 3 7.4 8 8-5 .6-7.4 3-8 8-.6-5-3-7.4-8-8 5-.6 7.4-3 8-8Z';

const SKY_STARS = [
    [150, 26, 1, 'gold', 0],
    [96, 49, 0.6, 'rose', 0.5],
    [210, 45, 0.6, 'lavender', 0.9],
    [246, 74, 0.5, 'gold', 1.2],
    [58, 82, 0.5, 'gold', 0.2],
];

const BOOKS = [
    { x: 36, y: 112, w: 18, tone: 'plum', bands: [124, 188] },
    { x: 56, y: 100, w: 22, tone: 'sage', bands: [112, 190] },
    { x: 80, y: 118, w: 16, tone: 'rose', bands: [] },
    { x: 98, y: 106, w: 20, tone: 'lavender', bands: [118], light: true },
    { x: 164, y: 110, w: 18, tone: 'plum', bands: [122] },
    { x: 184, y: 98, w: 22, tone: 'rose', bands: [110, 192], light: true },
];

function BetaShelf({ filled = false }) {
    return (
        <svg className={`apply-shelf ${filled ? 'filled' : ''}`} viewBox="0 0 300 240" aria-hidden="true">
            <defs>
                <radialGradient id="apply-shelf-glow">
                    <stop offset="0" stopColor="#E4B766" stopOpacity=".7" />
                    <stop offset="1" stopColor="#E4B766" stopOpacity="0" />
                </radialGradient>
            </defs>

            {SKY_STARS.map(([x, y, scale, tone, delay]) => (
                <path
                    key={`${x}-${y}`}
                    className={`apply-shelf-star apply-tone-${tone}`}
                    d={STAR_PATH}
                    transform={`translate(${x} ${y}) scale(${scale})`}
                    style={{ '--twinkle-delay': `${delay}s` }}
                />
            ))}

            <rect className="apply-shelf-case" x="20" y="88" width="260" height="122" rx="6" />
            <rect className="apply-shelf-back" x="30" y="94" width="240" height="108" rx="3" />

            {BOOKS.map((book) => (
                <g key={book.x}>
                    <rect className={`apply-tone-${book.tone}`} x={book.x} y={book.y} width={book.w} height={202 - book.y} rx="2" />
                    {book.bands.map((band) => (
                        <path key={band} className={book.light ? 'apply-shelf-band-light' : 'apply-shelf-band'} d={`M${book.x} ${band}h${book.w}`} />
                    ))}
                </g>
            ))}

            <circle className="apply-shelf-glow" cx="141" cy="150" r="40" fill="url(#apply-shelf-glow)" />
            {filled ? (
                <g className="apply-shelf-new-book">
                    <rect className="apply-tone-gold" x="124" y="104" width="34" height="98" rx="2" />
                    <path className="apply-shelf-band-light" d="M124 116h34M124 190h34" />
                    <path className="apply-tone-paper" d={STAR_PATH} transform="translate(141 150) scale(.8)" />
                </g>
            ) : (
                <>
                    <rect className="apply-shelf-gap" x="122" y="104" width="38" height="98" rx="3" />
                    <path className="apply-shelf-gap-star apply-tone-gold" d={STAR_PATH} transform="translate(141 150)" />
                </>
            )}

            <path className="apply-tone-sage" d="M208 202l10-92 18 2-10 92Z" />
            <rect className="apply-tone-sage" x="238" y="170" width="24" height="32" rx="4" />
            <rect className="apply-tone-gold" x="243" y="164" width="14" height="8" rx="2" />
            <g className="apply-shelf-quill">
                <path className="apply-tone-lavender" d="M250 166c6-26 18-46 30-58-2 20-10 40-28 58Z" />
                <path className="apply-shelf-band-light" d="M251 165l24-52" />
            </g>

            <rect className="apply-shelf-sill" x="14" y="208" width="272" height="10" rx="3" />
        </svg>
    );
}

export default BetaShelf;
