import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOKCASE_MODELS, SHELF_DENSITIES, BASE_WIDTH, caseGeometry, layoutCases, shelfFit } from '../src/bookcases.js';
import { bookItem, groupItems } from '../src/shelfUtils.js';
import { shelfWell, shelfViewport } from '../src/shelfView.js';

for (const model of BOOKCASE_MODELS) for (const density of Object.keys(SHELF_DENSITIES)) {
    test(`${model}/${density}: shelves hold as many spines and covers as fit their width`, () => {
        const capacity = shelfFit(model, BASE_WIDTH, { immersive: true, density });
        assert.ok(capacity.spines > SHELF_DENSITIES[density].spines);
        for (const [pose, count] of [['upright', capacity.spines], ['front', capacity.covers]]) {
            const groups = groupItems(Array.from({ length: count + 1 }, (_, index) => bookItem({ id: index + 1, title: `Book ${index + 1}` }, pose)));
            const rows = layoutCases(groups, model, BASE_WIDTH, { immersive: true, density })[0];
            assert.equal(rows[0].groups.length, count);
            assert.equal(rows[1].groups.length, 1);
            if (pose === 'upright') assert.ok(rows[0].groups.every(book => book.w / book.h <= .19 + .00001));
        }
    });

    test(`${model}/${density}: five fixed wells stay inside their shared artwork and crop without cutting content`, () => {
        const groups = groupItems(Array.from({ length: 9 }, (_, index) => bookItem({ id: index + 1, title: `Book ${index + 1}` })));
        const options = { immersive: true, density };
        const geometry = caseGeometry(model, BASE_WIDTH, options, groups);
        const rows = layoutCases(groups, model, BASE_WIDTH, options)[0];
        assert.equal(rows.length, 5);
        for (const row of rows) {
            const well = shelfWell(geometry, row, model);
            const crop = shelfViewport(geometry, row);
            assert.ok(well.left >= 0 && well.left + well.width <= geometry.width);
            assert.ok(well.top >= crop.top && well.top + well.height <= crop.top + crop.height);
            assert.ok(row.groups.every(book => book.h <= well.height));
            assert.ok(crop.height < geometry.width);
        }
    });
}
