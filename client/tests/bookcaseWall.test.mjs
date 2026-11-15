import assert from 'node:assert/strict';
import test from 'node:test';
import {BOOKCASE_MODELS, SHELF_DENSITIES, caseGeometry, layoutCases} from '../src/bookcases.js';
import {bookItem, decorationItem, groupItems} from '../src/shelfUtils.js';

const books = (count, pose = 'upright', shelf = null) => Array.from({length: count}, (_, i) => bookItem({id:i + 1, title:`Book ${i + 1}`}, pose, null, null, null, shelf));
const contents = [
    groupItems([]),
    groupItems(books(7)),
    groupItems([...books(5, 'flat', 0), ...books(10, 'upright', 1).map(item=>({...item,key:item.key+'-row'})), decorationItem('flowers', 'upright', 4)]),
];

for (const density of Object.keys(SHELF_DENSITIES)) for (const width of [256,320,600]) {
    test(`${density}/${width}: different models and contents share a wall height without resizing objects`, () => {
        const options = {immersive:true,density};
        const entries = BOOKCASE_MODELS.flatMap(model=>contents.map(groups=>({model,groups})));
        const target = Math.max(...entries.map(({model,groups})=>caseGeometry(model,width,options,groups).height));
        for (const {model,groups} of entries) {
            const natural = caseGeometry(model,width,options,groups);
            const aligned = caseGeometry(model,width,{...options,minHeight:target},groups);
            assert.equal(aligned.height,target);
            assert.equal(aligned.width,width);
            assert.equal(aligned.k,natural.k);
            assert.equal(aligned.rows.length,5);
            assert.equal(aligned.slices.length,natural.slices.length);
            const panels = new Set(natural.rows.map(row=>row.top));
            natural.slices.forEach((slice,index)=>{
                assert.equal(aligned.slices[index].sourceTop,slice.sourceTop);
                assert.equal(aligned.slices[index].sourceHeight,slice.sourceHeight);
                if (!panels.has(slice.top)) assert.equal(aligned.slices[index].height,slice.height);
            });
            const before = layoutCases(groups,model,width,options).flatMap(rows=>rows.flatMap(row=>row.groups));
            const after = layoutCases(groups,model,width,{...options,minHeight:target}).flatMap(rows=>rows.flatMap(row=>row.groups));
            assert.deepEqual(after,before);
            aligned.rows.forEach((row,index)=>{
                assert.ok(row.height>=natural.rows[index].height);
                assert.equal(row.left,natural.rows[index].left);
                assert.equal(row.width,natural.rows[index].width);
                if(index>0) assert.ok(row.top>=aligned.rows[index-1].top+aligned.rows[index-1].height);
            });
        }
    });
}

test('a minimum height never compresses artwork or the natural close-up layout',()=>{
    const options={immersive:true,density:'desktop'};
    for(const model of BOOKCASE_MODELS){
        const groups=contents[2];
        const natural=caseGeometry(model,320,options,groups);
        assert.deepEqual(caseGeometry(model,320,{...options,minHeight:1},groups),natural);
        assert.deepEqual(caseGeometry(model,320,options,groups),natural);
    }
});
