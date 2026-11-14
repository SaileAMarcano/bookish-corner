export const BASE_WIDTH = 320;

export const BOOKCASES = {
    scroll: {
        colors: ['black', 'tan', 'walnut'],
        rows: [[13.96, 26.63], [29.29, 41.96], [44.63, 57.29], [59.96, 72.63], [75.29, 88]],
        left: 20.3,
        right: 80.4,
    },
    gothic: {
        colors: ['oak', 'honey', 'walnut'],
        rows: [[27.67, 35.75], [39.21, 47.29], [50.75, 58.83], [62.29, 70.38], [73.83, 81.92]],
        left: 20.2,
        right: 80.7,
    },
    floral: {
        colors: ['rose', 'sage', 'night'],
        rows: [[16.42, 25.54], [27.92, 37.04], [39.42, 48.54], [50.92, 60.04], [62.42, 71.63]],
        left: 16.3,
        right: 83.6,
    },
};

export const BOOKCASE_MODELS = Object.keys(BOOKCASES);

const DECORATION_RATIOS = { candle: 0.72, quill: 0.52, stars: 0.75, flowers: 0.88, tea: 0.94 };
const THIN_GENRES = ['Manga', 'Comics'];

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

function measureBook(item, rowHeight, k) {
    const thin = isThin(item.book);
    return {
        thin,
        w: Math.round((thin ? 10 : 15) * k),
        h: Math.round(rowHeight * (0.8 + item.size * 0.04)),
    };
}

function measure(group, row, k) {
    if (group.type === 'decoration') {
        const h = Math.round(row.height * 0.66);
        return { ...group, h, w: Math.round(h * (DECORATION_RATIOS[group.name] ?? 0.8)) };
    }

    if (group.type === 'pile') {
        const length = Math.round(Math.min(row.width * 0.6, row.height * 1.12));
        const items = group.items.map((item) => {
            const thin = isThin(item.book);
            return { ...item, thin, w: Math.round(length - (thin ? 8 * k : 0) + item.size * 2 * k), h: Math.round((thin ? 10 : 15) * k) };
        });
        const pileHeight = items.reduce((total, item) => total + item.h, 0);
        const top = group.top
            ? { ...group.top, h: Math.round(Math.max(14 * k, Math.min(row.height * 0.5, row.height - pileHeight - 6 * k))) }
            : null;
        if (top) top.w = Math.round(top.h * (DECORATION_RATIOS[top.name] ?? 0.8));

        return { ...group, items, top, w: Math.round(length + 7 * k), h: pileHeight };
    }

    const book = measureBook(group, row.height, k);
    const lean = group.pose === 'lean' ? Math.round(row.height * 0.12 + 4 * k) : 0;
    return { ...group, ...book, lean, span: book.w + lean };
}

function spanOf(group) {
    return group.span ?? group.w;
}

export function layoutCases(groups, model, caseWidth = BASE_WIDTH) {
    const k = caseWidth / BASE_WIDTH;
    const gap = 2 * k;
    const rows = rowsOf(model, caseWidth, k);
    const buckets = [];
    let cursor = 0;

    for (const group of groups) {
        let index = Number.isInteger(group.shelf) ? group.shelf : cursor;

        for (;;) {
            while (buckets.length <= index) buckets.push({ groups: [], used: 0 });
            const row = rows[index % rows.length];
            const shaped = measure(group, row, k);
            const bucket = buckets[index];
            const needed = spanOf(shaped) + (bucket.used > 0 ? gap : 0);

            if (bucket.used === 0 || bucket.used + needed <= row.width) {
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
