'use strict';
const assert=require('node:assert/strict');
const V=require('../ga-suggestion-v7.js');
const Per=require('../ga-per-class-v2.js');

const loc='QUANG TRUNG|';
const entry=(sheet,cls,address,period)=>({
  code:'TIÊN',teacherName:'Hà Thị Thủy Tiên',day:5,session:'Chiều',period,teachingPeriod:period,
  schoolName:'QUANG TRUNG',school:'QUANG TRUNG',locationKey:loc,locationLabel:'QUANG TRUNG',
  classRaw:cls,className:cls,address
});
const w21={name:'21T9',entries:[
  entry('21T9','1/2','Q21_12',1),
  entry('21T9','2/2+2/4','Q21_224',2)
]};
const w28={name:'28T9',entries:[
  entry('28T9','1/2','Q28_12',1),
  entry('28T9','2/2+2/4','Q28_224',2)
]};
const starts={'21T9':new Date(2026,8,21,12),'28T9':new Date(2026,8,28,12)};
const history=V.buildHistory({worksheets:[w21,w28]},'28T9',{
  parser:{scanAssignments(ws){return ws.entries}},
  roleResolver(){return'KNS'},
  startDateFor(ws){return starts[ws.name]},
  weekLike(){return true}
});

const e12=history.byAddress.get('28T9!Q28_12');
const e224=history.byAddress.get('28T9!Q28_224');
assert.equal(e12.ga,4,'cô Tiên 1/2: 21T9 GA2 -> 28T9 GA4');
assert.equal(e224.ga,4,'cô Tiên 2/2+2/4: 21T9 GA2 -> 28T9 GA4');
assert.equal(e12.previousEvents[0].ga,2);
assert.equal(e12.previousEvents[0].gaSource,'quang-trung-21t9-anchor');

const commonKey=Per.gaKey(5,'Chiều',loc);
const stale={[commonKey]:'2'};
const plan=Per.verifiedQuangTrungCommonRepairPlan([e12,e224],w28.entries,stale,V.normalizeClass);
assert.equal(plan.apply.length,1,'GA chung cũ của đúng buổi QUANG TRUNG phải được xác minh để sửa một lần');
assert.equal(plan.apply[0].current,2);
assert.equal(plan.apply[0].ga,4);
assert.equal(plan.apply[0].replaceExisting,true);
assert.equal(plan.apply[0].reason,'quang-trung-21t9-common-anchor');
const fixed=Per.applyPlan(plan,stale);
assert.equal(fixed.values[commonKey],'4','ảnh/báo giảng cô Tiên phải hiện GA4 thay vì GA2');

// Có GA riêng thì không được tự sửa GA chung.
const classKey=Per.classGaKey(5,'Chiều',loc,'1/2');
assert.equal(Per.verifiedQuangTrungCommonRepairPlan([e12,e224],w28.entries,{[commonKey]:'2',[classKey]:'4'},V.normalizeClass).apply.length,0);

// Sai giá trị cũ hoặc không có dấu vân tay 21T9 anchor thì không được ghi đè.
assert.equal(Per.verifiedQuangTrungCommonRepairPlan([e12,e224],w28.entries,{[commonKey]:'5'},V.normalizeClass).apply.length,0);
const fake={...e12,previousEvents:[{...e12.previousEvents[0],gaSource:'manual'}]};
assert.equal(Per.verifiedQuangTrungCommonRepairPlan([fake],w28.entries,{[commonKey]:'2'},V.normalizeClass).apply.length,0);

// Nhóm trộn lớp 21T9 GA1 và GA2 không được ép chung lên GA4.
const mixed21={name:'21T9',entries:[
  entry('21T9','1/4+1/5','M21_145',1),
  entry('21T9','1/2','M21_12',2)
]};
const mixed28={name:'28T9',entries:[
  entry('28T9','1/4+1/5','M28_145',1),
  entry('28T9','1/2','M28_12',2)
]};
const mixed=V.buildHistory({worksheets:[mixed21,mixed28]},'28T9',{
  parser:{scanAssignments(ws){return ws.entries}},roleResolver(){return'KNS'},
  startDateFor(ws){return starts[ws.name]},weekLike(){return true}
});
assert.equal(mixed.byAddress.get('28T9!M28_145').ga,2);
assert.equal(mixed.byAddress.get('28T9!M28_12').ga,4);
assert.equal(Per.verifiedQuangTrungCommonRepairPlan(
  [mixed.byAddress.get('28T9!M28_145'),mixed.byAddress.get('28T9!M28_12')],
  mixed28.entries,{[commonKey]:'2'},V.normalizeClass
).apply.length,0,'nhóm có GA2 và GA4 phải giữ cơ chế GA theo lớp, không sửa common bừa');

console.log('OK Tien Quang Trung: stored common GA2 self-heals to GA4 only when 21T9 anchor proves all current classes advance 2 -> 4');
