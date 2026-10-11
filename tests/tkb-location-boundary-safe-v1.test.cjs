'use strict';
const assert=require('node:assert/strict');
const L=require('../tkb-location-boundary-safe-v1.js');

assert.equal(L.VERSION,'20261011.1');

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

// THỦY PHƯƠNG: hàng lớp 4/2, 4/1 nằm ngay trước merge của cơ sở mới.
// Parser cũ lấy ngược PHÂN HIỆU THANH LÂM CŨ từ phía trên.
// Hàng GV ĐỨC nằm trực tiếp trong "TRỤ SỞ CHÍNH - 25 DẠ LÊ".
const thuyCells=new Map([
  ['20,2','THỦY PHƯƠNG'],
  ['20,3','PHÂN HIỆU - THANH LÂM CŨ'],
  ['31,3','TRỤ SỞ CHÍNH\n- 25 DẠ LÊ']
]);
const thuyWs=makeWs(thuyCells,['B20:B45','C20:C29','C31:C45']);
const parser={
  locationAt(ws,row){
    if(row>=31)return{
      schoolName:'THỦY PHƯƠNG',school:'THỦY PHƯƠNG',schoolKey:'THUY PHUONG',
      siteRaw:'TRỤ SỞ CHÍNH - 25 DẠ LÊ',siteType:'Trụ sở chính',siteName:'25 DẠ LÊ',
      siteDisplay:'Trụ sở chính: 25 DẠ LÊ',siteKey:'TRU SO CHINH|25 DA LE',
      locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
      locationKey:'THUY PHUONG|TRU SO CHINH|25 DA LE',notes:[]
    };
    return{
      schoolName:'THỦY PHƯƠNG',school:'THỦY PHƯƠNG',schoolKey:'THUY PHUONG',
      siteRaw:'PHÂN HIỆU - THANH LÂM CŨ',siteType:'Phân hiệu',siteName:'THANH LÂM CŨ',
      siteDisplay:'Phân hiệu: THANH LÂM CŨ',siteKey:'PHAN HIEU|THANH LAM CU',
      locationLabel:'THỦY PHƯƠNG\nPhân hiệu: THANH LÂM CŨ',
      locationKey:'THUY PHUONG|PHAN HIEU|THANH LAM CU',notes:[]
    };
  }
};
const duc42={
  row:31,col:10,classRow:30,address:'J31',code:'ĐỨC',
  className:'4/2',classRaw:'4/2',classType:'single',
  school:'THỦY PHƯƠNG',schoolName:'THỦY PHƯƠNG',
  siteDisplay:'Phân hiệu: THANH LÂM CŨ',
  locationKey:'THUY PHUONG|PHAN HIEU|THANH LAM CU'
};
const fixed=L.repairEntryLocation(thuyWs,duc42,parser);
assert.equal(fixed.locationKey,'THUY PHUONG|TRU SO CHINH|25 DA LE');
assert.equal(fixed.siteType,'Trụ sở chính');
assert.equal(fixed.siteName,'25 DẠ LÊ');
assert.equal(fixed.siteDisplay,'Trụ sở chính: 25 DẠ LÊ');
assert.equal(fixed.locationBoundaryRepaired,true);
assert.equal(fixed.locationAnchorRow,31);
assert.equal(fixed.className,'4/2','sửa địa điểm không được đổi lớp');
assert.equal(fixed.code,'ĐỨC','sửa địa điểm không được đổi giáo viên');

// 4/1 cùng hàng nguồn phải được sửa giống 4/2.
const fixed41=L.repairEntryLocation(thuyWs,{...duc42,col:11,address:'K31',className:'4/1',classRaw:'4/1'},parser);
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
const qtFixed=L.repairEntryLocation(qtWs,qt,qtParser);
assert.equal(qtFixed.locationKey,'QUANG TRUNG|','1/8 phải tiếp tục neo vào QUANG TRUNG');
assert.equal(qtFixed.locationBoundaryRepaired,undefined);

// Không được vượt ranh giới trường khác nếu dữ liệu class/site mơ hồ.
const otherParser={locationAt(ws,row){return row>=31?
  {schoolName:'TRƯỜNG KHÁC',siteDisplay:'Cơ sở B',locationKey:'TRUONG KHAC|B'}:
  parser.locationAt(ws,row);}};
const protectedEntry=L.repairEntryLocation(thuyWs,duc42,otherParser);
assert.equal(protectedEntry.locationKey,duc42.locationKey,'không tự kéo phân công sang trường khác');

console.log('OK location boundary: THỦY PHƯƠNG 4/2 + 4/1 -> Trụ sở chính 25 Dạ Lê; QUANG TRUNG 1/8 remains protected');
