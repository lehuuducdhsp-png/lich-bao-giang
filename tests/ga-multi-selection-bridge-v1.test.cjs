'use strict';
const assert=require('node:assert/strict');
const Bridge=require('../ga-multi-selection-bridge-v1.js');

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

console.log('OK GA selection bridge: full selected codes win over filtered/visible checkbox DOM');
