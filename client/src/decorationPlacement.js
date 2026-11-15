import { BASE_WIDTH, caseGeometry, layoutCases } from './bookcases.js';
import { groupItems, moveItem, moveToShelf, pinShelves } from './shelfUtils.js';

const OPTIONS = { immersive: true };

export function placementIssue(items, model, options = {}) {
    const profile = { ...OPTIONS, ...options };
    const groups = groupItems(items);
    const { k } = caseGeometry(model, BASE_WIDTH, profile, groups);
    const layout = layoutCases(groups, model, BASE_WIDTH, profile);
    for (const rows of layout) for (const row of rows) for (const group of row.groups) {
        const members = group.type === 'pile' ? [...group.items, ...(group.top ? [group.top] : [])] : [group];
        if (group.type === 'pile' && group.top) {
            if (group.top.w + 6 * k > group.items[0].w) return { kind: 'support', name: group.top.name };
            if (group.h + group.top.h + 6 * k > row.height) return { kind: 'pileHeight', name: group.top.name };
        } else if (group.type === 'decoration' && group.pose === 'flat') {
            return { kind: 'support', name: group.name };
        }
        if (group.w > row.width || group.h > row.height || members.some(item => Number.isInteger(item.shelf) && item.shelf !== row.index)) {
            return { kind: 'space', name: group.top?.name ?? (group.type === 'decoration' ? group.name : null) };
        }
    }
    return null;
}

export function proposedMove(items, from, to, before, shelf) {
    const moving = items.find(item => item.key === from);
    if (moving?.type === 'decoration' && to) {
        const pile = groupItems(items).find(group => group.type === 'pile' && group.items.some(item => item.key === to));
        if (pile?.top && pile.top.key !== from) return { items, issue: { kind: 'occupied', name: moving.name } };
    }
    return { items: to ? moveItem(items, from, to, before) : moveToShelf(items, from, shelf), issue: null };
}

export function shelfCapacity(items) {
    const last = Math.max(0, ...items.map(item => item.shelf ?? 0));
    return Math.max(5, Math.ceil((last + 1) / 5) * 5);
}

export function findDecorationSpace(items, decoration, model, options = {}, capacity = shelfCapacity(items)) {
    const candidates = [...items.filter(item => item.key !== decoration.key), decoration];
    for (let shelf = 0; shelf < capacity; shelf++) {
        const floor = moveToShelf(candidates, decoration.key, shelf);
        if (!placementIssue(floor, model, options)) return floor;
        for (const pile of groupItems(items).filter(group => group.type === 'pile' && group.shelf === shelf && !group.top)) {
            const onPile = moveItem(candidates, decoration.key, pile.items[pile.items.length - 1].key, false);
            if (!placementIssue(onPile, model, options)) return onPile;
        }
    }
    return null;
}

// Adapt saved arrangements to the fixed object sizes without moving books
// out of their saved shelves. Decorations that cannot fit remain in the tray.
export function prepareDecorations(items, model, options = {}) {
    const profile = { ...OPTIONS, ...options };
    let placed = pinShelves(items.filter(item => item.type === 'book'), model, BASE_WIDTH, profile);
    const capacity = shelfCapacity(placed);
    const unplaced = [];
    let relocated = 0;
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        if (item.type !== 'decoration') continue;
        const previous = items.slice(0, index).reverse().map(old => placed.find(next => next.key === old.key)).find(Boolean);
        const insert = previous ? placed.findIndex(next => next.key === previous.key) + 1 : 0;
        const candidate = [...placed];
        candidate.splice(insert, 0, { ...item, shelf: item.shelf ?? previous?.shelf ?? 0 });
        if (!placementIssue(candidate, model, profile)) placed = candidate;
        else {
            const fitted = findDecorationSpace(placed, item, model, profile, capacity);
            if (fitted) { placed = fitted; relocated++; }
            else unplaced.push(item.name);
        }
    }
    return { items: placed, unplaced, relocated };
}
