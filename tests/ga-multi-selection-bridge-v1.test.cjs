'use strict';
const assert=require('node:assert/strict');
const Bridge=require('../ga-multi-selection-bridge-v1.js');

assert.equal(Bridge.VERSION,'20260914.2');

const all=[
  {code:'THANH',name:'Hoài Thanh'},
  {code:'DUNG',name:'Dũng'},
  {code:'PHUONG',name:'Phương'}
];

// Ca lỗi thực tế: hệ thống đã chọn 2 GV, nhưng ô tìm kiếm chỉ đang render 1 checkbox.
// Nút GA phải tin danh sách mã đã chọn đầy đủ từ sự kiện multi-selection, không đếm DOM đang hiển thị.
let picked=Bridge.chooseTeachers(all,['THANH','DUNG'],'THANH');
assert.deepEqual(picked.map(x=>x.code),['THANH','DUNG']);
assert.equal(picked.length,2);

// Mã lặp không được nhân đôi.
picked=Bridge.chooseTeachers(all,['THANH','THANH','DUNG'],'');
assert.deepEqual(picked.map(x=>x.code),['THANH','DUNG']);

// Khi chưa có snapshot multi-selection thì vẫn dùng GV đơn hiện tại.
picked=Bridge.chooseTeachers(all,[],'PHUONG');
assert.deepEqual(picked,[{code:'PHUONG',name:'Phương'}]);

// Báo giảng đang xem phải được đồng bộ trạng thái GA từ bản vừa áp dụng nhưng giữ nguyên object
// để mảng reports đóng trong multi-teacher không bị mất liên kết khi đổi người xem.
const target={sheet:'14T09',code:'THANH',teacherName:'Hoài Thanh',entries:[{className:'3/7'}],gaValues:{}};
const source={sheet:'14T09',code:'THANH',teacherName:'Hoài Thanh',entries:[{className:'3/7 (GA 2)'}],gaValues:{'2|Chiều|VY DA|':'2'},__lbgGaProfiles:[{header:2}]};
assert.equal(Bridge.reportKey(target),'14T09|THANH');
assert.equal(Bridge.mergeReportState(target,source),true);
assert.deepEqual(target.gaValues,source.gaValues);
assert.equal(target.entries[0].className,'3/7 (GA 2)');
assert.deepEqual(target.__lbgGaProfiles,[{header:2}]);
assert.equal(Bridge.mergeReportState(target,{sheet:'14T09',code:'DUNG'}),false);

console.log('OK GA selection bridge: full selection survives filtered DOM and multi-preview state keeps applied GA');
