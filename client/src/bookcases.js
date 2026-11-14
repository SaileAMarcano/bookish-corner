export const BASE_WIDTH = 320;
export const PILE_SIZE = 5;
export const SHELF_DENSITIES = {
    mobile: { covers: 4, spines: 8 },
    tablet: { covers: 5, spines: 9 },
    desktop: { covers: 6, spines: 10 },
};

export function shelfDensity(viewport) {
    return viewport <= 600 ? 'mobile' : viewport <= 900 ? 'tablet' : 'desktop';
}

function bookDimensions(width, k, density) {
    const { covers, spines } = SHELF_DENSITIES[density] || SHELF_DENSITIES.desktop;
    const gap = 2 * k;
    const frontWidth = (width - (covers - 1) * gap) / covers;
    return { w: (width - (spines - 1) * gap) / spines, h: frontWidth / 0.6, frontWidth };
}

export const BOOKCASES = {
    scroll: {
        colors: ['black', 'tan', 'walnut'],
        frame: [11, 89],
        rows: [[13.96, 26.63], [29.29, 41.96], [44.63, 57.29], [59.96, 72.63], [75.29, 88]],
        left: 20.3,
        right: 80.4,
    },
    gothic: {
        colors: ['oak', 'honey', 'walnut'],
        frame: [7, 93],
        rows: [[27.67, 35.75], [39.21, 47.29], [50.75, 58.83], [62.29, 70.38], [73.83, 81.92]],
        left: 20.2,
        right: 80.7,
    },
    floral: {
        colors: ['rose', 'sage', 'night'],
        frame: [8, 92],
        rows: [[16.42, 25.54], [27.92, 37.04], [39.42, 48.54], [50.92, 60.04], [62.42, 71.63]],
        left: 16.3,
        right: 83.6,
    },
};

export const BOOKCASE_MODELS = Object.keys(BOOKCASES);

const DECORATION_RATIOS = { candle: 0.72, quill: 0.52, stars: 0.75, flowers: 0.88, tea: 0.94 };
const DECORATION_HEIGHTS = { candle: 60, quill: 76, stars: 64, flowers: 90, tea: 44 };
const THIN_GENRES = ['Manga', 'Comics'];
const LEGACY_PILE_SIZE = 3;

export function bookcaseImage({ model, color }) {
    return '/bookcases/' + model + '-' + color + '.webp';
}

export function defaultBookcase(year) {
    const index = Math.abs(year || 0);
    const model = BOOKCASE_MODELS[index % BOOKCASE_MODELS.length];
    const colors = BOOKCASES[model].colors;
    return { model, color: colors[Math.floor(index / BOOKCASE_MODELS.length) % colors.length] };
}

export function bookcaseOf(cases, year) {
    const saved = cases.find((row) => row.year === (year ?? 0));
    if (saved && BOOKCASES[saved.model]?.colors.includes(saved.color)) {
        return { model: saved.model, color: saved.color };
    }
    return defaultBookcase(year);
}

export function isThin(book) {
    return THIN_GENRES.includes(book.genre) || (!book.genre && THIN_GENRES.includes(book.workGenre));
}

function rowsOf(model, caseWidth, k) {
    const { rows, left, right } = BOOKCASES[model];
    const caseHeight = caseWidth * 2;
    const padding = 5 * k;
    const x = (left / 100) * caseWidth + padding;
    const width = ((right - left) / 100) * caseWidth - padding * 2;

    return rows.map(([top, bottom]) => ({
        top: (top / 100) * caseHeight,
        height: ((bottom - top) / 100) * caseHeight + 3 * k,
        left: x,
        width,
    }));
}

export function caseGeometry(model, width = BASE_WIDTH, { immersive = false, rowCount = 5, density = 'desktop' } = {}, groups = []) {
    const expandedPiles = groups.some((group) => group.type === 'pile' && group.items.length > LEGACY_PILE_SIZE);
    if (!immersive && !expandedPiles) {
        return { width, height: width * 2, artWidth: width, cropLeft: 0, k: width / BASE_WIDTH, rows: rowsOf(model, width, width / BASE_WIDTH), slices: [] };
    }

    const { frame, rows: sourceRows } = BOOKCASES[model];
    const artWidth = immersive ? width / ((frame[1] - frame[0]) / 100) : width;
    const artHeight = artWidth * 2;
    const cropLeft = immersive ? (frame[0] / 100) * artWidth : 0;
    const k = artWidth / BASE_WIDTH;
    const originalRows = rowsOf(model, artWidth, k);
    const slices = [];
    let sourceCursor = 0;
    let cursor = 0;

    // Keep carved ends and shelf boards at their original proportions. Only
    // the quiet back panels and straight posts grow to make room for books.
    function slice(sourceTop, sourceHeight, height = sourceHeight) {
        if (sourceHeight <= 0) return;
        slices.push({ sourceTop, sourceHeight, top: cursor, height });
        cursor += height;
    }

    const rows = originalRows.slice(0, Math.max(1, Math.min(rowCount, originalRows.length))).map((row, index) => {
        const [top, bottom] = sourceRows[index].map((value) => (value / 100) * artHeight);
        slice(sourceCursor, top - sourceCursor);
        const size = bookDimensions(row.width, k, density);
        const neededHeight = immersive
            ? Math.max(size.h + 8 * k, PILE_SIZE * size.w + 6 * k, 96 * k)
            : PILE_SIZE * Math.round(12 * k) + row.height * 0.5 + 6 * k;
        const height = Math.max(bottom - top, neededHeight);
        const next = { ...row, top: cursor, left: row.left - cropLeft, height: height + 3 * k };
        slice(top, bottom - top, height);
        sourceCursor = bottom;
        return next;
    });
    const baseTop = (sourceRows[sourceRows.length - 1][1] / 100) * artHeight;
    slice(baseTop, artHeight - baseTop);

    return { width, height: cursor, artWidth, cropLeft, k, rows, slices };
}

export function decorationSize(name, k = 1) {
    const h = (DECORATION_HEIGHTS[name] ?? 60) * k;
    return { h, w: h * (DECORATION_RATIOS[name] ?? 0.8) };
}

function measure(group, k, bookSize) {
    if (group.type === 'decoration') {
        const size = decorationSize(group.name, k);
        return { ...group, ...size, span: size.w + 4 * k };
    }

    if (group.type === 'pile') {
        const items = group.items.map((item) => ({ ...item, w: bookSize.h, h: bookSize.w }));
        const pileHeight = items.reduce((total, item) => total + item.h, 0) - Math.max(0, items.length - 1);
        const top = group.top ? { ...group.top, ...decorationSize(group.top.name, k) } : null;

        const w = Math.ceil(Math.max(bookSize.h, top ? top.w + 4 * k : 0));
        return { ...group, items, top, w, h: pileHeight };
    }

    const w = group.pose === 'front' ? bookSize.frontWidth : bookSize.w;
    return { ...group, ...bookSize, w, span: w };
}

function spanOf(group) {
    return group.span ?? group.w;
}

export function layoutCases(groups, model, caseWidth = BASE_WIDTH, options = {}) {
    const { density = 'desktop' } = options;
    const { k, rows } = caseGeometry(model, caseWidth, options, groups);
    const bookSize = bookDimensions(rows[0].width, k, density);
    const gap = 2 * k;
    const buckets = [];
    let cursor = 0;

    for (const group of groups) {
        let index = Number.isInteger(group.shelf) ? group.shelf : cursor;

        for (;;) {
            while (buckets.length <= index) buckets.push({ groups: [], used: 0 });
            const rowIndex = index % rows.length;
            const row = rows[rowIndex];
            const shaped = measure(group, k, bookSize);
            const bucket = buckets[index];
            const needed = spanOf(shaped) + (bucket.used > 0 ? gap : 0);

            if (bucket.used === 0 || bucket.used + needed <= row.width + 0.01) {
                bucket.groups.push(shaped);
                bucket.used += needed;
                break;
            }
            index += 1;
        }

        cursor = index;
    }

    const caseCount = Math.max(1, Math.ceil(buckets.length / rows.length));
    return Array.from({ length: caseCount }, (_, caseIndex) =>
        rows.map((row, rowIndex) => {
            const index = caseIndex * rows.length + rowIndex;
            return { ...row, index, groups: buckets[index]?.groups ?? [] };
        })
    );
}
