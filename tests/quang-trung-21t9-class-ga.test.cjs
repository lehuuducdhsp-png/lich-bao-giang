'use strict';
const assert=require('node:assert/strict');
const V=require('../ga-suggestion-v7.js');

assert.equal(V.version,'20261001.2');
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
  {...base('1/3','A13',1),day:4},
  {...base('2/6','A26',2),day:4},
  base('1/2','A12',3),
  base('1/6+1/7','A167',4),
  base('2/2+2/4','A224',5),
  {...base('1/1','A11',1),day:6},
  {...base('1/8','A18',2),day:6,code:'PHƯƠNG CTV',teacherName:'Thùy Dương',schoolName:'QUANG TRUNG',school:'QUANG TRUNG',locationKey:'QUANG TRUNG|',locationLabel:'QUANG TRUNG'}
]};
const w28={name:'28T9',entries:[
  base('1/4+1/5','B145',1),
  base('2/5','B25',2),
  {...base('1/3','B13',1),day:4},
  {...base('2/6','B26',2),day:4},
  base('1/2','B12',3)
]};
const starts={'21T9':new Date(2026,8,21,12),'28T9':new Date(2026,8,28,12)};
const history=V.buildHistory({worksheets:[w21,w28]},'28T9',{
  parser:{scanAssignments(ws){return ws.entries}},
  roleResolver(_ws,code,e){return e?.address==='A18'?'CTV':'KNS'},
  startDateFor(ws){return starts[ws.name]},
  weekLike(){return true}
});

for(const address of ['A145','A25','A13','A26'])assert.equal(history.byAddress.get('21T9!'+address).ga,1,address+' phải GA1');
for(const address of ['A12','A167','A224','A11','A18'])assert.equal(history.byAddress.get('21T9!'+address).ga,2,address+' phải GA2');
assert.equal(V.QUANG_TRUNG_WEEK21_GA2_KEYS.has('1/8'),true,'1/8 phải được khóa rõ ràng ở nhóm GA2 tuần 21T9');
assert.equal(history.byAddress.get('28T9!B145').ga,2,'1/4+1/5 phải nối GA1 → GA2');
assert.equal(history.byAddress.get('28T9!B25').ga,2,'2/5 phải nối GA1 → GA2');
assert.equal(history.byAddress.get('28T9!B13').ga,2,'1/3 phải nối GA1 → GA2');
assert.equal(history.byAddress.get('28T9!B26').ga,2,'2/6 phải nối GA1 → GA2');
assert.equal(history.byAddress.get('28T9!B12').ga,4,'1/2 phải nối GA2 → GA4');
assert.equal(history.byAddress.get('21T9!A18').track,'kns','1/8 có phân công CTV vẫn phải nằm trong luồng KNS');
assert.equal(history.byAddress.get('21T9!A18').school,'QUANG TRUNG','1/8 thuộc khối trường QUANG TRUNG, không được gán sang VỸ DẠ chỉ vì dòng phân công nằm sát ranh giới bên dưới');
assert.ok(history.byAddress.get('21T9!A18').participants.some(p=>p.code==='PHƯƠNG CTV'),'PHƯƠNG CTV là phân công giáo viên dưới lớp 1/8, không phải tên trường');
assert.match(V.basisText(history.byAddress.get('21T9!A18')),/1\/8.*GA 2/,'căn cứ phải nêu rõ lớp 1/8 là GA2');

const manualHistory=V.buildHistory({worksheets:[w21]},'21T9',{
  parser:{scanAssignments(ws){return ws.entries}},
  roleResolver(){return'KNS'},
  startDateFor(){return starts['21T9']},
  weekLike(){return true},
  manualResolver(e){return e.address==='A12'?1:e.address==='A145'?2:e.address==='A18'?1:null}
});
assert.equal(manualHistory.byAddress.get('21T9!A12').ga,2,'mốc nghiệp vụ phải thắng manual resolver trong canonical history');
assert.equal(manualHistory.byAddress.get('21T9!A145').ga,1,'lớp ngoại lệ GA1 phải giữ đúng mốc nghiệp vụ');
assert.equal(manualHistory.byAddress.get('21T9!A18').ga,2,'1/8 phải giữ GA2 dù storage/manual cũ ghi GA1');

const stemHistory=V.buildHistory({worksheets:[{name:'21T9',entries:[base('1/2','STEM12',1)]}]},'21T9',{
  parser:{scanAssignments(ws){return ws.entries}},
  roleResolver(){return'STEM'},
  startDateFor(){return starts['21T9']},
  weekLike(){return true}
});
assert.equal(stemHistory.byAddress.get('21T9!STEM12').ga,3,'STEM không được áp dụng mốc KNS Quang Trung');

console.log('OK Quang Trung 21T9: 1/3 + 1/4+1/5 + 2/5 + 2/6 = GA1; all other KNS classes = GA2; later weeks continue per class');
