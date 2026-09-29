'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');

const source=fs.readFileSync('report-engine-v4.js','utf8');
const document={
  readyState:'complete',
  body:{},
  head:{appendChild(){}},
  getElementById(){return null},
  createElement(){return{style:{},dataset:{},addEventListener(){}}},
  addEventListener(){}
};
const window={document,addEventListener(){},requestAnimationFrame(fn){fn()},setTimeout,clearTimeout};
const sandbox={
  window,document,console,setTimeout,clearTimeout,
  requestAnimationFrame:window.requestAnimationFrame,
  MutationObserver:class{observe(){} disconnect(){}},
  localStorage:{getItem(){return null},setItem(){}},
  Blob:function(){}
};
window.window=window;
vm.runInNewContext(source,sandbox,{filename:'report-engine-v4.js'});
const R=window.LBGReportEngineV4;
assert.ok(R,'Report Engine V4 phải expose API');

const thuyLuong={
  schoolName:'THỦY LƯƠNG',
  siteDisplay:'+ Buổi sáng: 7h15 có mặt ở trường để quản lý HS lớp, 7h30 vào tiết 1 + Buổi chiều: 13h30 có mặt ở trường để quản lý HS lớp, 13h45 vào tiết 1',
  locationKey:'THUY LUONG|RAW-NOTE'
};
assert.equal(R.dailyLocationText(thuyLuong),'THỦY LƯƠNG');
const loc=R.locationList({entries:[{...thuyLuong,day:2,session:'Sáng'}]},2,'Sáng')[0];
assert.equal(loc.schoolName,'THỦY LƯƠNG');
assert.equal(loc.siteDisplay,'','LBG thường tại Thủy Lương chỉ được hiện tên trường');
assert.equal(loc.key,'THUY LUONG|RAW-NOTE','làm sạch hiển thị tuyệt đối không được đổi locationKey');

const longDaily={
  schoolName:'PHÚ AN',
  siteDisplay:'Lại Ân: 3/5, 4/5, 5/5 <br>Tiên Nộn 2/6, 3/6, 4/6, 5/6 <br>Phú Thanh: 1/6, 1/7, 2/7, 2/8, 3/7, 3/8, 4/7, 4/7, 5/7, 5/8 <br>Còn lại là cơ sở chính'
};
assert.equal(R.dailyLocationText(longDaily),'PHÚ AN','ghi chú phân lớp theo cơ sở phải bị bỏ khỏi Lịch theo ngày');

assert.equal(
  R.dailyLocationText({schoolName:'TRƯỜNG A',siteDisplay:'13 14 23 24 33 34 43 44 54 55 là cơ sở lẻ'}),
  'TRƯỜNG A'
);
assert.equal(
  R.dailyLocationText({schoolName:'TRƯỜNG B',siteDisplay:'(Thanh Lam Bồ (khối 1,2,3), Dưỡng Mong (khối 4,5))'}),
  'TRƯỜNG B'
);
assert.equal(
  R.dailyLocationText({schoolName:'PHÚ BÌNH',siteDisplay:'Cơ sở 1: PHÚ HẬU CŨ'}),
  'PHÚ BÌNH • Cơ sở 1: PHÚ HẬU CŨ',
  'cơ sở thật phải được giữ lại'
);
assert.equal(
  R.dailyLocationText({schoolName:'HÀ THẾ HẠNH',siteDisplay:'Trường chính: TỨ HẠ 2 CŨ'}),
  'HÀ THẾ HẠNH • Trường chính: TỨ HẠ 2 CŨ'
);

console.log('OK location display cleanup: Thủy Lương compact, daily admin notes removed, real sites and locationKey preserved');
