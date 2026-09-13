'use strict';
const assert=require('node:assert/strict');
const Fix=require('../tkb-class-typo-fix-v1.js');

assert.deepEqual(Fix.normalizeLeadingSlashClass('/31'),{source:'/31',value:'3/1',changed:true});
assert.deepEqual(Fix.normalizeLeadingSlashClass('/24'),{source:'/24',value:'2/4',changed:true});
assert.equal(Fix.normalizeLeadingSlashClass('3/1').changed,false);
assert.equal(Fix.normalizeLeadingSlashClass('/61').changed,false,'khối ngoài tiểu học không được tự sửa');
assert.equal(Fix.normalizeLeadingSlashClass('/310').changed,false,'mẫu mơ hồ không được tự sửa');
assert.equal(Fix.normalizeLeadingSlashClass('31').changed,false,'không có dấu / đầu thì giữ nguyên');

const entry=Fix.normalizeEntry({address:'H31',classRaw:'/31',className:'/31',classType:'unknown',classCount:1});
assert.equal(entry.classRaw,'3/1');
assert.equal(entry.className,'3/1');
assert.equal(entry.classType,'single');
assert.equal(entry.classSourceRaw,'/31');
assert.equal(entry.classTypoNormalized,true);

const analysis=Fix.normalizeAnalysis({
  entries:[{address:'H31',classRaw:'/31',className:'/31',classType:'unknown',classCount:1}],
  warnings:['Lớp/nhóm lớp tại ô H31 có định dạng cần kiểm tra: /31.','Một cảnh báo khác.']
});
assert.equal(analysis.entries[0].className,'3/1');
assert.deepEqual(analysis.warnings,['Một cảnh báo khác.']);

const untouched=Fix.normalizeEntry({classRaw:'KHỐI 3 (4 LỚP) - TIẾT 4',className:'KHỐI 3 (4 LỚP)'});
assert.equal(untouched.classRaw,'KHỐI 3 (4 LỚP) - TIẾT 4');

console.log('OK class typo fix: /31 -> 3/1, narrow elementary-only guard, source preserved');
