'use strict';
const assert=require('node:assert/strict');
const V7=require('../ga-suggestion-v7.js');
const R=require('../ga-role-track-stale-repair-v1.js');
const Per=require('../ga-per-class-v2.js');

assert.equal(V7.version,'20260920.1');
assert.equal(R.VERSION,'20260920.4');
assert.equal(Per.VERSION,'20260920.5');

// Kiến trúc bắt buộc: canonical history không được nhận manualResolver/storage.
let capturedOpts=null;
const fakeCross={
  buildHistoryAcrossSources(_base,_sources,_book,_sheet,opts){capturedOpts=opts;return{events:[],byAddress:new Map()}}
};
Per.buildCanonicalHistoryAcrossSources(
  fakeCross,V7,[],{worksheets:[]},'7T9',
  {parser:{scanAssignments(){return[]}},manualResolver(){return 99},roleResolver(){return'KNS'}}
);
assert.ok(capturedOpts);
assert.equal(capturedOpts.manualResolver,undefined,'storage/manual GA must never enter canonical history');

// Regression đúng ảnh người dùng:
// Tuần 7T9 tất cả KNS của 2/10 và 3/9 phải là GA1.
// Storage cũ vẫn đang giữ 2/10=GA4 và 3/9=GA2 từ thuật toán cũ.
const sheet={name:'7T9'};
const loc='THUY PHUONG|25 DA LE';
const entries=[
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:2,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',schoolName:'THỦY PHƯƠNG',className:'2/10',classRaw:'2/10',address:'A1'},
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:4,session:'Chiều',period:3,teachingPeriod:3,locationKey:loc,locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',schoolName:'THỦY PHƯƠNG',className:'2/10',classRaw:'2/10',address:'A2'},
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',schoolName:'THỦY PHƯƠNG',className:'2/10',classRaw:'2/10',address:'AL176'},
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:2,session:'Chiều',period:4,teachingPeriod:4,locationKey:loc,locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'B1'},
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:5,teachingPeriod:5,locationKey:loc,locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'AM176'}
];
const parser={scanAssignments(){return entries}};
const history=V7.buildHistory({worksheets:[sheet]},'7T9',{
  parser,
  roleResolver(){return'KNS'},
  startDateFor(){return new Date(2026,8,7,12)},
  weekLike(){return true}
});

assert.equal(history.byAddress.get('7T9!A1').ga,1);
assert.equal(history.byAddress.get('7T9!A2').ga,1,'9/9 2/10 must still be GA1');
assert.equal(history.byAddress.get('7T9!AL176').ga,1,'10/9 2/10 must still be GA1');
assert.equal(history.byAddress.get('7T9!B1').ga,1);
assert.equal(history.byAddress.get('7T9!AM176').ga,1,'10/9 3/9 must still be GA1');

const currentEntries=entries.filter(e=>e.day===5);
const commonKey=Per.gaKey(5,'Sáng',loc);
const key210=Per.classGaKey(5,'Sáng',loc,'2/10');
const key39=Per.classGaKey(5,'Sáng',loc,'3/9');
const stored={[commonKey]:'1',[key210]:'4',[key39]:'2'};

// Canonical remains GA1 regardless of stale stored values.
const repaired=Per.markVerifiedStaleClassOverridesFromValues(
  history,history,'7T9',currentEntries,stored,V7.normalizeClass,R
);
assert.equal(repaired,2,'both exact legacy same-week signatures must be recognized');

const ev210=history.byAddress.get('7T9!AL176');
const ev39=history.byAddress.get('7T9!AM176');
assert.equal(ev210.ga,1);
assert.equal(ev39.ga,1);
assert.equal(ev210.__lbgStaleRepairReason,'legacy-same-week-increment');
assert.equal(ev39.__lbgStaleRepairReason,'legacy-same-week-increment');
assert.equal(ev210.__lbgStaleRoleTrackVerified,true);
assert.equal(ev39.__lbgStaleRoleTrackVerified,true);

const plan=Per.verifiedStaleOnlyPlan([ev210,ev39],currentEntries,stored,V7.normalizeClass);
assert.equal(plan.apply.length,2);
assert.ok(plan.apply.every(x=>x.replaceExisting===true));
const written=Per.applyPlan(plan,stored);
assert.equal(written.values[key210],'1');
assert.equal(written.values[key39],'1');
assert.equal(written.values[commonKey],'1');

const backup=Per.buildRepairBackup(stored,plan);
assert.equal(backup.values[key210],'4');
assert.equal(backup.values[key39],'2');
assert.equal(backup.replacements.length,2);

// GA tay không khớp dấu vân tay thuật toán cũ phải được bảo vệ.
const manualStored={[commonKey]:'1',[key39]:'5'};
const cleanHistory=V7.buildHistory({worksheets:[sheet]},'7T9',{
  parser,roleResolver(){return'KNS'},startDateFor(){return new Date(2026,8,7,12)},weekLike(){return true}
});
const manualRepair=Per.markVerifiedStaleClassOverridesFromValues(
  cleanHistory,cleanHistory,'7T9',
  [currentEntries.find(e=>e.className==='3/9')],
  manualStored,V7.normalizeClass,R
);
assert.equal(manualRepair,0);
const manualPlan=Per.planApplications(
  [cleanHistory.byAddress.get('7T9!AM176')],
  [currentEntries.find(e=>e.className==='3/9')],
  manualStored,V7.normalizeClass
);
assert.equal(manualPlan.apply.length,0);
assert.equal(manualPlan.conflicts.length,1);

console.log('OK canonical storage separation: stale 2/10=GA4 and 3/9=GA2 never contaminate history; both repair to GA1 with backup');
