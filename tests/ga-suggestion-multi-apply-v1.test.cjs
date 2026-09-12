'use strict';
const assert=require('node:assert/strict');
const Cross=require('../ga-suggestion-cross-version-v1.js');
const Multi=require('../ga-suggestion-multi-apply-v1.js');

const entries=[
  {day:2,session:'Sáng',schoolName:'THỦY PHƯƠNG',siteDisplay:'Trụ sở chính: 25 DẠ LÊ',locationKey:'THUY PHUONG|TRU SO CHINH 25 DA LE',address:'G176'},
  {day:3,session:'Chiều',schoolName:'THỦY DƯƠNG',siteDisplay:'Phân hiệu: 158 Khúc Thừa Dụ',locationKey:'THUY DUONG|PHAN HIEU 158 KHUC THUA DU',address:'P181'}
];
const event=(ga,addresses)=>({ga,gaSource:'previous',addresses});

let values={};
let plan=Cross.planGaApplications([event(2,['G176'])],entries,values);
let write=Multi.applyPlanToValues(plan,values);
assert.equal(write.applied,1);
assert.equal(write.values['2|Sáng|THUY PHUONG|TRU SO CHINH 25 DA LE'],'2');

// GA đã nhập tay theo khóa V4 phải được bảo vệ.
values={'2|Sáng|THUY PHUONG|TRU SO CHINH 25 DA LE':'4'};
plan=Cross.planGaApplications([event(2,['G176'])],entries,values);
assert.equal(plan.apply.length,0);
assert.equal(plan.conflicts.length,1);
write=Multi.applyPlanToValues(plan,values);
assert.equal(write.applied,0);
assert.equal(write.values['2|Sáng|THUY PHUONG|TRU SO CHINH 25 DA LE'],'4');

// Khóa cũ theo tên trường cũng phải ngăn ghi đè.
const target=Cross.resolveApplyTarget(event(2,['G176']),entries).target;
values={[target.legacyKey]:'3'};
plan=Cross.planGaApplications([event(2,['G176'])],entries,values);
assert.equal(plan.apply.length,0);
assert.equal(plan.conflicts.length,1);

// Hai giáo viên / hai báo giảng độc lập có thể cùng được áp dụng trong một lượt batch.
const valuesA={},valuesB={};
const planA=Cross.planGaApplications([event(2,['G176'])],entries,valuesA);
const planB=Cross.planGaApplications([event(5,['P181'])],entries,valuesB);
const outA=Multi.applyPlanToValues(planA,valuesA);
const outB=Multi.applyPlanToValues(planB,valuesB);
assert.equal(outA.applied+outB.applied,2);
assert.equal(valuesA['2|Sáng|THUY PHUONG|TRU SO CHINH 25 DA LE'],'2');
assert.equal(valuesB['3|Chiều|THUY DUONG|PHAN HIEU 158 KHUC THUA DU'],'5');

assert.equal(Multi.storageKey('abc','14T09','THANH'),'lbgGaManualV2:abc:14T09:THANH');
console.log('OK GA multi apply: V4 keys, legacy/manual protection, independent multi-teacher writes');
