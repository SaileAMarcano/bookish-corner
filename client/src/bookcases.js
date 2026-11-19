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
    const h = frontWidth / 0.6;
    const span = (width - (spines - 1) * gap) / spines;
    const w = Math.min(span, h * 0.19);
    return { w, h, frontWidth, spines: Math.floor((width + k + 0.01) / (w + k)) };
}

export function shelfFit(model, caseWidth = BASE_WIDTH, options = {}) {
    const density = options.density || 'desktop';
    const { k, rows } = caseGeometry(model, caseWidth, { ...options, density });
    const size = bookDimensions(rows[0].width, k, density);
    return { spines: size.spines, covers: (SHELF_DENSITIES[density] || SHELF_DENSITIES.desktop).covers };
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

const DECORATION_RATIOS = {
    candle: 0.72, quill: 0.52, stars: 0.75, flowers: 0.88, bookends: 1.89,
    tree: 0.73,
    'gift-books': 1.16,
    reindeer: 0.67,
    snowman: 0.72,
    'snow-globe': 0.74,
    bottle: 0.88,
    seashell: 1.23,
    compass: 0.7,
    clock: 0.93,
    moon: 0.68,
    'moon-chest': 1.41,
    geode: 0.95,
    'secret-door': 0.74,
    'dragon-egg': 0.64,
    'treasure-map': 1.54,
    suitcase: 1.14,
    globe: 0.72,
    camera: 1.46,
    'reading-cat': 0.77,
    'paper-lantern': 0.75,
    daruma: 0.92,
    'fox-mask': 0.69,
    samurai: 0.62,
};
const DECORATION_HEIGHTS = {
    candle: 60, quill: 76, stars: 64, flowers: 90, bookends: 56,
    tree: 76,
    'gift-books': 52,
    reindeer: 64,
    snowman: 66,
    'snow-globe': 62,
    bottle: 58,
    seashell: 50,
    compass: 62,
    clock: 60,
    moon: 70,
    'moon-chest': 52,
    geode: 56,
    'secret-door': 72,
    'dragon-egg': 64,
    'treasure-map': 52,
    suitcase: 54,
    globe: 70,
    camera: 48,
    'reading-cat': 64,
    'paper-lantern': 62,
    daruma: 58,
    'fox-mask': 66,
    samurai: 70,
};
const THIN_GENRES = ['Manga', 'Comics'];
const THIN_RATIO = 0.5;
const PILE_THIN_RATIO = 0.75;
const SNAP = 0.08;
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
    const padding = k;
    const x = (left / 100) * caseWidth + padding;
    const width = ((right - left) / 100) * caseWidth - padding * 2;

    return rows.map(([top, bottom]) => ({
        top: (top / 100) * caseHeight,
        height: ((bottom - top) / 100) * caseHeight + 3 * k,
        left: x,
        width,
    }));
}

export function caseGeometry(model, width = BASE_WIDTH, { immersive = false, rowCount = 5, density = 'desktop', minHeight = 0 } = {}, groups = []) {
    if (immersive && minHeight > 0) {
        const geometry = caseGeometry(model, width, { immersive, rowCount, density }, groups);
        const growth = Math.max(0, minHeight - geometry.height) / geometry.rows.length;
        if (growth === 0) return geometry;

        // Equalize the wall display by extending only the empty back panels.
        // Keep the artwork's carved ends, books and decorations at their scale.
        const panels = new Set(geometry.rows.map(row => row.top));
        let offset = 0;
        const slices = geometry.slices.map(slice => {
            const extra = panels.has(slice.top) ? growth : 0;
            const next = { ...slice, top: slice.top + offset, height: slice.height + extra };
            offset += extra;
            return next;
        });
        return { ...geometry, height: minHeight, slices,
            rows: geometry.rows.map((row, index) => ({ ...row, top: row.top + index * growth, height: row.height + growth })) };
    }

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
    const desktopBuckets = immersive && density === 'desktop'
        ? distributeGroups(groups, originalRows[0].width, k, bookDimensions(originalRows[0].width, k, density))
        : null;
    const slices = [];
    let sourceCursor = 0;
    let cursor = 0;

    // Keep carved ends and shelf boards at their original proportions. Only
    // the quiet back panels and straight posts resize around their contents.
    function slice(sourceTop, sourceHeight, height = sourceHeight) {
        if (sourceHeight <= 0) return;
        slices.push({ sourceTop, sourceHeight, top: cursor, height });
        cursor += height;
    }

    const rows = originalRows.slice(0, Math.max(1, Math.min(rowCount, originalRows.length))).map((row, index) => {
        const [top, bottom] = sourceRows[index].map((value) => (value / 100) * artHeight);
        slice(sourceCursor, top - sourceCursor);
        const size = bookDimensions(row.width, k, density);
        const fullHeight = Math.max(size.h + 8 * k, PILE_SIZE * size.w + 6 * k, 96 * k);
        const rowGroups = desktopBuckets?.filter((_, shelf) => shelf % originalRows.length === index).flatMap(bucket => bucket.groups);
        const neededHeight = desktopBuckets
            ? Math.max(size.h + 8 * k, ...rowGroups.map(group => group.type === 'pile' && group.top
                ? Math.min(group.h + group.top.h + 6 * k, fullHeight)
                : group.h + 6 * k))
            : immersive ? fullHeight : PILE_SIZE * Math.round(12 * k) + row.height * 0.5 + 6 * k;
        const height = desktopBuckets ? neededHeight : Math.max(bottom - top, neededHeight);
        const next = { ...row, top: cursor, left: row.left - cropLeft, height: height + 3 * k };
        slice(top, bottom - top, height);
        sourceCursor = bottom;
        return next;
    });
    const baseTop = (sourceRows[sourceRows.length - 1][1] / 100) * artHeight;
    slice(baseTop, artHeight - baseTop);

    return { width, height: cursor, artWidth, cropLeft, k, rows, slices };
}

export function decorationSize(name, k = 1, scale = 1) {
    const h = (DECORATION_HEIGHTS[name] ?? 60) * k * (scale || 1);
    return { h, w: h * (DECORATION_RATIOS[name] ?? 0.8) };
}

function measure(group, k, bookSize) {
    if (group.type === 'decoration') {
        const size = decorationSize(group.name, k, group.scale);
        return { ...group, ...size, span: size.w + (isFree(group) ? 0 : 4 * k) };
    }

    if (group.type === 'pile') {
        const items = group.items.map((item) => ({ ...item, w: bookSize.h, h: pileThickness(item, bookSize) }));
        const pileHeight = items.reduce((total, item) => total + item.h, 0) - Math.max(0, items.length - 1);
        const top = group.top ? { ...group.top, ...decorationSize(group.top.name, k, group.top.scale) } : null;

        const w = Math.ceil(Math.max(bookSize.h, top ? top.w + 4 * k : 0));
        return { ...group, items, top, w, h: pileHeight };
    }

    const w = group.pose === 'front' ? bookSize.frontWidth : thickness(group, bookSize);
    return { ...group, ...bookSize, w, span: w };
}

function pileThickness(item, bookSize) {
    return item.book && isThin(item.book) ? bookSize.w * PILE_THIN_RATIO : bookSize.w;
}

function thickness(item, bookSize) {
    return item.book && isThin(item.book) ? bookSize.w * THIN_RATIO : bookSize.w;
}

function distributeGroups(groups, rowWidth, k, bookSize) {
    const gap = k;
    const thinGap = 0.5 * k;
    const buckets = [];
    let cursor = 0;

    for (const group of groups) {
        let index = Number.isInteger(group.shelf) ? group.shelf : cursor;

        for (;;) {
            while (buckets.length <= index) buckets.push({ groups: [] });
            const shaped = measure(group, k, bookSize);
            const bucket = buckets[index];
            shaped.tight = thinSpine(shaped) && thinSpine(bucket.groups.at(-1));

            if (bucket.groups.length === 0 || fits([...bucket.groups, shaped], rowWidth, gap, thinGap)) {
                bucket.groups.push(shaped);
                break;
            }
            index += 1;
        }

        cursor = index;
    }

    for (const bucket of buckets) {
        bucket.excess = excessOf(bucket.groups, rowWidth, gap, thinGap);
        placeFree(bucket.groups, rowWidth, gap, thinGap);
    }
    return buckets;
}

function thinSpine(group) {
    return Boolean(group?.book) && group.pose === 'upright' && !Number.isFinite(group.x) && isThin(group.book);
}

function freeX(group) {
    if (group.type === 'pile') return group.items.map((item) => item.x).find(Number.isFinite);
    if (group.type === 'decoration' && group.pose === 'flat') return undefined;
    return Number.isFinite(group.x) ? group.x : undefined;
}

function isFree(group) {
    return freeX(group) !== undefined;
}

function flowWidth(groups, gap, thinGap) {
    return groups.filter((group) => !isFree(group))
        .reduce((total, group, index) => total + spanOf(group) + (index > 0 ? (group.tight ? thinGap : gap) : 0), 0);
}

function excessOf(groups, rowWidth, gap, thinGap) {
    const floor = flowWidth(groups, gap, thinGap);
    const free = groups.filter(isFree).reduce((total, group) => total + group.w, 0);
    return Math.max(0, floor + free - rowWidth);
}

function fits(groups, rowWidth, gap, thinGap) {
    return excessOf(groups, rowWidth, gap, thinGap) <= rowWidth * 0.002;
}

function placeFree(groups, rowWidth, gap, thinGap) {
    let floor = flowWidth(groups, gap, thinGap);
    const free = groups.filter(isFree).sort((a, b) => freeX(a) - freeX(b));

    for (const group of free) {
        const room = Math.max(0, rowWidth - group.w);
        const wanted = Math.max(freeX(group) * room, floor);
        group.left = wanted - floor < rowWidth * SNAP ? floor : wanted;
        floor = group.left + group.w;
    }

    let limit = rowWidth;
    for (const group of [...free].reverse()) {
        group.left = Math.max(0, Math.min(group.left, limit - group.w));
        limit = group.left;
        const room = Math.max(0, rowWidth - group.w);
        group.fx = room > 0 ? Math.min(1, group.left / room) : 0;
    }
}

function spanOf(group) {
    return group.span ?? group.w;
}

export function layoutCases(groups, model, caseWidth = BASE_WIDTH, options = {}) {
    const { density = 'desktop' } = options;
    const { k, rows } = caseGeometry(model, caseWidth, options, groups);
    const bookSize = bookDimensions(rows[0].width, k, density);
    const buckets = distributeGroups(groups, rows[0].width, k, bookSize);

    const caseCount = Math.max(1, Math.ceil(buckets.length / rows.length));
    return Array.from({ length: caseCount }, (_, caseIndex) =>
        rows.map((row, rowIndex) => {
            const index = caseIndex * rows.length + rowIndex;
            return { ...row, index, groups: buckets[index]?.groups ?? [], excess: buckets[index]?.excess ?? 0 };
        })
    );
}
