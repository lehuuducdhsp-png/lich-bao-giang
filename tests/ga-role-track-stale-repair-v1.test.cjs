'use strict';
const assert=require('node:assert/strict');
const V7=require('../ga-suggestion-v7.js');
const R=require('../ga-role-track-stale-repair-v1.js');

assert.equal(R.VERSION,'20260919.1');
assert.equal(V7.roleTrack('STEM').track,'stem');
assert.equal(V7.roleTrack('KNS').track,'kns');

// Ca thực tế lớp 3/9 tại THỦY PHƯƠNG:
// 7T9 HUỆ (KNS) -> 14T9 HƯƠNG đỏ (STEM) -> 21T9 HUỆ (KNS).
// STEM ở giữa không được đẩy chuỗi KNS.
const sheets=[{name:'7T9'},{name:'14T9'},{name:'21T9'}];
const entriesBySheet={
  '7T9':[{
    code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:4,teachingPeriod:4,
    locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
    schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'AM176'
  }],
  '14T9':[{
    code:'HƯƠNG',teacherName:'Phan Thị Quý Hương',day:5,session:'Sáng',period:4,teachingPeriod:4,
    locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
    schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'AM170'
  }],
  '21T9':[{
    code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:4,teachingPeriod:4,
    locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
    schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'AM170'
  }]
};
const starts={
  '7T9':new Date(2026,8,7,12),
  '14T9':new Date(2026,8,14,12),
  '21T9':new Date(2026,8,21,12)
};
const parser={scanAssignments(ws){return entriesBySheet[ws.name]||[]}};
const roleResolver=(ws,code)=>code==='HƯƠNG'?'STEM':'KNS';
const history=V7.buildHistory({worksheets:sheets},'21T9',{
  parser,roleResolver,startDateFor:ws=>starts[ws.name],weekLike:()=>true
});
const kns=history.events.filter(x=>x.track==='kns');
const stem=history.events.filter(x=>x.track==='stem');
assert.deepEqual(kns.map(x=>x.ga),[1,2],'HUỆ KNS 7T9 -> 21T9 must be GA1 -> GA2');
assert.deepEqual(stem.map(x=>x.ga),[3],'HƯƠNG red STEM 14T9 must live on the separate STEM sequence');
assert.equal(history.byAddress.get('21T9!AM170')?.ga,2);

// Giả lập GA4 cũ đã được lưu trước khi tách đúng STEM/KNS.
const prev=kns[0],current=kns[1],middle=stem[0];
current.ga=4;
current.gaSource='manual';
current.previousEvents=[prev];
const staleHistory={events:[prev,middle,current]};
R.repairHistory(staleHistory);
assert.equal(current.ga,2,'stale GA4 must be repaired to canonical KNS GA2');
assert.equal(current.__lbgStaleRoleTrackManual,4);
assert.equal(current.__lbgRoleTrackExpected,2);
assert.equal(current.__lbgOppositeTrackEvents.length,1);

// Chỉ tự ghi đè khi GA chung hiện tại đã đúng bằng GA2.
// Đây chính là ca ảnh người dùng: header THỦY PHƯƠNG GA2 nhưng lớp 3/9 còn GA4.
const target={key:'@CLASS|5|Sáng|THUY PHUONG|25 DA LE|3/9',defaultKey:'5|Sáng|THUY PHUONG|25 DA LE',legacyKey:'5|Sáng|THỦY PHƯƠNG'};
const values={
  [target.key]:'4',
  [target.defaultKey]:'2'
};
const plan={
  apply:[],same:[],skipped:[],
  conflicts:[{target,ga:2,current:'4',items:[{ev:current,ga:2}],reason:'existing-class-ga'}]
};
const promoted=R.promoteSafeRoleTrackConflicts(plan,values);
assert.equal(promoted.conflicts.length,0);
assert.equal(promoted.apply.length,1);
assert.equal(promoted.apply[0].replaceExisting,true);
assert.equal(promoted.apply[0].reason,'stale-role-track-mix');

// Nếu GA chung không xác nhận GA2 thì vẫn bảo vệ GA lớp, không tự sửa.
const protectedPlan=R.promoteSafeRoleTrackConflicts(plan,{...values,[target.defaultKey]:'5'});
assert.equal(protectedPlan.apply.length,0);
assert.equal(protectedPlan.conflicts.length,1);

console.log('OK GA role-track repair: red HƯƠNG stays STEM; lớp 3/9 KNS is GA2 and stale GA4 only repairs under safe common-GA evidence');
