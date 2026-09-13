'use strict';
const assert=require('node:assert/strict');
const Cross=require('../ga-suggestion-cross-version-v1.js');
const Per=require('../ga-per-class-v2.js');
const Fix=require('../ga-mixed-class-batch-fix-v1.js');

const locationKey='PHU THUAN|TRUONG CHINH PHU THUAN CU';
const entries=[
  {day:5,session:'Chiều',schoolName:'PHÚ THUẬN',siteDisplay:'Trường chính: PHÚ THUẬN CŨ',locationKey,className:'2/1',classRaw:'2/1',address:'AJ141'},
  {day:5,session:'Chiều',schoolName:'PHÚ THUẬN',siteDisplay:'Trường chính: PHÚ THUẬN CŨ',locationKey,className:'2/4',classRaw:'2/4',address:'AK141'},
  {day:5,session:'Chiều',schoolName:'PHÚ THUẬN',siteDisplay:'Trường chính: PHÚ THUẬN CŨ',locationKey,className:'2/2',classRaw:'2/2',address:'AL141'}
];
const event=(ga,address,classId)=>({ga,gaSource:ga===1?'first':'previous',addresses:[address],classId,classDisplay:classId});
const rows=[event(1,'AJ141','2/1'),event(1,'AK141','2/4'),event(2,'AL141','2/2')];

// Đây chính là lỗi thực tế: planner cũ theo địa điểm gom cả ba gợi ý vào một ô,
// thấy GA 1 và GA 2 khác nhau nên báo conflict và không ghi gì.
const legacy=Cross.planGaApplications(rows,entries,{});
assert.equal(legacy.apply.length,0);
assert.equal(legacy.conflicts.length,1,'planner theo địa điểm phải tái hiện đúng lỗi cũ của Khánh Thi');

// Hotfix phải chuyển batch sang planner theo lớp: 3 lớp = 3 target riêng.
const planned=Fix.planMixedClassApplications(rows,entries,{},Per);
assert.equal(planned.apply.length,3);
assert.equal(planned.conflicts.length,0);

const out=Fix.applyMixedClassApplications(rows,entries,{},Per);
assert.equal(out.applied,3);
assert.equal(out.values[Per.classGaKey(5,'Chiều',locationKey,'2/1')],'1');
assert.equal(out.values[Per.classGaKey(5,'Chiều',locationKey,'2/4')],'1');
assert.equal(out.values[Per.classGaKey(5,'Chiều',locationKey,'2/2')],'2');

// Sau khi lưu theo lớp, phần hiển thị phải lấy GA 1 làm đa số và chú thích riêng 2/2 (GA 2).
const profile=Per.buildProfiles(entries,out.values)[0];
assert.equal(profile.header,1,'2 lớp GA1 phải thắng đa số 1 lớp GA2');
assert.equal(profile.tie,false);
assert.equal(profile.classes.get('2/1').annotate,false);
assert.equal(profile.classes.get('2/4').annotate,false);
assert.equal(profile.classes.get('2/2').annotate,true);
assert.equal(profile.classes.get('2/2').ga,2);

// Nếu đã có GA riêng của lớp thì tuyệt đối không ghi đè.
const protectedValues={
  [Per.classGaKey(5,'Chiều',locationKey,'2/2')]:'3'
};
const protectedOut=Fix.applyMixedClassApplications([event(2,'AL141','2/2')],entries,protectedValues,Per);
assert.equal(protectedOut.applied,0);
assert.equal(protectedOut.conflicts,1);
assert.equal(protectedOut.values[Per.classGaKey(5,'Chiều',locationKey,'2/2')],'3');

console.log('OK Khánh Thi mixed GA batch: 2/1=GA1, 2/4=GA1, 2/2=GA2 => header GA1 + 2/2 (GA2)');
