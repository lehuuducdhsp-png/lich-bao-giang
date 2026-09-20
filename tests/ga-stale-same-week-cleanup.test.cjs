'use strict';
const assert=require('node:assert/strict');
const V7=require('../ga-suggestion-v7.js');
const R=require('../ga-role-track-stale-repair-v1.js');
const Per=require('../ga-per-class-v2.js');

assert.equal(R.VERSION,'20260920.3');
assert.equal(Per.VERSION,'20260920.4');

const sheet={name:'7T9'};
const entries=[
  // 3/9 xuất hiện 2 lần trong tuần: thuật toán cũ sẽ làm GA1 -> GA2.
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:2,session:'Sáng',period:5,teachingPeriod:5,locationKey:'THUY_PHUONG|25_DA_LE',locationLabel:'THỦY PHƯƠNG',schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'A1'},
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:5,teachingPeriod:5,locationKey:'THUY_PHUONG|25_DA_LE',locationLabel:'THỦY PHƯƠNG',schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'A2'},
  // 2/10 xuất hiện 3 lần trong tuần: thuật toán cũ sẽ làm GA1 -> GA2 -> GA4.
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:2,session:'Sáng',period:4,teachingPeriod:4,locationKey:'THUY_PHUONG|25_DA_LE',locationLabel:'THỦY PHƯƠNG',schoolName:'THỦY PHƯƠNG',className:'2/10',classRaw:'2/10',address:'B1'},
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:'THUY_PHUONG|25_DA_LE',locationLabel:'THỦY PHƯƠNG',schoolName:'THỦY PHƯƠNG',className:'2/10',classRaw:'2/10',address:'B2'},
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:4,teachingPeriod:4,locationKey:'THUY_PHUONG|25_DA_LE',locationLabel:'THỦY PHƯƠNG',schoolName:'THỦY PHƯƠNG',className:'2/10',classRaw:'2/10',address:'B3'}
];
const parser={scanAssignments(){return entries}};
const book={worksheets:[sheet]};
const selectedEntries=entries.filter(e=>e.day===5);
const loc=Per.locOf(selectedEntries[0]).key;
const commonKey=Per.gaKey(5,'Sáng',loc);
const key39=Per.classGaKey(5,'Sáng',loc,'3/9');
const key210=Per.classGaKey(5,'Sáng',loc,'2/10');
const values={[commonKey]:'1',[key39]:'2',[key210]:'4'};

function resolver({classSpecific}){
  return e=>{
    if(Number(e.day)!==5)return null;
    const classId=Per.entryClassKey(e,V7.normalizeClass);
    if(classSpecific){
      const own=values[Per.classGaKey(5,'Sáng',String(e.locationKey),classId)];
      if(own!==undefined)return Number(own);
    }
    return Number(values[commonKey]);
  };
}
const opts={parser,roleResolver:()=> 'KNS',startDateFor:()=>new Date(2026,8,7,12),weekLike:()=>true};
const history=V7.buildHistory(book,'7T9',{...opts,manualResolver:resolver({classSpecific:true})});
const canonical=V7.buildHistory(book,'7T9',{...opts,manualResolver:resolver({classSpecific:false})});

const ev39=canonical.byAddress.get('7T9!A2');
const ev210=canonical.byAddress.get('7T9!B3');
assert.equal(ev39.ga,1);
assert.equal(ev210.ga,1);

const legacy39=R.sameWeekLegacyCandidate(canonical,ev39,1);
const legacy210=R.sameWeekLegacyCandidate(canonical,ev210,1);
assert.equal(legacy39.count,1);
assert.equal(legacy39.candidate,2,'3/9 GA2 phải khớp đúng dấu vân tay thuật toán cũ');
assert.equal(legacy210.count,2);
assert.equal(legacy210.candidate,4,'2/10 GA4 phải khớp đúng dấu vân tay thuật toán cũ');

const repaired=Per.markVerifiedStaleClassOverridesFromValues(
  history,canonical,'7T9',selectedEntries,values,V7.normalizeClass,R
);
assert.equal(repaired,2,'cả GA2 và GA4 cũ cùng-tuần phải được xác minh stale');

const row39=history.byAddress.get('7T9!A2');
const row210=history.byAddress.get('7T9!B3');
assert.equal(row39.ga,1);
assert.equal(row210.ga,1);
assert.equal(row39.__lbgStaleRepairReason,'legacy-same-week-increment');
assert.equal(row210.__lbgStaleRepairReason,'legacy-same-week-increment');
assert.equal(row39.__lbgStaleRoleTrackVerified,true);
assert.equal(row210.__lbgStaleRoleTrackVerified,true);

const plan=Per.verifiedStaleOnlyPlan([row39,row210],selectedEntries,values,V7.normalizeClass);
assert.equal(plan.apply.length,2);
const write=Per.applyPlan(plan,values);
assert.equal(write.values[key39],'1');
assert.equal(write.values[key210],'1');
assert.equal(write.values[commonKey],'1');

const backup=Per.buildRepairBackup(values,plan);
assert.equal(backup.values[key39],'2');
assert.equal(backup.values[key210],'4');
assert.equal(backup.replacements.length,2);
assert.ok(backup.replacements.every(x=>x.repairReason==='legacy-same-week-increment'));

// Một GA riêng không khớp đúng thuật toán cũ phải được bảo vệ.
const manualValues={[commonKey]:'1',[key39]:'5'};
const manualHistory=V7.buildHistory(book,'7T9',{...opts,manualResolver:e=>{
  if(Number(e.day)!==5)return null;
  if(Per.entryClassKey(e,V7.normalizeClass)==='3/9')return 5;
  return 1;
}});
const manualCanonical=canonical;
const manualRepaired=Per.markVerifiedStaleClassOverridesFromValues(
  manualHistory,manualCanonical,'7T9',[selectedEntries.find(e=>e.className==='3/9')],manualValues,V7.normalizeClass,R
);
assert.equal(manualRepaired,0,'GA tay không khớp dấu vân tay thuật toán cũ phải được bảo vệ');
const manualPlan=Per.planApplications(
  [manualHistory.byAddress.get('7T9!A2')],
  [selectedEntries.find(e=>e.className==='3/9')],
  manualValues,V7.normalizeClass
);
assert.equal(manualPlan.apply.length,0);
assert.equal(manualPlan.conflicts.length,0);
assert.equal(manualPlan.same.length,1,'GA tay không khớp mẫu cũ phải được giữ nguyên, không tạo repair');

console.log('OK stale same-week cleanup: 3/9 GA2 and 2/10 GA4 -> GA1; backup created; unrelated manual GA protected');
