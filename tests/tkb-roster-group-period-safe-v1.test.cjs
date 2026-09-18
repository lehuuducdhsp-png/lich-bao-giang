'use strict';
const assert=require('node:assert/strict');
const R=require('../tkb-roster-group-period-safe-v1.js');

assert.equal(R.VERSION,'20260918.1');

// Đúng cấu trúc TKB mới ở TRẦN QUỐC TOẢN, sheet 21T9.
assert.equal(R.periodHintFromText('KHỐI 1  - DẠY TIẾT 4'),4);
assert.equal(R.periodHintFromText('MỖI NGƯỜI 1 LỚP, DẠY TRONG LỚP TIẾT 4'),4);

// Không đụng cách ghi lớp gộp cũ; loại này đã được classMeta/groupNote xử lý riêng.
assert.equal(R.periodHintFromText('KHỐI 4 (6 LỚP) - TIẾT 4'),null);
assert.equal(R.periodHintFromText('1/3'),null);

// Fake worksheet theo đúng vùng AX:BB của file người dùng.
const cells=new Map([
  ['59,50',{text:'KHỐI 1  - DẠY TIẾT 4'}], // AX59, merge AX59:BB59
  ['60,50',{text:'1/1'}],
  ['60,51',{text:'1/2'}],
  ['60,52',{text:'1/3'}],
  ['60,53',{text:'1/4'}],
  ['60,54',{text:'1/5'}],
  ['61,50',{text:'DƯƠNG'}],
  ['61,51',{text:'TÂM'}],
  ['61,52',{text:'M.LINH'}],
  ['61,53',{text:'C.TÂM CTV'}],
  ['61,54',{text:'ĐÔ'}],
  ['61,55',{text:'ĐÔP'}], // BC61 nằm ngoài merge, dùng cho test P đặc biệt ở module khác
  ['63,50',{text:'MỖI NGƯỜI 1 LỚP, DẠY TRONG LỚP TIẾT 4'}]
]);
const ws={
  rowCount:70,
  model:{merges:['AX59:BB59','AX63:BA63']},
  getCell(row,col){return cells.get(`${row},${col}`)||{text:'',value:''}}
};

for(const [row,col] of [[61,50],[61,51],[61,52],[61,53],[61,54],[63,54]]){
  assert.equal(R.periodHintAt(ws,row,col)?.period,4,`expected roster teaching period 4 at ${row},${col}`);
}
assert.equal(R.periodHintAt(ws,61,55),null,'BC61 lies outside the roster merge; P adjacency is handled only via paired main');

const fixed=R.applyHint({
  row:61,col:52,className:'1/3',classRaw:'1/3',classType:'single',
  period:3,slotPeriod:3,teachingPeriod:3
},{period:4,row:59,sourceText:'KHỐI 1 - DẠY TIẾT 4'});
assert.equal(fixed.slotPeriod,3,'source column remains period 3 for traceability');
assert.equal(fixed.teachingPeriod,4,'actual teaching period must become 4');
assert.equal(fixed.className,'1/3','individual class must stay independent, not turn into KHỐI 1');
assert.equal(fixed.rosterTeachingPeriod,4);

const combined={className:'KHỐI 4 (6 LỚP)',classRaw:'KHỐI 4 (6 LỚP) - TIẾT 4',classType:'combined',period:1,teachingPeriod:4};
assert.equal(R.applyHint(combined,{period:4}),combined,'legacy combined classes must not be rewritten');

console.log('OK roster group period: 21T9 KHỐI 1 roster columns map to actual Tiết 4 while individual classes stay separate');
