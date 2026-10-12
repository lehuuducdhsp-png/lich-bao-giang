'use strict';
const assert=require('node:assert/strict');
const V7=require('../ga-suggestion-v7.js');
const Per=require('../ga-per-class-v2.js');
const Safe=require('../ga-group-split-history-safe-v1.js');
const Repair=require('../ga-group-split-stale-repair-v1.js');
assert.equal(Safe.VERSION,'20261012.1');
assert.equal(Repair.VERSION,'20260920.1');

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


// Regression: một scope có KHỐI vẫn không được tăng GA nhiều lần trong cùng tuần.
const sameWeekScope=new Map([
  ['7T9',[
    {code:'HUỆ',day:2,session:'Sáng',period:1,teachingPeriod:1,locationKey:'THUY PHUONG|25 DA LE',schoolName:'THỦY PHƯƠNG',className:'KHỐI 2 (4 LỚP)',classRaw:'KHỐI 2 (4 LỚP)',address:'W1'},
    {code:'HUỆ',day:3,session:'Chiều',period:3,teachingPeriod:3,locationKey:'THUY PHUONG|25 DA LE',schoolName:'THỦY PHƯƠNG',className:'2/10',classRaw:'2/10',address:'W2'},
    {code:'HUỆ',day:5,session:'Sáng',period:4,teachingPeriod:4,locationKey:'THUY PHUONG|25 DA LE',schoolName:'THỦY PHƯƠNG',className:'2/10',classRaw:'2/10',address:'W3'}
  ]]
]);
const sameWeekDates={'7T9':new Date(2026,8,7,12)};
const sameWeekBook={worksheets:[{name:'7T9'}]};
const sameWeekParser={scanAssignments:ws=>sameWeekScope.get(ws.name)||[]};
const sameWeekWrapped=Safe.wrapBuildHistory(V7.buildHistory);
const sameWeekHistory=sameWeekWrapped(sameWeekBook,'7T9',{
  parser:sameWeekParser,roleResolver:()=> 'KNS',
  startDateFor:ws=>sameWeekDates[ws.name],weekLike:()=>true
});
assert.equal(sameWeekHistory.byAddress.get('7T9!W1').ga,1);
assert.equal(sameWeekHistory.byAddress.get('7T9!W2').ga,1,'group/split wrapper must preserve GA1 inside same week');
assert.equal(sameWeekHistory.byAddress.get('7T9!W3').ga,1,'repeated 2/10 in same week must never become GA2/GA4');
assert.equal(sameWeekHistory.byAddress.get('7T9!W3').gaSource,'same-week');


// 158 KHÚC THỪA DỤ – người dùng chốt chuyển lịch sử lớp cũ -> lớp mới từ 5T10.
const ktdLoc='THUY DUONG|PHAN HIEU|158 KHUC THUA DU';
const ktdEvent=extra=>({
  id:extra.id||Math.random().toString(36),
  sheet:extra.sheet,date:extra.date,dateKey:extra.dateKey||extra.sheet,
  day:extra.day||2,session:extra.session||'Sáng',period:extra.period||1,
  locationKey:ktdLoc,school:'THỦY DƯƠNG\nPhân hiệu: 158 Khúc Thừa Dụ',
  classDisplay:extra.classDisplay,classId:extra.classDisplay,grade:extra.grade,
  track:extra.track||'kns',members:extra.members||[],manualValues:new Set(),
  ga:null,gaSource:'',previousEvents:[],historyMismatch:false,partialHistory:false
});
assert.equal(Safe.historyIdentity(ktdEvent({grade:1,classDisplay:'1/6'}),'1/6'),'1/1');
assert.equal(Safe.historyIdentity(ktdEvent({grade:1,classDisplay:'1/7'}),'1/7'),'1/2');
assert.equal(Safe.historyIdentity(ktdEvent({grade:1,classDisplay:'1/8'}),'1/8'),'1/3');
assert.equal(Safe.historyIdentity(ktdEvent({grade:3,classDisplay:'3/5'}),'3/5'),'3/1');
assert.equal(Safe.historyIdentity(ktdEvent({grade:3,classDisplay:'3/6'}),'3/6'),'3/2');
assert.equal(Safe.historyIdentity(ktdEvent({grade:3,classDisplay:'3/7'}),'3/7'),'3/3');
assert.equal(Safe.historyIdentity(ktdEvent({grade:4,classDisplay:'4/6'}),'4/6'),'4/1');
assert.equal(Safe.historyIdentity(ktdEvent({grade:4,classDisplay:'4/7'}),'4/7'),'4/2');
assert.equal(Safe.historyIdentity(ktdEvent({grade:4,classDisplay:'4/8'}),'4/8'),'4/3');
assert.equal(Safe.historyIdentity(ktdEvent({grade:4,classDisplay:'4/9'}),'4/9'),'4/4');
assert.equal(Safe.historyIdentity(ktdEvent({grade:5,classDisplay:'5/5'}),'5/5'),'5/1');
assert.equal(Safe.historyIdentity(ktdEvent({grade:5,classDisplay:'5/6'}),'5/6'),'5/2');
assert.equal(Safe.historyIdentity(ktdEvent({grade:5,classDisplay:'5/7'}),'5/7'),'5/3');

// Cùng số lớp nhưng ở nơi khác tuyệt đối không được chuyển.
assert.equal(Safe.historyIdentity({
  school:'TRƯỜNG KHÁC',locationKey:'TRUONG KHAC|158 KHUC THUA DU',grade:1
},'1/6'),'1/6');

// KNS: KHỐI 1 GA1 -> lớp cũ GA2 -> 1/6 kế thừa thành GA4 -> tuần sau GA5.
const ktdKns={events:[
  ktdEvent({id:'g1',sheet:'7T9',date:new Date(2026,8,7,12),grade:1,track:'kns',classDisplay:'KHỐI 1 (3 LỚP)',members:[]}),
  ktdEvent({id:'o11',sheet:'14T9',date:new Date(2026,8,14,12),grade:1,track:'kns',classDisplay:'1/1',members:['1/1'],period:1}),
  ktdEvent({id:'o12',sheet:'14T9',date:new Date(2026,8,14,12),grade:1,track:'kns',classDisplay:'1/2',members:['1/2'],period:2}),
  ktdEvent({id:'o13',sheet:'14T9',date:new Date(2026,8,14,12),grade:1,track:'kns',classDisplay:'1/3',members:['1/3'],period:3}),
  ktdEvent({id:'n16a',sheet:'5T10',date:new Date(2026,9,5,12),grade:1,track:'kns',classDisplay:'1/6',members:['1/6'],period:1}),
  ktdEvent({id:'n17a',sheet:'5T10',date:new Date(2026,9,5,12),grade:1,track:'kns',classDisplay:'1/7',members:['1/7'],period:2}),
  ktdEvent({id:'n18a',sheet:'5T10',date:new Date(2026,9,5,12),grade:1,track:'kns',classDisplay:'1/8',members:['1/8'],period:3}),
  ktdEvent({id:'n16b',sheet:'12T10',date:new Date(2026,9,12,12),grade:1,track:'kns',classDisplay:'1/6',members:['1/6'],period:1})
],warnings:[]};
Safe.reconcileHistory(ktdKns);
assert.equal(ktdKns.events[0].ga,1);
assert.ok(ktdKns.events.slice(1,4).every(e=>e.ga===2));
assert.ok(ktdKns.events.slice(4,7).every(e=>e.ga===4),'lớp mới phải nối KNS từ lớp cũ, không khởi động lại GA1');
assert.equal(ktdKns.events[7].ga,5);
assert.deepEqual(ktdKns.events[4].__lbgTransferredClassHistory,[{from:'1/1',to:'1/6'}]);
assert.equal(ktdKns.__lbgClassTransfer158KhucThuaDu,'20261012.1');

// STEM phải chuyển độc lập với KNS: 1/1 STEM GA3 -> GA6, 1/6 tiếp theo = GA13.
const ktdStem={events:[
  ktdEvent({id:'s-old-1',sheet:'21T9',date:new Date(2026,8,21,12),grade:1,track:'stem',classDisplay:'1/1',members:['1/1']}),
  ktdEvent({id:'s-old-2',sheet:'28T9',date:new Date(2026,8,28,12),grade:1,track:'stem',classDisplay:'1/1',members:['1/1']}),
  ktdEvent({id:'s-new',sheet:'19T10',date:new Date(2026,9,19,12),grade:1,track:'stem',classDisplay:'1/6',members:['1/6']})
],warnings:[]};
Safe.reconcileHistory(ktdStem);
assert.deepEqual(ktdStem.events.map(e=>e.ga),[3,6,13]);
assert.equal(ktdStem.events[2].gaSource,'previous');

console.log('OK GA group/split: KHỐI 1 = toàn bộ lớp 1; tách/gộp kế thừa GA và sửa an toàn GA1 tự lưu cũ.');
