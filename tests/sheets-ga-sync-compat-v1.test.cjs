'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

global.window={};
global.document={addEventListener(){}};

global.result=null;
vm.runInThisContext(fs.readFileSync('sheets-ga-sync-compat-v1.js','utf8'),{filename:'sheets-ga-sync-compat-v1.js'});

const api=window.LBGSheetsGaSyncCompatV1;
assert.ok(api&&typeof api.hydrate==='function','Phải xuất helper hydrate để kiểm thử');

const report={
  gaValues:{
    '2|Sáng|THUY PHUONG|TRU SO CHINH - 25 DA LE':'1',
    '3|Sáng|THUY DUONG|TRUONG CHINH - 40 VO DUY NINH':'12'
  },
  entries:[
    {
      day:2,session:'Sáng',
      schoolName:'THỦY PHƯƠNG',
      siteDisplay:'Trụ sở chính: 25 Dạ Lê',
      locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 Dạ Lê',
      locationKey:'THUY PHUONG|TRU SO CHINH - 25 DA LE'
    },
    {
      day:3,session:'Sáng',
      schoolName:'THỦY DƯƠNG',
      siteDisplay:'Trường chính: 40 Võ Duy Ninh – THỦY DƯƠNG CŨ',
      locationLabel:'THỦY DƯƠNG\nTrường chính: 40 Võ Duy Ninh – THỦY DƯƠNG CŨ',
      locationKey:'THUY DUONG|TRUONG CHINH - 40 VO DUY NINH'
    }
  ]
};

const before=Object.keys(report.gaValues).length;
const outcome=api.hydrate(report);
assert.ok(outcome.added>=2,'Phải thêm alias tương thích cho Google Apps Script');
assert.strictEqual(report.gaValues['2|Sáng|THỦY PHƯƠNG\nTrụ sở chính: 25 Dạ Lê'],'1','GA Thủy Phương phải có alias đúng chuỗi địa điểm gửi sang Sheets');
assert.strictEqual(report.gaValues['3|Sáng|THỦY DƯƠNG\nTrường chính: 40 Võ Duy Ninh – THỦY DƯƠNG CŨ'],'12','GA hai chữ số phải được giữ nguyên khi tạo alias');
assert.ok(Object.keys(report.gaValues).length>before,'Không được xoá key GA chuẩn mới khi thêm alias');

// Ca thực tế vừa phát hiện: parser entry có thể chưa có locationKey. Khi đó
// report-engine-v4 tự tạo khóa bằng fold(schoolName)|fold(siteDisplay).
const noLocationKey={
  gaValues:{
    '2|Sáng|THUY PHUONG|TRU SO CHINH: 25 DA LE':'7'
  },
  entries:[{
    day:2,session:'Sáng',
    schoolName:'THỦY PHƯƠNG',
    school:'THỦY PHƯƠNG',
    siteDisplay:'Trụ sở chính: 25 Dạ Lê'
  }]
};
const missingKeyOutcome=api.hydrate(noLocationKey);
assert.ok(missingKeyOutcome.added>=1,'Phải tìm được GA ngay cả khi entry không có locationKey');
assert.strictEqual(
  noLocationKey.gaValues['2|Sáng|THỦY PHƯƠNG\nTrụ sở chính: 25 Dạ Lê'],
  '7',
  'Phải tạo alias đúng chuỗi entry.school mà Apps Script dùng để tra GA'
);

const legacy={
  gaValues:{'6|Chiều|VỸ DẠ':'3'},
  entries:[{day:6,session:'Chiều',schoolName:'VỸ DẠ',locationLabel:'VỸ DẠ',locationKey:'VY DA|'}]
};
api.hydrate(legacy);
assert.strictEqual(legacy.gaValues['6|Chiều|VỸ DẠ'],'3','GA cũ theo tên trường vẫn phải tương thích');
assert.strictEqual(legacy.gaValues['6|Chiều|VY DA|'],'3','GA cũ phải được bổ sung key locationKey mới');

console.log('OK Google Sheets GA compatibility: explicit + fallback location keys preserved');
