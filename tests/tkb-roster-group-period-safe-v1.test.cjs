'use strict';
const assert=require('node:assert/strict');
const R=require('../tkb-roster-group-period-safe-v1.js');

assert.equal(R.VERSION,'20260919.1');

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

const locationAt=(sheet,row)=>({locationKey:row<=64?'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ':'TRẦN QUỐC TOẢN|PHÚ HÒA CŨ'});
for(const [row,col] of [[61,50],[61,51],[61,52],[61,53],[61,54],[63,54]]){
  assert.equal(R.periodHintAt(ws,row,col,locationAt)?.period,4,`expected roster teaching period 4 at ${row},${col}`);
}
assert.equal(R.periodHintAt(ws,61,55,locationAt),null,'BC61 lies outside the roster merge; P adjacency is handled only via paired main');
// BA66 đã sang PHÚ HÒA CŨ; không được ăn nhầm ghi chú AX63:BA63 của TRẦN QUỐC TOẢN CŨ.
assert.equal(R.periodHintAt(ws,66,53,locationAt),null,'period hint must stop at the site/location boundary');

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

// TKB 21T9 - TRẦN QUỐC TOẢN CŨ: tiêu đề J59:N59, tên Nhã Phương phải xuống dòng K61/L61 vì hàng trên không đủ chỗ.
const groupCells=new Map([
  ['59,10',{text:'KHỐI 4 (6 LỚP) - TIẾT 4'}],
  ['60,10',{text:'TÂM'}],['60,11',{text:'TÂM'}],['60,12',{text:'D.PHƯƠNG'}],['60,13',{text:'D.PHƯƠNG'}],
  ['61,11',{text:'NhaPhuong'}],['61,12',{text:'NhaPhuong'}],
  ['65,10',{text:'KHỐI 4 (4 LỚP) - TIẾT 4'}],
  ['66,10',{text:'M.LINH'}],['66,11',{text:'M.LINH'}],['66,12',{text:'HUỲNH'}],['66,13',{text:'HUỲNH'}],['66,14',{text:'DƯƠNG+'}],
  ['67,11',{text:'EXTRA'}],['67,14',{text:'DƯƠNGP'}]
]);
const groupWs={
  rowCount:80,
  model:{merges:['J59:N59','J65:N65']},
  getCell(row,col){return groupCells.get(`${row},${col}`)||{text:'',value:''}}
};
const classMeta=value=>{
  const m=String(value||'').match(/KHỐI\s*(\d+)\s*\(\s*(\d+)\s*LỚP\s*\)\s*-\s*TIẾT\s*([1-5])/i);
  return m?{classRaw:String(value),classType:'combined',classCount:Number(m[2]),classDisplay:`KHỐI ${m[1]} (${m[2]} LỚP)`,groupNote:`TIẾT ${m[3]}`}:{classRaw:String(value||''),classType:'unknown',classCount:1,classDisplay:String(value||''),groupNote:''};
};
const known=new Set(['TÂM','D.PHƯƠNG','NHAPHUONG','M.LINH','HUỲNH','DƯƠNG','EXTRA']);
const groupParser={
  classMeta,
  resolveTeacherCode(sheet,raw){const base=String(raw||'').toUpperCase().replace(/[P+]$/,'');return known.has(base)?{code:base}:null},
  locationAt(sheet,row){return{locationKey:row<65?'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ':'TRẦN QUỐC TOẢN|PHÚ HÒA CŨ'}}
};
const sixAnchorSeed={row:59,period:4,sourceText:'KHỐI 4 (6 LỚP) - TIẾT 4',merge:{c1:10,c2:14,ref:'J59:N59'},meta:classMeta('KHỐI 4 (6 LỚP) - TIẾT 4'),locationKey:'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ'};
const sixRoster=R.groupRosterCells(groupWs,sixAnchorSeed,groupParser);
assert.equal(sixRoster.baseCount,6,'6 lớp phải thu đủ đúng 6 ô phân công chính, kể cả tràn xuống hàng kế');
assert.equal(sixRoster.complete,true);
assert.equal(sixRoster.filter(x=>x.baseSlot).length,6);

const nhaAnchor=R.explicitGroupAnchorAt(groupWs,61,11,groupParser,'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ');
assert.equal(nhaAnchor?.period,4,'Nhã Phương ở dòng tiếp theo vẫn phải thuộc KHỐI 4 - TIẾT 4');
assert.equal(nhaAnchor?.merge?.ref,'J59:N59');
const nhaFixed=R.applyGroupContinuation({row:61,col:11,className:'',classRaw:'',classType:'unknown',period:2,slotPeriod:2,teachingPeriod:2},nhaAnchor);
assert.equal(nhaFixed.className,'KHỐI 4 (6 LỚP)');
assert.equal(nhaFixed.groupNote,'TIẾT 4');
assert.equal(nhaFixed.teachingPeriod,4);

// DƯƠNG+ nằm ở N66 ngay dưới merge J65:N65: phải nhận đúng nhóm để báo giảng có lớp/GA, nhưng vẫn là Cộng 1 riêng.
const fourAnchorSeed={row:65,period:4,sourceText:'KHỐI 4 (4 LỚP) - TIẾT 4',merge:{c1:10,c2:14,ref:'J65:N65'},meta:classMeta('KHỐI 4 (4 LỚP) - TIẾT 4'),locationKey:'TRẦN QUỐC TOẢN|PHÚ HÒA CŨ'};
const fourRoster=R.groupRosterCells(groupWs,fourAnchorSeed,groupParser);
assert.equal(fourRoster.baseCount,4,'4 lớp chỉ tính 4 ô GV chính');
assert.equal(fourRoster.filter(x=>x.kind==='plus').length,1,'DƯƠNG+ là ô cộng thêm, không được tính thành lớp thứ 5');
assert.equal(fourRoster.filter(x=>x.kind==='assist').length,1,'DƯƠNGP là trợ, không được tính vào số lớp');
assert.equal(fourRoster.some(x=>x.value==='EXTRA'),false,'GV thường xuất hiện sau khi đã đủ N lớp không được kéo nhầm vào nhóm');

const duongAnchor=R.explicitGroupAnchorAt(groupWs,66,14,groupParser,'TRẦN QUỐC TOẢN|PHÚ HÒA CŨ');
assert.equal(duongAnchor?.period,4);
assert.equal(duongAnchor?.meta?.classDisplay,'KHỐI 4 (4 LỚP)');
assert.equal(R.explicitGroupAnchorAt(groupWs,67,11,groupParser,'TRẦN QUỐC TOẢN|PHÚ HÒA CŨ'),null,'class-count guard must reject unrelated main teacher after the 4 base slots');

console.log('OK roster group period: roster-style classes and wrapped merged-group participants resolve to actual Tiết 4');
