'use strict';
const assert=require('node:assert/strict');
const Cross=require('../ga-suggestion-cross-version-v1.js');
const V7=require('../ga-suggestion-v7.js');

const ws=(name,entries=[])=>({name,entries});
const book=worksheets=>({worksheets,getWorksheet(name){return worksheets.find(x=>x.name===name)||null}});
const starts={
  '7T9':new Date(2026,8,7,12),
  '14T9':new Date(2026,8,14,12)
};
const opts={
  parser:{scanAssignments(s){return s.entries||[]}},
  roleResolver(){return'KNS'},
  startDateFor(s){return starts[s.name]||null},
  weekLike(){return true}
};

// Bản cũ của cùng tuần có thêm một sự kiện; nếu bị cộng trùng sẽ đẩy GA sai.
const old7=ws('7T9',[
  {code:'THANH',teacherName:'Hoài Thanh',day:2,session:'Sáng',period:1,teachingPeriod:1,locationKey:'THUY_LUONG',locationLabel:'THUỶ LƯƠNG',classRaw:'2/5',className:'2/5',address:'OLD1'},
  {code:'THANH',teacherName:'Hoài Thanh',day:3,session:'Sáng',period:1,teachingPeriod:1,locationKey:'THUY_LUONG',locationLabel:'THUỶ LƯƠNG',classRaw:'2/5',className:'2/5',address:'OLD2'}
]);
// Bản mới nhất của tuần 7T9 — lịch sử đúng cần dùng.
const new7=ws('7T9',[
  {code:'THANH',teacherName:'Hoài Thanh',day:4,session:'Sáng',period:1,teachingPeriod:1,locationKey:'THUY_LUONG',locationLabel:'THUỶ LƯƠNG',classRaw:'2/5',className:'2/5',address:'Y190'},
  {code:'THANH',teacherName:'Hoài Thanh',day:4,session:'Sáng',period:3,teachingPeriod:3,locationKey:'THUY_LUONG',locationLabel:'THUỶ LƯƠNG',classRaw:'2/4',className:'2/4',address:'AA190'}
]);
const current14=ws('14T9',[
  {code:'THANH',teacherName:'Hoài Thanh',day:4,session:'Sáng',period:1,teachingPeriod:1,locationKey:'THUY_LUONG',locationLabel:'THUỶ LƯƠNG',classRaw:'2/5',className:'2/5',address:'Y210'},
  {code:'THANH',teacherName:'Hoài Thanh',day:4,session:'Sáng',period:3,teachingPeriod:3,locationKey:'THUY_LUONG',locationLabel:'THUỶ LƯƠNG',classRaw:'2/4',className:'2/4',address:'AA210'}
]);

const sources=[
  {id:'old',created:'2026-09-07T08:00:00Z',book:book([old7])},
  {id:'revised',created:'2026-09-10T08:00:00Z',book:book([new7])},
  {id:'active',created:'2026-09-12T08:00:00Z',book:book([current14])}
];
const currentBook=sources[2].book;

const picked=Cross.selectWeekSheets(sources,currentBook,'14T9',opts);
assert.equal(picked.weekCount,2,'chỉ lấy một bản mới nhất cho mỗi tuần');
assert.equal(picked.worksheets[0],new7,'tuần 7T9 phải dùng bản cập nhật mới nhất, không dùng bản cũ');
assert.equal(picked.worksheets[1],current14,'tuần đang chọn luôn dùng workbook hiện tại');

const history=Cross.buildHistoryAcrossSources(V7,sources,currentBook,'14T9',opts);
const c25=history.byAddress.get('14T9!Y210');
const c24=history.byAddress.get('14T9!AA210');
assert.ok(c25&&c24,'phải ghép được hai lớp hiện tại với lịch sử');
assert.equal(c25.ga,2,'2/5 đã có GA1 tuần trước nên 16/9 phải gợi ý GA2');
assert.equal(c24.ga,2,'2/4 đã có GA1 tuần trước nên 16/9 phải gợi ý GA2');
assert.match(V7.basisText(c25),/GA gần nhất/);
assert.match(V7.basisText(c24),/GA gần nhất/);
console.log('OK GA cross-version: newest revision per week, Hoài Thanh 2/5 & 2/4 advance GA1 -> GA2');