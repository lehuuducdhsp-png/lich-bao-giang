'use strict';
const assert=require('node:assert/strict');
const V=require('../ga-suggestion-v7.js');

assert.equal(V.version,'20260930.2');
assert.equal(V.QUANG_TRUNG_GA_START,'2026-09-21');
assert.equal(V.QUANG_TRUNG_WEEK21_SHEET,'21T9');

const base=(cls,address,period)=>({
  code:'GV',teacherName:'Giáo viên',day:5,session:'Chiều',period,teachingPeriod:period,
  schoolName:'QUANG TRUNG',locationKey:'QUANG TRUNG|',locationLabel:'QUANG TRUNG',
  classRaw:cls,className:cls,address
});
const w21={name:'21T9',entries:[
  base('1/4+1/5','A145',1),
  base('2/5','A25',2),
  base('1/2','A12',3),
  base('1/6+1/7','A167',4),
  base('2/2+2/4','A224',5),
  {...base('1/1','A11',1),day:6},
  {...base('1/8','A18',2),day:6}
]};
const w28={name:'28T9',entries:[
  base('1/4+1/5','B145',1),
  base('2/5','B25',2),
  base('1/2','B12',3)
]};
const starts={'21T9':new Date(2026,8,21,12),'28T9':new Date(2026,8,28,12)};
const history=V.buildHistory({worksheets:[w21,w28]},'28T9',{
  parser:{scanAssignments(ws){return ws.entries}},
  roleResolver(){return'KNS'},
  startDateFor(ws){return starts[ws.name]},
  weekLike(){return true}
});

for(const address of ['A145','A25'])assert.equal(history.byAddress.get('21T9!'+address).ga,1,address+' phải GA1');
for(const address of ['A12','A167','A224','A11','A18'])assert.equal(history.byAddress.get('21T9!'+address).ga,2,address+' phải GA2');
assert.equal(history.byAddress.get('28T9!B145').ga,2,'1/4+1/5 phải nối GA1 → GA2');
assert.equal(history.byAddress.get('28T9!B25').ga,2,'2/5 phải nối GA1 → GA2');
assert.equal(history.byAddress.get('28T9!B12').ga,4,'1/2 phải nối GA2 → GA4');

const manualHistory=V.buildHistory({worksheets:[w21]},'21T9',{
  parser:{scanAssignments(ws){return ws.entries}},
  roleResolver(){return'KNS'},
  startDateFor(){return starts['21T9']},
  weekLike(){return true},
  manualResolver(e){return e.address==='A12'?1:e.address==='A145'?2:null}
});
assert.equal(manualHistory.byAddress.get('21T9!A12').ga,2,'mốc nghiệp vụ phải thắng manual resolver trong canonical history');
assert.equal(manualHistory.byAddress.get('21T9!A145').ga,1,'lớp ngoại lệ GA1 phải giữ đúng mốc nghiệp vụ');

const stemHistory=V.buildHistory({worksheets:[{name:'21T9',entries:[base('1/2','STEM12',1)]}]},'21T9',{
  parser:{scanAssignments(ws){return ws.entries}},
  roleResolver(){return'STEM'},
  startDateFor(){return starts['21T9']},
  weekLike(){return true}
});
assert.equal(stemHistory.byAddress.get('21T9!STEM12').ga,3,'STEM không được áp dụng mốc KNS Quang Trung');

console.log('OK Quang Trung 21T9: 1/4+1/5 + 2/5 = GA1; all other KNS classes = GA2; later weeks continue per class');
