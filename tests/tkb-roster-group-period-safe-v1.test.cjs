'use strict';
const assert=require('node:assert/strict');
const R=require('../tkb-roster-group-period-safe-v1.js');

assert.equal(R.VERSION,'20261002.2');

// Đúng cấu trúc TKB mới ở TRẦN QUỐC TOẢN, sheet 21T9.
assert.equal(R.periodHintFromText('KHỐI 1  - DẠY TIẾT 4'),4);
assert.equal(R.periodHintFromText('MỖI NGƯỜI 1 LỚP, DẠY TRONG LỚP TIẾT 4'),4);
assert.equal(R.periodHintFromText('MỖI NGƯỜI 1 LỚP, DẠY TRONG LỚP - TIẾT 4'),4,'dấu gạch trước TIẾT như TKB thực tế vẫn phải nhận Tiết 4');
assert.equal(R.periodHintFromText('HỌC TIẾT 5 SÁNG THỨ 3 - MỖI GV/LỚP'),5);
assert.equal(R.periodHintFromText('HỌC TIẾT 5 SÁNG THỨ 2 - MỖI GV / LỚP'),5);
assert.equal(R.periodHintFromText('HỌC TIẾT 5 SÁNG THỨ 6 - MỖI GIÁO VIÊN/LỚP'),5);

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



// Regression khóa đúng cụm người dùng vừa xác nhận:
// 1/1 → 1/5 nằm cùng hàng; 1/6 bị tràn xuống dưới nhưng CẢ 6 LỚP đều dạy Tiết 4.
// 1/6 được đặt đúng ở biên xa nhất 6 hàng tính từ dòng chỉ dẫn để tránh tái phát lỗi lấy tiết nguồn.
const sixClassCells=new Map([
  ['100,10',{text:'MỖI NGƯỜI 1 LỚP, DẠY TRONG LỚP - TIẾT 4'}], // J100:N100
  ['101,10',{text:'1/1'}],['101,11',{text:'1/2'}],['101,12',{text:'1/3'}],['101,13',{text:'1/4'}],['101,14',{text:'1/5'}],
  ['102,10',{text:'LIÊN'}],['102,11',{text:'TÂM'}],['102,12',{text:'NGÃ'}],['102,13',{text:'M.LINH'}],['102,14',{text:'LÀNH'}],
  ['103,10',{text:'LIÊNP'}],['103,11',{text:'TÂMP'}],['103,12',{text:'NGÃP'}],['103,13',{text:'M.LINHP'}],['103,14',{text:'LÀNHP'}],
  ['105,13',{text:'1/6'}],
  ['106,13',{text:'QUỲNH'}],['106,14',{text:'QUỲNHP'}]
]);
const sixClassWs={
  rowCount:110,
  model:{merges:['J100:N100']},
  getCell(row,col){return sixClassCells.get(`${row},${col}`)||{text:'',value:''}}
};
const sixClassParser={
  locationAt(){return{locationKey:'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ'}}
};
const sixClassEntries=[
  {row:102,col:10,className:'1/1',classRaw:'1/1',classType:'single',period:1,slotPeriod:1,teachingPeriod:1,locationKey:'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ'},
  {row:102,col:11,className:'1/2',classRaw:'1/2',classType:'single',period:2,slotPeriod:2,teachingPeriod:2,locationKey:'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ'},
  {row:102,col:12,className:'1/3',classRaw:'1/3',classType:'single',period:3,slotPeriod:3,teachingPeriod:3,locationKey:'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ'},
  {row:102,col:13,className:'1/4',classRaw:'1/4',classType:'single',period:1,slotPeriod:1,teachingPeriod:1,locationKey:'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ'},
  {row:102,col:14,className:'1/5',classRaw:'1/5',classType:'single',period:2,slotPeriod:2,teachingPeriod:2,locationKey:'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ'},
  {row:106,col:13,className:'1/6',classRaw:'1/6',classType:'single',period:3,slotPeriod:3,teachingPeriod:3,locationKey:'TRẦN QUỐC TOẢN|TRẦN QUỐC TOẢN CŨ'}
];
for(const entry of sixClassEntries){
  const normalized=R.normalizeEntry(sixClassWs,entry,sixClassParser);
  assert.equal(normalized.teachingPeriod,4,`${entry.className} phải luôn dạy Tiết 4, không được lấy Tiết ${entry.period} từ ô nguồn`);
  assert.equal(normalized.className,entry.className,`${entry.className} phải giữ là lớp riêng, không biến thành KHỐI 1`);
}
const class16=R.normalizeEntry(sixClassWs,sixClassEntries[5],sixClassParser);
assert.equal(class16.slotPeriod,3,'1/6 vẫn giữ tiết nguồn để truy vết');
assert.equal(class16.teachingPeriod,4,'1/6 tràn xuống hàng dưới vẫn phải là Tiết 4');
assert.equal(class16.rosterTeachingPeriod,4,'1/6 phải mang marker roster Tiết 4');



// Regression HƯƠNG VINH: cả 3 điểm dạy đều có header "HỌC TIẾT 5 ... - MỖI GV/LỚP".
// Các lớp ở cả hàng đầu và hàng sau vẫn phải nhận teachingPeriod=5.
const huongVinhCells=new Map([
  ['120,10',{text:'HỌC TIẾT 5 SÁNG THỨ 3 - MỖI GV/LỚP'}],
  ['122,10',{text:'M.LINH'}],['122,14',{text:'DUNG'}],
  ['125,10',{text:'HUỲNH'}],['125,14',{text:'NHƯ'}],

  ['140,10',{text:'HỌC TIẾT 5 SÁNG THỨ 2 - MỖI GV/LỚP'}],
  ['142,10',{text:'TÂM'}],['142,14',{text:'DUNG'}],
  ['145,10',{text:'M.LINH'}],['145,14',{text:'CHI'}],

  ['160,10',{text:'HỌC TIẾT 5 SÁNG THỨ 6 - MỖI GV/LỚP'}],
  ['162,10',{text:'TÂM'}],['162,14',{text:'CHI'}],
  ['165,10',{text:'NAM'}],['165,14',{text:'K.THI'}]
]);
const huongVinhWs={
  rowCount:170,
  model:{merges:['J120:N120','J140:N140','J160:N160']},
  getCell(row,col){return huongVinhCells.get(`${row},${col}`)||{text:'',value:''}}
};
const huongVinhLocation=(sheet,row)=>{
  if(row<135)return{locationKey:'HƯƠNG VINH|TRƯỜNG CHÍNH - HƯƠNG VINH 2 CŨ'};
  if(row<155)return{locationKey:'HƯƠNG VINH|PHÂN HIỆU 1 - HƯƠNG VINH 1 CŨ'};
  return{locationKey:'HƯƠNG VINH|PHÂN HIỆU 2 - HƯƠNG VINH 3 CŨ'};
};
const huongVinhCases=[
  {row:122,col:10,className:'1/1',period:1,locationKey:'HƯƠNG VINH|TRƯỜNG CHÍNH - HƯƠNG VINH 2 CŨ'},
  {row:125,col:14,className:'5/2',period:2,locationKey:'HƯƠNG VINH|TRƯỜNG CHÍNH - HƯƠNG VINH 2 CŨ'},
  {row:142,col:10,className:'1/3',period:1,locationKey:'HƯƠNG VINH|PHÂN HIỆU 1 - HƯƠNG VINH 1 CŨ'},
  {row:145,col:14,className:'5/4',period:3,locationKey:'HƯƠNG VINH|PHÂN HIỆU 1 - HƯƠNG VINH 1 CŨ'},
  {row:162,col:10,className:'1/4',period:1,locationKey:'HƯƠNG VINH|PHÂN HIỆU 2 - HƯƠNG VINH 3 CŨ'},
  {row:165,col:14,className:'5/5',period:3,locationKey:'HƯƠNG VINH|PHÂN HIỆU 2 - HƯƠNG VINH 3 CŨ'}
];
for(const item of huongVinhCases){
  const hint=R.periodHintAt(huongVinhWs,item.row,item.col,huongVinhLocation,item.locationKey);
  assert.equal(hint?.period,5,`${item.className} ở HƯƠNG VINH phải nhận Tiết 5 từ header của đúng điểm dạy`);
  const fixed=R.applyHint({row:item.row,col:item.col,className:item.className,classRaw:item.className,classType:'single',period:item.period,slotPeriod:item.period,teachingPeriod:item.period,locationKey:item.locationKey},hint);
  assert.equal(fixed.teachingPeriod,5,`${item.className} ở HƯƠNG VINH phải dạy Tiết 5`);
  assert.equal(fixed.className,item.className);
}
assert.equal(R.periodHintAt(huongVinhWs,142,10,huongVinhLocation,'HƯƠNG VINH|TRƯỜNG CHÍNH - HƯƠNG VINH 2 CŨ'),null,'không được kéo header Tiết 5 qua ranh giới điểm dạy HƯƠNG VINH');

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
