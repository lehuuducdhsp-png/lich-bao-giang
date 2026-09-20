'use strict';
const assert=require('node:assert/strict');
const V7=require('../ga-suggestion-v7.js');
const R=require('../ga-role-track-stale-repair-v1.js');
const Per=require('../ga-per-class-v2.js');

assert.equal(R.VERSION,'20260920.1');
assert.equal(Per.VERSION,'20260920.3');

const redCell={font:{color:{argb:'FFFF0000'}}};
const blackCell={font:{color:{argb:'FF000000'}}};
const sheets=[{name:'7T9'},{name:'14T9'},{name:'21T9'}];
const entriesBySheet={
  '7T9':[{
    code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:4,teachingPeriod:4,
    locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
    schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'AM176',row:176,col:39
  }],
  '14T9':[{
    code:'HƯƠNG',teacherName:'Phan Thị Quý Hương',day:5,session:'Sáng',period:4,teachingPeriod:4,
    locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
    schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'AM170',row:170,col:39
  }],
  '21T9':[{
    code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:4,teachingPeriod:4,
    locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
    schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'AM170',row:170,col:39
  }]
};
const starts={
  '7T9':new Date(2026,8,7,12),
  '14T9':new Date(2026,8,14,12),
  '21T9':new Date(2026,8,21,12)
};
const sheetCells={
  '7T9':{'AM176':blackCell},
  '14T9':{'AM170':redCell},
  '21T9':{'AM170':blackCell}
};
for(const ws of sheets){
  ws.getCell=(row,col)=>{
    const address=row===170&&col===39?'AM170':row===176&&col===39?'AM176':'';
    return sheetCells[ws.name]?.[address]||blackCell;
  };
}
const parser={scanAssignments(ws){return entriesBySheet[ws.name]||[]}};
const book={worksheets:sheets};
const safeBuild=R.wrapBuildHistory(V7.buildHistory);
const currentEntry=entriesBySheet['21T9'][0];
const loc=Per.locOf(currentEntry).key;
const classId=Per.entryClassKey(currentEntry,V7.normalizeClass);
const classKey=Per.classGaKey(5,'Sáng',loc,classId);
const commonKey=Per.gaKey(5,'Sáng',loc);

function resolver(values,{classSpecific=true}={}){
  return(e,ws)=>{
    if(ws?.name!=='21T9'||String(e?.code||'').toUpperCase()!=='HUỆ')return null;
    if(classSpecific){
      const own=values[Per.classGaKey(Number(e.day),String(e.session||''),String(e.locationKey||''),Per.entryClassKey(e,V7.normalizeClass))];
      if(own!==undefined&&own!==null&&String(own).trim()!=='')return Number(own);
    }
    const common=values[Per.gaKey(Number(e.day),String(e.session||''),String(e.locationKey||''))];
    return common===undefined||common===null||String(common).trim()===''?null:Number(common);
  };
}
function histories(values){
  const opts={parser,roleResolver:()=> 'KNS',startDateFor:ws=>starts[ws.name],weekLike:()=>true};
  return{
    history:safeBuild(book,'21T9',{...opts,manualResolver:resolver(values,{classSpecific:true})}),
    canonical:safeBuild(book,'21T9',{...opts,manualResolver:resolver(values,{classSpecific:false})})
  };
}
function currentEvent(history){return history.byAddress.get('21T9!AM170')}

// Dữ liệu thật cần sửa: GA chung THỦY PHƯƠNG = 2, nhưng class-key 3/9 còn GA4 cũ.
const staleValues={[commonKey]:'2',[classKey]:'4'};
let {history,canonical}=histories(staleValues);
assert.equal(currentEvent(history).ga,2,'role-track layer phải sửa gợi ý history về GA2');
assert.equal(currentEvent(history).__lbgStaleRoleTrackManual,4,'history phải nhớ GA4 cũ chỉ như một candidate stale');
assert.equal(currentEvent(history).__lbgStaleRoleTrackVerified,undefined,'candidate history chưa được phép ghi storage');
assert.equal(currentEvent(canonical).ga,2,'canonical bỏ class override nhưng giữ GA chung nên phải ra GA2');
assert.equal(currentEvent(canonical).track,'kns');
assert.equal(canonical.events.filter(x=>x.track==='stem').length,1,'14T9 HƯƠNG đỏ phải nằm riêng luồng STEM');

const repaired=Per.markVerifiedStaleClassOverridesFromValues(
  history,canonical,'21T9',[currentEntry],staleValues,V7.normalizeClass,R
);
assert.equal(repaired,1,'chỉ đúng class-key 3/9 stale mới được đánh dấu sửa');
const repairedEvent=currentEvent(history);
assert.equal(repairedEvent.ga,2);
assert.equal(repairedEvent.__lbgStaleRoleTrackManual,4);
assert.equal(repairedEvent.__lbgRoleTrackExpected,2);
assert.equal(repairedEvent.__lbgStaleRoleTrackCommon,2);
assert.equal(repairedEvent.__lbgStaleRoleTrackVerified,true,'chỉ core per-class sau đủ điều kiện mới cấp verified');

const plan=Per.planApplications([repairedEvent],[currentEntry],staleValues,V7.normalizeClass);
assert.equal(plan.conflicts.length,0);
assert.equal(plan.apply.length,1);
assert.equal(plan.apply[0].replaceExisting,true);
assert.equal(plan.apply[0].current,4);
assert.equal(plan.apply[0].ga,2);

const otherEntry={...currentEntry,className:'4/10',classRaw:'4/10',address:'AN170'};
const otherEvent={...repairedEvent,id:'other',addresses:['AN170'],classId:'4/10',classDisplay:'4/10',ga:3,gaSource:'previous'};
delete otherEvent.__lbgStaleRoleTrackManual;
delete otherEvent.__lbgRoleTrackExpected;
delete otherEvent.__lbgStaleRoleTrackCommon;
delete otherEvent.__lbgStaleRoleTrackVerified;
const broadPlan=Per.planApplications([repairedEvent,otherEvent],[currentEntry,otherEntry],staleValues,V7.normalizeClass);
assert.equal(broadPlan.apply.length,2,'kế hoạch thông thường có thể vừa sửa stale vừa điền lớp khác');
const selfHealPlan=Per.verifiedStaleOnlyPlan([repairedEvent,otherEvent],[currentEntry,otherEntry],staleValues,V7.normalizeClass);
assert.equal(selfHealPlan.apply.length,1,'self-heal chỉ được sửa stale đã verified, không tự điền GA trống');
assert.equal(selfHealPlan.apply[0].target.classKey,'3/9');

const write=Per.applyPlan(plan,staleValues);
assert.equal(write.applied,1);
assert.equal(write.replacedCount,1);
assert.equal(write.values[classKey],'2','storage thật phải đổi class-key 3/9 từ 4 thành 2');
assert.equal(write.values[commonKey],'2','GA chung THỦY PHƯƠNG phải được giữ nguyên GA2');

const profile=Per.buildProfiles([currentEntry],write.values,V7.normalizeClass)[0];
assert.equal(profile.header,2);
assert.equal(profile.classes.get(classId).ga,2);
assert.equal(profile.classes.get(classId).annotate,false,'sau sửa, 3/9 không được còn hiện (GA 4)');

// Mô phỏng reload: giá trị đã sửa phải ổn định, không tự quay lại GA4.
({history,canonical}=histories(write.values));
assert.equal(currentEvent(history).ga,2);
assert.equal(currentEvent(canonical).ga,2);
assert.equal(
  Per.markVerifiedStaleClassOverridesFromValues(history,canonical,'21T9',[currentEntry],write.values,V7.normalizeClass,R),
  0,
  'reload không được tạo thêm một stale repair giả'
);
const reloadPlan=Per.planApplications([currentEvent(history)],[currentEntry],write.values,V7.normalizeClass);
assert.equal(reloadPlan.apply.length,0);
assert.equal(reloadPlan.same.length,1);
assert.equal(reloadPlan.conflicts.length,0);

// Khóa an toàn 1: thiếu GA chung => không tự ghi đè class-GA cũ.
const noCommon={[classKey]:'4'};
({history,canonical}=histories(noCommon));
assert.equal(currentEvent(canonical).ga,2,'canonical vẫn suy ra GA2 từ lịch sử KNS');
assert.equal(
  Per.markVerifiedStaleClassOverridesFromValues(history,canonical,'21T9',[currentEntry],noCommon,V7.normalizeClass,R),
  0
);
assert.equal(currentEvent(history).ga,2,'history có thể gợi ý GA2 nhưng chưa được quyền ghi storage');
const noCommonPlan=Per.planApplications([currentEvent(history)],[currentEntry],noCommon,V7.normalizeClass);
assert.equal(noCommonPlan.apply.length,0);
assert.equal(noCommonPlan.conflicts.length,1,'thiếu GA chung phải khóa ghi đè class storage');
assert.equal(Per.applyPlan(noCommonPlan,noCommon).values[classKey],'4');

// Khóa an toàn 2: GA chung lệch canonical => không tự ghi đè.
const wrongCommon={[commonKey]:'5',[classKey]:'4'};
({history,canonical}=histories(wrongCommon));
assert.equal(
  Per.markVerifiedStaleClassOverridesFromValues(history,canonical,'21T9',[currentEntry],wrongCommon,V7.normalizeClass,R),
  0
);
const wrongCommonPlan=Per.planApplications([currentEvent(history)],[currentEntry],wrongCommon,V7.normalizeClass);
assert.equal(wrongCommonPlan.apply.length,0);
assert.equal(wrongCommonPlan.conflicts.length,1,'GA chung lệch canonical phải khóa ghi đè');
assert.equal(Per.applyPlan(wrongCommonPlan,wrongCommon).values[classKey],'4');

// Khóa an toàn 3: class-GA khác đúng mẫu nhiễm (ví dụ GA5) được coi là GA riêng, không sửa.
const manualDifferent={[commonKey]:'2',[classKey]:'5'};
({history,canonical}=histories(manualDifferent));
assert.equal(
  Per.markVerifiedStaleClassOverridesFromValues(history,canonical,'21T9',[currentEntry],manualDifferent,V7.normalizeClass,R),
  0
);
assert.equal(currentEvent(history).ga,5,'GA riêng không đúng mẫu nhiễm STEM/KNS phải được bảo vệ');

console.log('OK E2E 3/9: stored GA4 + common GA2 -> canonical GA2 -> class storage 4→2 -> reload stays GA2; manual guards preserved');
