'use strict';
const assert=require('node:assert/strict');
const Cross=require('../ga-suggestion-cross-version-v1.js');

const entries=[
  {day:2,session:'Sáng',school:'THỦY PHƯƠNG Trụ sở chính: 25 DẠ LÊ',address:'G176'},
  {day:2,session:'Sáng',school:'THỦY PHƯƠNG Trụ sở chính: 25 DẠ LÊ',address:'H176'},
  {day:3,session:'Sáng',school:'THỦY DƯƠNG Trường chính: 40 Võ Duy Ninh',address:'P181'}
];
const v4Entries=[
  {day:2,session:'Chiều',school:'PHÚ BÌNH',schoolName:'PHÚ BÌNH',siteDisplay:'Cơ sở 2: PHÚ BÌNH CŨ',locationKey:'PHU BINH|CO SO 2: PHU BINH CU',address:'K85'},
  {day:2,session:'Chiều',school:'PHÚ BÌNH',schoolName:'PHÚ BÌNH',siteDisplay:'Cơ sở 2: PHÚ BÌNH CŨ',locationKey:'PHU BINH|CO SO 2: PHU BINH CU',address:'L85'}
];

const event=(ga,addresses,extra={})=>({ga,gaSource:'previous',addresses,...extra});

let plan=Cross.planGaApplications([event(2,['G176','H176'])],entries,{});
assert.equal(plan.apply.length,1);
assert.equal(plan.apply[0].target.locationKey,'THUY PHUONG TRU SO CHINH: 25 DA LE|');
assert.equal(plan.apply[0].target.legacyKey,'2|Sáng|THỦY PHƯƠNG Trụ sở chính: 25 DẠ LÊ');
assert.equal(plan.apply[0].ga,2);

plan=Cross.planGaApplications([event(2,['G176'])],entries,{'2|Sáng|THỦY PHƯƠNG Trụ sở chính: 25 DẠ LÊ':'3'});
assert.equal(plan.apply.length,0);
assert.equal(plan.conflicts.length,1);
assert.equal(plan.conflicts[0].reason,'existing-manual-ga');

plan=Cross.planGaApplications([event(2,['G176'])],entries,{'2|Sáng|THỦY PHƯƠNG Trụ sở chính: 25 DẠ LÊ':'2'});
assert.equal(plan.same.length,1);

plan=Cross.planGaApplications([event(2,['G176']),event(3,['H176'])],entries,{});
assert.equal(plan.apply.length,0);
assert.equal(plan.conflicts.length,1);
assert.equal(plan.conflicts[0].reason,'different-suggestions');

plan=Cross.planGaApplications([{ga:null,gaSource:'conflict',addresses:['G176']}],entries,{});
assert.equal(plan.skipped.length,1);

plan=Cross.planGaApplications([event(2,['UNKNOWN'])],entries,{});
assert.equal(plan.skipped.length,1);
assert.equal(plan.skipped[0].reason,'target-not-found');

// Regression cho giao diện hiện tại: Report Engine V4 lưu GA theo locationKey và dùng .lbg-r4-ga.
plan=Cross.planGaApplications([event(2,['K85','L85'])],v4Entries,{});
assert.equal(plan.apply.length,1);
assert.equal(plan.apply[0].target.key,'2|Chiều|PHU BINH|CO SO 2: PHU BINH CU');
assert.equal(plan.apply[0].target.school,'PHÚ BÌNH');

plan=Cross.planGaApplications([event(2,['K85'])],v4Entries,{'2|Chiều|PHU BINH|CO SO 2: PHU BINH CU':'2'});
assert.equal(plan.same.length,1);

plan=Cross.planGaApplications([event(2,['K85'])],v4Entries,{'2|Chiều|PHU BINH|CO SO 2: PHU BINH CU':'3'});
assert.equal(plan.conflicts.length,1);
assert.equal(plan.conflicts[0].reason,'existing-manual-ga');

console.log('OK GA apply planner: source-address mapping, Report Engine V4 location key, blank-only apply, manual protection, conflict guard');
