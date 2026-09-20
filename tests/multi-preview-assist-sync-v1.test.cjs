'use strict';
const fs=require('fs');
const assert=require('node:assert/strict');
const Sync=require('../multi-preview-assist-sync-v1.js');

assert.equal(Sync.VERSION,'20260914.1');
assert.equal(Sync.previewCode({code:'THANH'},'ĐỨC'),'THANH');
assert.equal(Sync.previewCode(null,'ĐỨC'),'ĐỨC');

const select={value:'ĐỨC'};
let seen='';
const ok=Sync.withTeacherValue(select,'THANH',()=>{seen=select.value});
assert.equal(ok,true);
assert.equal(seen,'THANH','helper must expose the teacher currently being previewed while P layers render');
assert.equal(select.value,'ĐỨC','hidden single-teacher selection must be restored after P layers render');

const source=fs.readFileSync('multi-preview-assist-sync-v1.js','utf8');
assert.match(source,/multiPreviewPicker/,'sync must only activate in multi-preview mode');
assert.match(source,/LBGAssistPPreviewSafe\?\.placeAssist/,'multi preview must restore P class labels');
assert.match(source,/LBGAssistPWebFooterSafe\?\.patchFooter/,'multi preview must restore the Trợ (P) footer');
assert.match(source,/multiPreviewSelect/,'switching the viewed teacher must resync P immediately');
assert.match(source,/lbgGaMultiApplyButton/,'rerender after batch GA must resync P');

const patchLoader=fs.readFileSync('patch-runtime-loader-v1.js','utf8');
assert.match(patchLoader,/assist-p-web-footer-safe-v1\.js\?v=20260912\.1[\s\S]*multi-preview-assist-sync-v1\.js\?v=20260914\.1/,'P multi-preview sync must load after both P preview/footer helpers');

console.log('OK multi preview P sync: current viewed teacher gets its own P rows/footer without changing hidden selection');
