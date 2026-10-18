'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const meta=JSON.parse(read('phu-tan-release-20261017.json'));
assert.equal(meta.id,'20261017.3-phutan');
assert.equal(meta.blocks.reduce((s,b)=>s+b.main,0),30);
assert.equal(meta.blocks.reduce((s,b)=>s+b.assist,0),27);
const html=read('index.html'),loader=read('patch-runtime-loader-v1.js');
assert.ok(html.includes("window.LBG_RELEASE_ID='20261018.2-thanh-lam-fix'"));
assert.ok(html.includes('index-core.html?v=20261018.1'));
assert.ok(html.includes('patch-runtime-loader-v1.js?v=20261018.2'));
assert.ok(loader.includes("const VERSION='20261018.2'"));
for(const file of ['tkb-phu-tan-extra-period-v1.js','school-report-v1.js']){
 assert.ok(loader.includes(file+'?v=20261017.3'));
}
assert.ok(loader.includes('assist-p-preview-safe-v1.js?v=20261018.1'));
assert.ok(read('tkb-phu-tan-extra-period-v1.js').includes('findHeader'));
assert.ok(read('school-report-v1.js').includes('validatedExtraPeriod'));
assert.ok(read('assist-p-preview-safe-v1.js').includes('extraHeader'));
console.log('PASS: chính thức Phú Tân 19T10: 30 giáo viên, 27 trợ giảng; bộ đọc lịch, báo cáo và cache-bust.');
