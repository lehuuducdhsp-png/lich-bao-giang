'use strict';
const assert=require('node:assert/strict');
const V7=require('../ga-suggestion-v7.js');
const Per=require('../ga-per-class-v2.js');
const Safe=require('../ga-group-split-history-safe-v1.js');
const Repair=require('../ga-group-split-stale-repair-v1.js');

assert.equal(Safe.wholeGradeFromText('KHỐI 1 (4 LỚP) - TIẾT 4'),1);
assert.equal(Safe.wholeGradeFromText('LỚP 1 (4 LỚP)'),1);
assert.equal(Safe.wholeGradeFromText('1/1 + 1/2'),null,'gộp vài lớp cụ thể không được hiểu là cả khối');

const loc='THUY DUONG|TRUONG CHINH';
const dates={
  '7T9':new Date(2026,8,7,12),
  '14T09':new Date(2026,8,14,12),
  '21T09':new Date(2026,8,21,12)
};
const startDateFor=ws=>dates[ws.name]||null;
const roleResolver=()=> 'KNS';

function build(scans,names,selected,manualResolver){
  const worksheets=names.map(name=>({name}));
  const parser={scanAssignments:ws=>scans.get(ws.name)||[]};
  const wrapped=Safe.wrapBuildHistory(V7.buildHistory);
  return wrapped({worksheets},selected,{parser,roleResolver,startDateFor,weekLike:()=>true,manualResolver});
}

const groupThenSplit=new Map([
  ['7T9',[
    {code:'THANH',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'KHỐI 1 (4 LỚP) - TIẾT 4',classRaw:'KHỐI 1 (4 LỚP) - TIẾT 4',address:'G10'}
  ]],
  ['14T09',[
    {code:'THANH',day:3,session:'Sáng',period:1,teachingPeriod:1,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/1',classRaw:'1/1',address:'G20'},
    {code:'THANH',day:3,session:'Sáng',period:2,teachingPeriod:2,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/2',classRaw:'1/2',address:'G21'},
    {code:'THANH',day:3,session:'Sáng',period:3,teachingPeriod:3,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/3',classRaw:'1/3',address:'G22'},
    {code:'THANH',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/4',classRaw:'1/4',address:'G23'}
  ]]
]);

let history=build(groupThenSplit,['7T9','14T09'],'14T09');
let current=history.events.filter(e=>e.sheet==='14T09');
assert.deepEqual(current.map(e=>[e.classDisplay,e.ga,e.gaSource]),[
  ['1/1',2,'previous'],['1/2',2,'previous'],['1/3',2,'previous'],['1/4',2,'previous']
]);
assert.ok(current.every(e=>e.__lbgInheritedFromWholeGrade),'lớp tách phải biết mốc trước đến từ cả khối');

const splitGroupSplit=new Map([
  ['7T9',[
    {code:'THANH',day:3,session:'Sáng',period:1,teachingPeriod:1,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/1',classRaw:'1/1',address:'A1'},
    {code:'THANH',day:3,session:'Sáng',period:2,teachingPeriod:2,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/2',classRaw:'1/2',address:'A2'},
    {code:'THANH',day:3,session:'Sáng',period:3,teachingPeriod:3,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/3',classRaw:'1/3',address:'A3'},
    {code:'THANH',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/4',classRaw:'1/4',address:'A4'}
  ]],
  ['14T09',[
    {code:'THANH',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'KHỐI 1 (4 LỚP) - TIẾT 4',classRaw:'KHỐI 1 (4 LỚP) - TIẾT 4',address:'B4'}
  ]],
  ['21T09',[
    {code:'THANH',day:3,session:'Sáng',period:1,teachingPeriod:1,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/1',classRaw:'1/1',address:'C1'},
    {code:'THANH',day:3,session:'Sáng',period:2,teachingPeriod:2,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/2',classRaw:'1/2',address:'C2'},
    {code:'THANH',day:3,session:'Sáng',period:3,teachingPeriod:3,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/3',classRaw:'1/3',address:'C3'},
    {code:'THANH',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/4',classRaw:'1/4',address:'C4'}
  ]]
]);
history=build(splitGroupSplit,['7T9','14T09','21T09'],'21T09');
const grouped=history.events.find(e=>e.sheet==='14T09');
assert.equal(grouped.ga,2,'gộp cả khối sau các lớp GA1 phải thành GA2');
current=history.events.filter(e=>e.sheet==='21T09');
assert.ok(current.every(e=>e.ga===4),'sau lần gộp GA2, tách lại phải đi tiếp GA4 cho từng lớp');

// Regression theo ảnh người dùng: bản cũ đã từng tự lưu GA1 ở tuần tách.
// Lịch sử KHỐI 1 tuần 7T9 vẫn phải thắng giá trị GA1 tự lưu cũ và đưa lớp tách lên GA2.
const staleManual=(e,ws)=>ws.name==='14T09'?1:null;
history=build(groupThenSplit,['7T9','14T09'],'14T09',staleManual);
history=Repair.repairHistory(history);
current=history.events.filter(e=>e.sheet==='14T09');
assert.ok(current.every(e=>e.ga===2&&e.gaSource==='previous'),'GA1 tự lưu cũ không được che lịch sử KHỐI 1 -> GA2');
assert.ok(current.every(e=>e.__lbgStaleGroupSplitManual===1),'phải đánh dấu đúng GA1 cũ để migration có điều kiện');

const staleValues={[Per.gaKey(3,'Sáng',loc)]:'1'};
for(const entry of groupThenSplit.get('14T09')){
  const classKey=Per.entryClassKey(entry,V7.normalizeClass);
  staleValues[Per.classGaKey(3,'Sáng',loc,classKey)]='1';
}
let plan=Per.planApplications(current,groupThenSplit.get('14T09'),staleValues,V7.normalizeClass);
assert.equal(plan.conflicts.length,4,'trước migration, 4 GA lớp cũ phải được nhận diện là xung đột');
plan=Repair.promoteSafeLegacyConflicts(plan,staleValues);
assert.equal(plan.conflicts.length,0,'GA lớp cũ trùng GA chung được phép sửa an toàn');
assert.equal(plan.apply.filter(x=>x.replaceExisting).length,4);
const written=Repair.applyPlanWithSafeLegacy(Per,plan,staleValues);
assert.equal(written.applied,4);
for(const entry of groupThenSplit.get('14T09')){
  const classKey=Per.entryClassKey(entry,V7.normalizeClass);
  assert.equal(written.values[Per.classGaKey(3,'Sáng',loc,classKey)],'2');
}

// Nếu GA lớp khác GA chung thì phải tiếp tục bảo vệ, không tự ghi đè.
const protectedValues={...staleValues,[Per.classGaKey(3,'Sáng',loc,'1/1')]:'4'};
const onePlan=Per.planApplications([current[0]],groupThenSplit.get('14T09'),protectedValues,V7.normalizeClass);
const promotedProtected=Repair.promoteSafeLegacyConflicts(onePlan,protectedValues);
assert.equal(promotedProtected.conflicts.length,1,'override riêng khác GA chung phải được giữ nguyên');

console.log('OK GA group/split: KHỐI 1 = toàn bộ lớp 1; tách/gộp kế thừa GA và sửa an toàn GA1 tự lưu cũ.');
