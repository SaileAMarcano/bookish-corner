const WALLS = {
    scroll: [116 / 600, 484 / 600],
    gothic: [114 / 600, 485 / 600],
    floral: [98 / 600, 502 / 600],
};

export function shelfWell(geometry, row, model) {
    const [left, right] = WALLS[model];
    return {
        left: left * geometry.artWidth - geometry.cropLeft,
        top: row.top,
        width: (right - left) * geometry.artWidth,
        height: row.height - 3 * geometry.k,
    };
}

export function shelfViewport(geometry, row) {
    const top = Math.max(0, row.top - 6 * geometry.k);
    const bottom = Math.min(geometry.height, row.top + row.height + 12 * geometry.k);
    return { top, height: bottom - top };
}
