'use strict';
const assert=require('node:assert/strict');
const L=require('../tkb-roster-group-period-safe-v1.js');

assert.equal(L.VERSION,'20261011.3');

function makeWs(cells,merges=[]){
  return{
    model:{merges},
    rowCount:100,
    getCell(row,col){
      const key=`${row},${col}`;
      const value=cells.get(key)||'';
      return{value,text:value,address:`R${row}C${col}`};
    }
  };
}

// THỦY PHƯƠNG – cấu trúc THẬT trong file 12T10:
 // B189:B199 = THỦY PHƯƠNG
 // C189:C191 = PHÂN HIỆU - THANH LAM CŨ
 // C192:C199 = TRỤ SỞ CHÍNH - 25 DẠ LÊ
 // G191/H191 = 4/2, 4/1; G192/H192 = ĐỨC, ĐỨC.
 // Hàng lớp là dòng CUỐI site cũ nhưng hàng GV ngay dưới là dòng ĐẦU site mới,
 // cùng một trường -> phân công phải neo vào site mới 25 Dạ Lê.
const thuyCells=new Map([
  ['189,2','THỦY PHƯƠNG'],
  ['189,3','PHÂN HIỆU - THANH LAM CŨ'],
  ['192,3','TRỤ SỞ CHÍNH\n- 25 DẠ LÊ']
]);
const thuyWs=makeWs(thuyCells,['B189:B199','C189:C191','C192:C199']);
const parser={
  locationAt(ws,row){
    if(row>=192)return{
      schoolName:'THỦY PHƯƠNG',school:'THỦY PHƯƠNG',schoolKey:'THUY PHUONG',
      siteRaw:'TRỤ SỞ CHÍNH - 25 DẠ LÊ',siteType:'Trụ sở chính',siteName:'25 DẠ LÊ',
      siteDisplay:'Trụ sở chính: 25 DẠ LÊ',siteKey:'TRU SO CHINH|25 DA LE',
      locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
      locationKey:'THUY PHUONG|TRU SO CHINH|25 DA LE',notes:[]
    };
    return{
      schoolName:'THỦY PHƯƠNG',school:'THỦY PHƯƠNG',schoolKey:'THUY PHUONG',
      siteRaw:'PHÂN HIỆU - THANH LAM CŨ',siteType:'Phân hiệu',siteName:'THANH LAM CŨ',
      siteDisplay:'Phân hiệu: THANH LAM CŨ',siteKey:'PHAN HIEU|THANH LAM CU',
      locationLabel:'THỦY PHƯƠNG\nPhân hiệu: THANH LAM CŨ',
      locationKey:'THUY PHUONG|PHAN HIEU|THANH LAM CU',notes:[]
    };
  }
};
const duc42={
  row:192,col:7,classRow:191,address:'G192',code:'ĐỨC',
  className:'4/2',classRaw:'4/2',classType:'single',
  school:'THỦY PHƯƠNG',schoolName:'THỦY PHƯƠNG',
  siteDisplay:'Phân hiệu: THANH LAM CŨ',
  locationKey:'THUY PHUONG|PHAN HIEU|THANH LAM CU'
};
const fixed=L.repairBoundaryLocation(thuyWs,duc42,parser);
assert.equal(fixed.locationKey,'THUY PHUONG|TRU SO CHINH|25 DA LE');
assert.equal(fixed.siteType,'Trụ sở chính');
assert.equal(fixed.siteName,'25 DẠ LÊ');
assert.equal(fixed.siteDisplay,'Trụ sở chính: 25 DẠ LÊ');
assert.equal(fixed.locationBoundaryRepaired,true);
assert.equal(fixed.locationAnchorRow,192);
assert.equal(fixed.locationRepairReason,'class-last-row-to-next-site-first-row');
assert.equal(fixed.className,'4/2');
assert.equal(fixed.code,'ĐỨC');

const fixed41=L.repairBoundaryLocation(thuyWs,{...duc42,col:8,address:'H192',className:'4/1',classRaw:'4/1'},parser);
assert.equal(fixed41.siteName,'25 DẠ LÊ');
assert.equal(fixed41.className,'4/1');

// Bảo vệ lỗi cũ QUANG TRUNG 1/8: nếu hàng lớp đang NẰM TRỰC TIẾP trong merge
// của điểm dạy cũ, tuyệt đối không kéo xuống cơ sở ở hàng giáo viên bên dưới.
const qtCells=new Map([
  ['45,2','QUANG TRUNG'],['45,3','QUANG TRUNG'],
  ['51,2','VỸ DẠ'],['51,3','VỸ DẠ']
]);
const qtWs=makeWs(qtCells,['B45:B50','C45:C50','B51:B60','C51:C60']);
const qtParser={locationAt(ws,row){return row<=50?
  {schoolName:'QUANG TRUNG',siteDisplay:'',locationKey:'QUANG TRUNG|'}:
  {schoolName:'VỸ DẠ',siteDisplay:'',locationKey:'VY DA|'};}};
const qt={row:51,col:10,classRow:50,className:'1/8',classRaw:'1/8',code:'PHƯƠNG CTV',schoolName:'QUANG TRUNG',locationKey:'QUANG TRUNG|'};
const qtFixed=L.repairBoundaryLocation(qtWs,qt,qtParser);
assert.equal(qtFixed.locationKey,'QUANG TRUNG|','1/8 phải tiếp tục neo vào QUANG TRUNG');
assert.equal(qtFixed.locationBoundaryRepaired,undefined);

// Không được vượt ranh giới trường khác nếu dữ liệu class/site mơ hồ.
const otherParser={locationAt(ws,row){return row>=31?
  {schoolName:'TRƯỜNG KHÁC',siteDisplay:'Cơ sở B',locationKey:'TRUONG KHAC|B'}:
  parser.locationAt(ws,row);}};
const protectedEntry=L.repairBoundaryLocation(thuyWs,duc42,otherParser);
assert.equal(protectedEntry.locationKey,duc42.locationKey,'không tự kéo phân công sang trường khác');

console.log('OK location boundary: THỦY PHƯƠNG 4/2 + 4/1 -> Trụ sở chính 25 Dạ Lê; QUANG TRUNG 1/8 remains protected');
