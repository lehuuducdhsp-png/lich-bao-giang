'use strict';
const assert=require('node:assert/strict');
const M=require('../assist-p-excel-export-parity-v1.js');

assert.equal(M.classWithP({className:'1/1'}),'1/1 (P)');
assert.equal(M.classWithP({className:'',classRaw:''}),'Lớp không xác định (P)');
assert.equal(M.assistLabel(4),'4 Trợ (P)');
assert.equal(M.assistAppendFragment('1/3','1/3 (P)'),' (P)');
assert.equal(M.assistAppendFragment('1/3 (GA 2)','1/3 (P)'),' (P)');
assert.equal(M.assistAppendFragment('1/3','1/4 (P)'),' & 1/4 (P)');

const oldLayout=[
 ['LỊCH BÁO GIẢNG'],['Tuần'],['Ngày'],['Buổi','Tiết','Thứ 2'],
 ['Sáng','Tiết'],['','Tiết 1'],['','Tiết 2'],['','Tiết 3'],['','Tiết 4'],['','Tiết 5'],
 ['Chiều','Tiết'],['','Tiết 1'],['','Tiết 2'],['','Tiết 3'],['','Tiết 4'],['','Tiết 5'],
 ['TỔNG: 14 tiết']
];
assert.deepEqual(M.detectReportLayoutRows(oldLayout),{
 headerRow:4,morningHeadRow:5,morningFirstPeriodRow:6,afternoonHeadRow:11,afternoonFirstPeriodRow:12,footerRow:17
});

// Bố cục thực tế của file LBG NGŨ TINH sau lớp branding: thêm 3 hàng trên đầu.
const branded=[
 ['','','Trung tâm giáo dục kỹ năng sống Hoàn Năng'],[''],[''],
 ['LỊCH BÁO GIẢNG'],['Tuần'],['Ngày'],['Buổi','Tiết','Thứ 2'],
 ['Sáng','Tiết'],['','Tiết 1'],['','Tiết 2'],['','Tiết 3'],['','Tiết 4'],['','Tiết 5'],
 ['Chiều','Tiết'],['','Tiết 1'],['','Tiết 2'],['','Tiết 3'],['','Tiết 4'],['','Tiết 5'],
 ['TỔNG: 14 tiết']
];
const layout=M.detectReportLayoutRows(branded);
assert.deepEqual(layout,{
 headerRow:7,morningHeadRow:8,morningFirstPeriodRow:9,afternoonHeadRow:14,afternoonFirstPeriodRow:15,footerRow:20
});

// Hoài Thanh trong ảnh web: P sáng tiết 5 + chiều tiết 1/3/5 phải rơi đúng các hàng 13/15/17/19;
// footer 4 Trợ (P) nằm hàng 20. Đây là lỗi file Excel cũ do hard-code 5/11/17.
assert.equal(M.targetRow(layout,'Sáng',5),13);
assert.equal(M.targetRow(layout,'Chiều',1),15);
assert.equal(M.targetRow(layout,'Chiều',3),17);
assert.equal(M.targetRow(layout,'Chiều',5),19);
assert.equal(layout.footerRow,20);

console.log('OK Excel/web parity: branded layout detected; P rows match web and same-class P labels are compact.');
