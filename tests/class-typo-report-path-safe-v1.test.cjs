'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Safe=require('../class-typo-report-path-safe-v1.js');

assert.equal(Safe.VERSION,'20260916.1');
assert.equal(Safe.normalizeClassText('/31'),'3/1');
assert.equal(Safe.normalizeClassText('/24'),'2/4');
assert.equal(Safe.normalizeClassText('/31 (GA 2)'),'3/1 (GA 2)');
assert.equal(Safe.normalizeClassText('/ 3 1'),'3/1');
assert.equal(Safe.normalizeClassText('3/1'),'3/1');
assert.equal(Safe.normalizeClassText('31'),'31','thiếu dấu / đầu phải giữ nguyên');
assert.equal(Safe.normalizeClassText('3-1'),'3-1','dấu phân cách mơ hồ không được tự sửa');
assert.equal(Safe.normalizeClassText('3\\1'),'3\\1','dấu phân cách mơ hồ không được tự sửa');
assert.equal(Safe.normalizeClassText('/61'),'/61','khối ngoài tiểu học không được tự sửa');
assert.equal(Safe.normalizeClassText('/310'),'/310','mẫu mơ hồ không được tự sửa');

const entry={address:'H31',className:'/31',school:'VỸ DẠ'};
Safe.normalizeEntry(entry);
assert.equal(entry.className,'3/1');
assert.equal(entry.classRaw,'3/1');
assert.equal(entry.classSourceRaw,'/31');
assert.equal(entry.classType,'single');
assert.equal(entry.classTypoNormalized,true);

const decorated={className:'/31 (GA 2)',__lbgBaseClassName:'/31',classRaw:'/31'};
Safe.normalizeEntry(decorated);
assert.equal(decorated.className,'3/1 (GA 2)');
assert.equal(decorated.__lbgBaseClassName,'3/1');
assert.equal(decorated.classRaw,'3/1');

const report={entries:[{className:'/31'},{className:'31'},{className:'3-1'}]};
assert.equal(Safe.normalizeReport(report),report,'giữ nguyên object report để không phá tham chiếu multi-preview');
assert.deepEqual(report.entries.map(x=>x.className),['3/1','31','3-1']);

const index=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const typo=index.indexOf('tkb-class-typo-fix-v1.js?v=20260913.2');
const safe=index.indexOf('class-typo-report-path-safe-v1.js?v=20260916.1');
const cache=index.indexOf('tkb-assignment-cache-safe-v1.js?v=20260913.1');
assert.ok(typo>=0&&safe>typo&&cache>safe,'lớp an toàn phải nạp sau chuẩn hóa gốc và trước assignment cache');

const source=fs.readFileSync(path.join(__dirname,'..','class-typo-report-path-safe-v1.js'),'utf8');
assert.match(source,/wrapRender\(\)/,'phải chặn đường safeAnalyze -> render');
assert.match(source,/wrapAnalyze\(\)/,'phải chặn các đường analyzeNow dùng cho multi\/export');
assert.match(source,/wrapBefore\(perClass,'applyReport',0\)/,'GA per-class phải nhận lớp đã chuẩn hóa trước khi áp dụng');
assert.match(source,/wrapBefore\(engine,'addReportSheet',1\)/,'Excel engine phải nhận report đã chuẩn hóa');

console.log('OK class typo report path: /31 -> 3/1 across render, analyze, GA apply and Excel; ambiguous forms untouched');
