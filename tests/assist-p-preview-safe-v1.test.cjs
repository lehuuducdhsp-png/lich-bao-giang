'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const api=require('../assist-p-preview-safe-v1.js');

assert.strictEqual(api.assistantCode('H.THANH'),'H.THANHP');
assert.strictEqual(api.assistantCode('  đức  '),'ĐỨCP');
assert.strictEqual(api.dayCellIndex([2,3,4,5,6,7],6),5,'Thứ 6 phải map vào đúng cột ngày trong hàng tiết');
assert.strictEqual(api.dayCellIndex([2,3,4,5,6,7],7),6);
assert.strictEqual(api.formatClassText({className:'1/1'}),'1/1 (P)');
assert.strictEqual(api.formatClassText({className:'KHỐI 1 (4 LỚP)',groupNote:'TIẾT 3'}),'KHỐI 1 (4 LỚP) - TIẾT 3 (P)');

const src=fs.readFileSync(path.join(__dirname,'..','assist-p-preview-safe-v1.js'),'utf8');
assert(!/MutationObserver/.test(src),'Không được thêm MutationObserver cho bản P giai đoạn Web');
assert(!/window\.analyzeNow\s*=/.test(src),'Không được bọc/ghi đè analyzeNow');
assert(!/window\.renderPreview\s*=/.test(src),'Không được ghi đè renderPreview');
assert(!/window\.saveAs\s*=/.test(src),'Không được chạm đường xuất Excel');
assert(!/saveSheets|google-sheets-owner/i.test(src),'Không được chạm Google Sheets ở PR này');

const index=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
assert(index.includes('assist-p-preview-safe-v1.js?v=20260911.1'),'index test phải nạp đúng module P preview');
assert.strictEqual((index.match(/assist-p-preview-safe-v1\.js/g)||[]).length,1,'module P chỉ được nạp một lần');
console.log('assist-p-preview-safe-v1: OK');
