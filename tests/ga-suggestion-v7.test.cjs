'use strict';
const assert=require('node:assert/strict');
const V=require('../ga-suggestion-v7.js');
assert.equal(V.version,'20260925.1');
assert.deepEqual(V.KNS_SEQUENCE,[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34]);
assert.deepEqual(V.STEM_SEQUENCE,[3,6,13,16,20,23,27,32,35]);

assert.equal(V.classOnly('1/B - P 1.5'),'1/B','phần trước là lớp, phần P phía sau chỉ là phòng');
assert.equal(V.classOnly('2/A - P 2/2'),'2/A','phòng có dạng 2/2 không được nhận nhầm thành lớp');
assert.deepEqual(V.gradesOf('1/B'),[1],'lớp chữ 1/B phải nhận đúng khối 1');
assert.deepEqual(V.gradesOf('2/A - P 2/2'),[2],'chỉ lớp 2/A quyết định khối, không dùng phòng P 2/2');
assert.deepEqual(V.classMembers('2/A - P 2/2',2),['2/A'],'room suffix không được tạo member 2/2 giả');
assert.equal(V.normalizeClass('1/B - P 1.5'),'1/B','khóa lớp dùng cho GA phải loại phòng');

const ws1={name:'7T9',entries:[
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:2,session:'Sáng',period:1,teachingPeriod:4,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',className:'4/1+4/2+4/3+4/4',address:'E176'},
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:2,session:'Sáng',period:2,teachingPeriod:4,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',className:'4/1+4/2+4/3+4/4',address:'F176'},
  {code:'CTV1',teacherName:'CTV Một',day:2,session:'Sáng',period:3,teachingPeriod:4,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',className:'4/1+4/2+4/3+4/4',address:'G176'},
  {code:'STEM1',teacherName:'GV STEM',day:3,session:'Sáng',period:3,teachingPeriod:3,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4',className:'4/1+4/2+4/3+4/4',address:'H176'},
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:3,session:'Chiều',period:3,teachingPeriod:3,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/6',className:'4/6',address:'L172'},
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:4,session:'Sáng',period:1,teachingPeriod:4,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',className:'4/1+4/2+4/3+4/4',address:'M176'}
]};
const ws2={name:'14T9',entries:[
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:2,session:'Sáng',period:1,teachingPeriod:4,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',className:'4/1+4/2+4/3+4/4',address:'E200'}
]};
const book={worksheets:[ws1,ws2]};
const parser={scanAssignments(ws){return ws.entries}};
const roles={'ĐỨC':'KNS','CTV1':'CTV','STEM1':'STEM'};
const starts={'7T9':new Date(2026,8,7,12),'14T9':new Date(2026,8,14,12)};
const history=V.buildHistory(book,'14T9',{parser,roleResolver(_ws,code){return roles[code]||'KNS'},startDateFor(ws){return starts[ws.name]},weekLike(){return true}});

const first=history.byAddress.get('7T9!E176');
const duplicate=history.byAddress.get('7T9!F176');
const ctv=history.byAddress.get('7T9!G176');
assert.ok(first&&duplicate&&ctv);
assert.equal(first.id,duplicate.id,'duplicate source cells with same - TIẾT 4 are one teaching event');
assert.equal(first.id,ctv.id,'KNS teacher + CTV on same class/actual period are one collaborative event');
assert.equal(first.period,4,'actual teaching period wins over source slot');
assert.equal(first.ga,1,'first KNS teaching event starts at GA 1');
assert.equal(first.atoms.length,3,'three source cells are preserved inside one event');
assert.equal(first.participants.length,2,'KNS teacher and CTV are both retained as participants');

const stem=history.byAddress.get('7T9!H176');
assert.equal(stem.track,'stem');
assert.equal(stem.ga,3,'STEM has its own independent sequence');

const class46=history.byAddress.get('7T9!L172');
assert.equal(class46.track,'kns');
assert.equal(class46.ga,1,'different class 4/6 does not inherit GA from 4/1+4/2+4/3+4/4');

const secondKns=history.byAddress.get('7T9!M176');
assert.equal(secondKns.ga,1,'all KNS events for the same class/group inside week 7T9 must stay GA 1');

const nextWeek=history.byAddress.get('14T9!E200');
assert.equal(nextWeek.ga,2,'first KNS week after 7T9 advances GA 1 → GA 2');
assert.match(V.basisText(nextWeek),/GA gần nhất/);

// Ca nghiệp vụ thực tế HUỆ lớp 3/9:
// 7T9 KNS giữ GA1 trong cả tuần; 14T9 STEM là luồng riêng GA3;
// 21T9 KNS mới chuyển sang GA2.
const h7={name:'7T9',entries:[
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:2,session:'Sáng',period:5,teachingPeriod:5,locationKey:'THUY_PHUONG|25_DA_LE',locationLabel:'THỦY PHƯƠNG - 25 DẠ LÊ',classRaw:'3/9',className:'3/9',address:'AM150'},
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:5,teachingPeriod:5,locationKey:'THUY_PHUONG|25_DA_LE',locationLabel:'THỦY PHƯƠNG - 25 DẠ LÊ',classRaw:'3/9',className:'3/9',address:'AM170'}
]};
const h14={name:'14T9',entries:[
  {code:'HƯƠNG',teacherName:'Phan Thị Quý Hương',day:5,session:'Sáng',period:5,teachingPeriod:5,locationKey:'THUY_PHUONG|25_DA_LE',locationLabel:'THỦY PHƯƠNG - 25 DẠ LÊ',classRaw:'3/9',className:'3/9',address:'AM170'}
]};
const h21={name:'21T9',entries:[
  {code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:5,teachingPeriod:5,locationKey:'THUY_PHUONG|25_DA_LE',locationLabel:'THỦY PHƯƠNG - 25 DẠ LÊ',classRaw:'3/9',className:'3/9',address:'AM170'}
]};
const hBook={worksheets:[h7,h14,h21]};
const hStarts={'7T9':new Date(2026,8,7,12),'14T9':new Date(2026,8,14,12),'21T9':new Date(2026,8,21,12)};
const hRoles={'HUỆ':'KNS','HƯƠNG':'STEM'};
const hHistory=V.buildHistory(hBook,'21T9',{
  parser:{scanAssignments(ws){return ws.entries}},
  roleResolver(_ws,code){return hRoles[code]||'KNS'},
  startDateFor(ws){return hStarts[ws.name]},
  weekLike(){return true}
});
assert.equal(hHistory.byAddress.get('7T9!AM150').ga,1);
assert.equal(hHistory.byAddress.get('7T9!AM170').ga,1,'10/9 KNS 3/9 must still be GA1');
assert.equal(hHistory.byAddress.get('14T9!AM170').track,'stem');
assert.equal(hHistory.byAddress.get('14T9!AM170').ga,3,'STEM keeps its independent GA3 sequence');
assert.equal(hHistory.byAddress.get('21T9!AM170').track,'kns');
assert.equal(hHistory.byAddress.get('21T9!AM170').ga,2,'21T9 HUỆ 3/9 KNS must be GA2, never GA4');
assert.match(V.basisText(hHistory.byAddress.get('7T9!AM170')),/giữ nguyên GA 1/);


const l7={name:'7T9',entries:[
  {code:'HẰNG',teacherName:'Hằng',day:4,session:'Chiều',period:1,teachingPeriod:1,locationKey:'LE_LOI',locationLabel:'LÊ LỢI',classRaw:'1/B - P 1.5',className:'1/B',address:'D250'},
  {code:'HẰNG',teacherName:'Hằng',day:4,session:'Chiều',period:2,teachingPeriod:2,locationKey:'LE_LOI',locationLabel:'LÊ LỢI',classRaw:'1/C - P 1.1',className:'1/C',address:'E250'}
]};
const l14={name:'14T9',entries:[
  {code:'HẰNG',teacherName:'Hằng',day:4,session:'Chiều',period:1,teachingPeriod:1,locationKey:'LE_LOI',locationLabel:'LÊ LỢI',classRaw:'1/B - P 4.2',className:'1/B',address:'D250'}
]};
const lBook={worksheets:[l7,l14]};
const lStarts={'7T9':new Date(2026,8,7,12),'14T9':new Date(2026,8,14,12)};
const lHistory=V.buildHistory(lBook,'14T9',{
  parser:{scanAssignments(ws){return ws.entries}},
  roleResolver(){return'KNS'},
  startDateFor(ws){return lStarts[ws.name]},
  weekLike(){return true}
});
assert.equal(lHistory.byAddress.get('7T9!D250').classDisplay,'1/B - P 1.5');
assert.equal(lHistory.byAddress.get('7T9!D250').ga,1,'lần đầu lớp 1/B là GA1');
assert.equal(lHistory.byAddress.get('7T9!E250').ga,1,'lớp 1/C có tiến trình riêng');
assert.equal(lHistory.byAddress.get('14T9!D250').ga,2,'cùng lớp 1/B đổi phòng vẫn phải nối lịch sử và tăng GA');
assert.equal(lHistory.byAddress.get('14T9!D250').classId,'1/B','room không được nằm trong classId');
console.log('OK GA suggestion V7: actual-period grouping, collaboration, separate KNS/STEM progress, class-specific nearest GA');
