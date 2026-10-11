'use strict';
const assert=require('node:assert/strict');
const L=require('../tkb-roster-group-period-safe-v1.js');

assert.equal(L.VERSION,'20261011.4');

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

// THỦY PHÙ 1 – cấu trúc THẬT trong file 12T10 người dùng gửi:
 // B234:B237 = THUỶ LƯƠNG
 // C234:C237 = ghi chú giờ học
 // E237/F237/G237 = 5/5, 1/4, 4/5
 // B238:B246 = THỦY PHÙ
 // C238:C242 = THỦY PHÙ 1
 // E238/F238/G238 = HUỆ2
 // Ba lớp ở dòng cuối block trước nhưng là phân công của HUỆ2 tại THỦY PHÙ 1.
const thuyPhuCells=new Map([
  ['234,2','THUỶ LƯƠNG'],
  ['234,3','+ Buổi sáng: 7h15 có mặt ở trường để quản lý HS lớp'],
  ['238,2','THỦY PHÙ'],
  ['238,3','THỦY PHÙ 1']
]);
const thuyPhuWs=makeWs(thuyPhuCells,['B234:B237','C234:C237','B238:B246','C238:C242']);
const thuyPhuParser={
  locationAt(ws,row){
    if(row>=238)return{
      schoolName:'THỦY PHÙ',school:'THỦY PHÙ',schoolKey:'THUY PHU',
      siteRaw:'THỦY PHÙ 1',siteType:'Địa điểm',siteName:'THỦY PHÙ 1',
      siteDisplay:'Địa điểm: THỦY PHÙ 1',siteKey:'THUY PHU 1',
      locationLabel:'THỦY PHÙ\nĐịa điểm: THỦY PHÙ 1',
      locationKey:'THUY PHU|THUY PHU 1',notes:[]
    };
    return{
      schoolName:'THUỶ LƯƠNG',school:'THUỶ LƯƠNG',schoolKey:'THUY LUONG',
      siteRaw:'+ Buổi sáng: 7h15 có mặt ở trường để quản lý HS lớp',
      siteType:'Địa điểm',siteName:'+ Buổi sáng: 7h15 có mặt ở trường để quản lý HS lớp',
      siteDisplay:'Địa điểm: + Buổi sáng: 7h15 có mặt ở trường để quản lý HS lớp',
      siteKey:'GHI CHU',locationLabel:'THUỶ LƯƠNG\nGhi chú',locationKey:'THUY LUONG|GHI CHU',notes:[]
    };
  }
};
for(const [col,cls] of [[5,'5/5'],[6,'1/4'],[7,'4/5']]){
  const raw={
    row:238,col,classRow:237,address:`${String.fromCharCode(64+col)}238`,code:'HUỆ2',
    className:cls,classRaw:cls,classType:'single',
    school:'THUỶ LƯƠNG',schoolName:'THUỶ LƯƠNG',
    siteDisplay:'Địa điểm: + Buổi sáng...',
    locationKey:'THUY LUONG|GHI CHU'
  };
  const fixed=L.repairBoundaryLocation(thuyPhuWs,raw,thuyPhuParser);
  assert.equal(fixed.schoolName,'THỦY PHÙ',`${cls} phải đổi sang trường THỦY PHÙ`);
  assert.equal(fixed.siteName,'THỦY PHÙ 1',`${cls} phải thuộc THỦY PHÙ 1`);
  assert.equal(fixed.locationKey,'THUY PHU|THUY PHU 1');
  assert.equal(fixed.locationRepairReason,'thuy-phu-1-three-class-row-spill');
  assert.equal(fixed.className,cls);
  assert.equal(fixed.code,'HUỆ2');
}

// Chỉ đúng ba lớp đã xác nhận mới được vượt ranh giới trường theo ngoại lệ này.
const notWhitelisted=L.repairBoundaryLocation(thuyPhuWs,{
  row:238,col:8,classRow:237,className:'2/2',classRaw:'2/2',code:'HUỆ2',
  schoolName:'THUỶ LƯƠNG',locationKey:'THUY LUONG|GHI CHU'
},thuyPhuParser);
assert.equal(notWhitelisted.locationKey,'THUY LUONG|GHI CHU');

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

console.log('OK location boundary: THỦY PHƯƠNG 25 Dạ Lê + THỦY PHÙ 1 three-class spill; QUANG TRUNG 1/8 remains protected');
