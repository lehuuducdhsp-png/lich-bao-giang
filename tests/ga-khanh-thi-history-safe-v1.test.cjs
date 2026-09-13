'use strict';
const assert=require('node:assert/strict');
const V7=require('../ga-suggestion-v7.js');
const Per=require('../ga-per-class-v2.js');
const Safe=require('../ga-per-class-history-safe-v1.js');

const loc='PHU THUAN|';
const ws7={name:'7T9'};
const ws14={name:'14T09'};
const scans=new Map([
  ['7T9',[
    {code:'K.THI',day:5,session:'Chiều',period:3,teachingPeriod:3,locationKey:loc,schoolName:'PHÚ THUẬN',className:'2/2',classRaw:'2/2',address:'AL141'}
  ]],
  ['14T09',[
    {code:'K.THI',day:5,session:'Chiều',period:1,teachingPeriod:1,locationKey:loc,schoolName:'PHÚ THUẬN',className:'2/1',classRaw:'2/1',address:'AJ141'},
    {code:'K.THI',day:5,session:'Chiều',period:2,teachingPeriod:2,locationKey:loc,schoolName:'PHÚ THUẬN',className:'2/4',classRaw:'2/4',address:'AK141'},
    {code:'K.THI',day:5,session:'Chiều',period:3,teachingPeriod:3,locationKey:loc,schoolName:'PHÚ THUẬN',className:'2/2',classRaw:'2/2',address:'AL141'}
  ]]
]);
const parser={scanAssignments:ws=>scans.get(ws.name)||[]};
const startDateFor=ws=>ws.name==='7T9'?new Date(2026,8,7,12):new Date(2026,8,14,12);

// Mô phỏng trạng thái gây lỗi: đầu khối PHÚ THUẬN đang có GA 2 chung.
// GA 2 chung KHÔNG được coi là manual GA 2 của cả 2/1 và 2/4.
const commonValues={[Per.gaKey(5,'Chiều',loc)]:'2'};
const noisyResolver=(e,ws)=>ws.name==='14T09'?2:null;
const safeResolver=Safe.sanitizeManualResolver(noisyResolver,'14T09',()=>commonValues,Per,V7.normalizeClass);

for(const e of scans.get('14T09')){
  assert.equal(safeResolver(e,ws14),null,'GA chung đầu khối không được ép thành manual GA cho từng lớp');
}

const history=V7.buildHistory({worksheets:[ws7,ws14]},'14T09',{
  parser,
  roleResolver:()=> 'KNS',
  startDateFor,
  weekLike:()=>true,
  manualResolver:safeResolver
});

const current=history.events.filter(e=>e.sheet==='14T09');
const byClass=new Map(current.map(e=>[e.classDisplay,e]));
assert.equal(byClass.get('2/1')?.ga,1,'2/1 chưa có lịch sử => GA 1');
assert.equal(byClass.get('2/4')?.ga,1,'2/4 chưa có lịch sử => GA 1');
assert.equal(byClass.get('2/2')?.ga,2,'2/2 đã dạy tuần trước => GA 2');

const entries=scans.get('14T09');
const rows=current.map(e=>({ga:e.ga,gaSource:e.gaSource,addresses:e.addresses,classId:e.classId,classDisplay:e.classDisplay}));
const plan=Per.planApplications(rows,entries,commonValues,V7.normalizeClass);
assert.equal(plan.same.length,1,'2/2 đang khớp GA chung 2');
assert.equal(plan.apply.length,2,'2/1 và 2/4 phải được tạo GA lớp riêng 1');
assert.deepEqual(plan.apply.map(x=>x.ga).sort(),[1,1]);

const written=Per.applyPlan(plan,commonValues);
assert.equal(written.applied,2);
const profile=Per.buildProfiles(entries,written.values,V7.normalizeClass)[0];
assert.equal(profile.header,1,'đa số lớp 2/1,2/4 dùng GA1 => đầu khối GA1');
assert.equal(profile.classes.get('2/2').ga,2);
assert.equal(profile.classes.get('2/2').annotate,true,'2/2 phải hiện riêng (GA 2)');

// Nếu có GA riêng thật sự của một lớp thì vẫn phải tôn trọng.
const class2Key=Per.classGaKey(5,'Chiều',loc,'2/2');
const exactValues={...commonValues,[class2Key]:'4'};
assert.equal(Safe.classSpecificManualValue(exactValues,entries[2],Per,V7.normalizeClass),4);

console.log('OK Khánh Thi: PHÚ THUẬN 2/1=GA1, 2/4=GA1, 2/2=GA2; header GA1, minority 2/2 annotated.');
