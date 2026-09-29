'use strict';
const assert=require('node:assert/strict');
const fs=require('fs');
const P=require('../daily-png-export-v1.js');

assert.equal(P.VERSION,'20260929.1');
assert.equal(P.DEFAULT_WIDTH,2400,'PNG phải dựng bảng ở khổ rộng cố định để không phụ thuộc viewport');
assert.equal(P.HTML2CANVAS_URL,'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','thư viện phải pin version, không dùng latest');
assert.equal(P.safeName('KHỐI 1 / 29-09'),'KHOI_1_29-09');
assert.equal(P.chooseScale(2400,1500,2),2,'ảnh ngày bình thường nên giữ scale 2');
assert.ok(P.chooseScale(2400,9000,2)<2,'ảnh quá cao phải tự hạ scale để tránh vỡ bộ nhớ trên điện thoại');
assert.ok(P.chooseScale(2400,9000,2)>=1);

const source=fs.readFileSync('daily-png-export-v1.js','utf8');
assert.match(source,/cloneNode\(true\)/,'phải chụp từ bản sao DOM, không sửa bảng người dùng đang xem');
assert.match(source,/left='-100000px'/,'bản sao xuất ảnh phải nằm ngoài màn hình');
assert.match(source,/overflow:visible!important/,'bảng xuất PNG phải bỏ vùng cuộn để lấy đủ cột');
assert.match(source,/position:static!important/,'sticky header/cột phải được tắt trong ảnh');
assert.match(source,/table-layout:fixed!important/,'ảnh phải chia cột ổn định');
assert.doesNotMatch(source,/localStorage|indexedDB|document\.cookie/,'bộ xuất PNG không được chạm dữ liệu người dùng');
assert.doesNotMatch(source,/setInterval\s*\(/,'bộ xuất PNG không được thêm polling');

console.log('OK daily PNG exporter: fixed full-width clone, memory-safe scale, pinned lazy library, no data mutation');
