import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOKCASE_MODELS, SHELF_DENSITIES, BASE_WIDTH, layoutCases, decorationSize, caseGeometry, shelfFit } from '../src/bookcases.js';
import { bookItem, decorationItem, groupItems, moveBy, moveToShelf, pinShelves, savedItems, toPayload } from '../src/shelfUtils.js';
import { placementIssue, proposedMove, shelfCapacity } from '../src/decorationPlacement.js';

const book = (id, pose = 'upright', shelf = 0) => bookItem({ id, bookId: id, title: `Book ${id}` }, pose, null, null, null, shelf);
const profiles = BOOKCASE_MODELS.flatMap(model => Object.keys(SHELF_DENSITIES).map(density => ({model, options: {immersive: true, density}})));

for (const {model, options} of profiles) {
    const label = `${model}/${options.density}`;
    test(`${label}: move a green book up beside a pile without splitting the pile`, () => {
        const items = [book(1), ...Array.from({length: 5}, (_, i) => book(i + 2, 'flat')), book(7, 'upright', 1), book(8, 'upright', 1)];
        const before = structuredClone(items);
        assert.equal(placementIssue(items, model, options), null);
        const moved = proposedMove(items, 'book-7', null, false, 0).items;
        assert.equal(placementIssue(moved, model, options), null);
        assert.equal(moved.find(item => item.key === 'book-7').shelf, 0);
        assert.equal(groupItems(moved).filter(group => group.type === 'pile').length, 1);
        assert.equal(groupItems(moved).find(group => group.type === 'pile').items.length, 5);
        assert.deepEqual(items, before);
    });

    test(`${label}: lateral movement crosses a whole decorated pile, preserving its support`, () => {
        const items = [book(1, 'flat'), decorationItem('candle', 'flat', 0), book(2), book(3)];
        const moved = moveBy(items, 'book-2', -1);
        assert.deepEqual(moved.map(item => item.key), ['book-2', 'book-1', 'decoration-candle', 'book-3']);
        const pile = groupItems(moved).find(group => group.type === 'pile');
        assert.equal(pile.items.length, 1);
        assert.equal(pile.top.key, 'decoration-candle');
        // Moving around an ordinary pile never creates extra piles.
        const plain = [book(1, 'flat'), book(2, 'flat'), book(3)];
        assert.equal(placementIssue(moveBy(plain, 'book-3', -1), model, options), null);
        const back = moveBy(moved, 'book-2', 1);
        assert.deepEqual(back, items);
    });

    test(`${label}: arrows stay within the selected shelf; explicit controls can skip empty shelves`, () => {
        const items = [book(1), book(2, 'upright', 1), book(3, 'upright', 1)];
        assert.equal(moveBy(items, 'book-2', -1), items);
        assert.equal(moveBy(items, 'book-1', 1), items);
        const moved = moveToShelf(items, 'book-2', 4);
        assert.equal(placementIssue(moved, model, options), null);
        assert.equal(shelfCapacity(moved), 5);
        assert.equal(moved.at(-1).shelf, 4);
        assert.equal(new Set(moved.map(item => item.key)).size, items.length);
    });

    test(`${label}: a genuinely full destination is rejected without changing the arrangement`, () => {
        const count = shelfFit(model, BASE_WIDTH, options).spines;
        const items = [...Array.from({length: count}, (_, i) => book(i + 1)), book(100, 'upright', 1)];
        const before = structuredClone(items);
        assert.equal(placementIssue(items, model, options), null);
        assert.equal(placementIssue(moveToShelf(items, 'book-100', 0), model, options)?.kind, 'space');
        assert.deepEqual(items, before);
        assert.equal(placementIssue(moveToShelf(items, 'book-100', 2), model, options), null);
    });

    test(`${label}: move decorations at fixed size and round-trip book positions through save/load`, () => {
        const items = [book(1, 'front'), book(2, 'upright', 1), decorationItem('candle', 'upright', 2)];
        const moved = moveToShelf(moveToShelf(items, 'book-2', 0), 'decoration-candle', 4);
        assert.equal(placementIssue(moved, model, options), null);
        const pinned = pinShelves(moved, model, BASE_WIDTH, options);
        const payload = toPayload(pinned).map(({bookId, ...row}) => ({...row, userBookId: bookId}));
        const restored = savedItems(items.filter(i => i.type === 'book').map(i => i.book), payload, ['candle']);
        assert.deepEqual(restored.map(i => [i.key, i.pose, i.shelf]), pinned.map(i => [i.key, i.pose, i.shelf]));
        const measured = layoutCases(groupItems(restored), model, BASE_WIDTH, options)[0][4].groups[0];
        const {k} = caseGeometry(model, BASE_WIDTH, options);
        const expected = decorationSize('candle', k);
        assert.deepEqual([measured.w, measured.h], [expected.w, expected.h]);
    });
}

for (const model of BOOKCASE_MODELS) {
    test(`${model}: desktop shelves fit books closely and a five-book pile stays within the standing book height`, () => {
        const options = {immersive: true, density: 'desktop'};
        const books = [book(1), ...Array.from({length: 5}, (_, i) => book(i + 2, 'flat', 1)), decorationItem('flowers', 'upright', 2)];
        const rows = layoutCases(groupItems(books), model, 480, options)[0];
        const standing = rows[0].groups[0];
        const pile = rows[1].groups[0];
        const flowers = rows[2].groups[0];
        assert.ok(standing.h / rows[0].height > 0.8);
        assert.ok(pile.h <= rows[1].height);
        assert.ok(flowers.h <= rows[2].height);
        assert.ok(pile.h <= standing.h);
        assert.equal(placementIssue(books, model, options), null);
        const withQuill = [book(1, 'flat'), decorationItem('quill', 'flat', 0)];
        assert.equal(placementIssue(withQuill, model, options), null);
        const tooTall = [...Array.from({length: 5}, (_, i) => book(i + 1, 'flat')), decorationItem('quill', 'flat', 0)];
        assert.equal(placementIssue(tooTall, model, options)?.kind, 'pileHeight');
    });
}
