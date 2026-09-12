'use strict';
const assert=require('node:assert/strict');
const mod=require('../monthly-excel-polish-safe-v1.js');

assert.equal(mod.isMonthlyFilename('Hoài Thanh - Bảng kê tiết dạy tháng 09 năm 2026.xlsx'),true);
assert.equal(mod.isMonthlyFilename('BANG_KE_TIET_DAY_THANG_09_2026.xlsx'),true);
assert.equal(mod.isMonthlyFilename('LICH_BAO_GIANG_HOAI_THANH.xlsx'),false);
assert.equal(mod.isMonthlyFilename('Bảng kê tiết dạy tháng 09.pdf'),false);
assert.equal(mod.estimatedLines('Dòng chữ rất dài cần xuống dòng',6)>1,true);
assert.equal(mod.estimatedLines('Ngắn',20),1);

console.log('monthly-excel-polish-safe-v1: OK');
