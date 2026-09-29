'use strict';
const assert=require('node:assert/strict');
const fs=require('fs');
const P=require('../daily-png-export-v1.js');

assert.equal(P.VERSION,'20260929.6');
assert.equal(P.DEFAULT_WIDTH,1800,'PNG phải thu trực tiếp các cột tiết để bảng cao hơn và dễ đọc trên điện thoại');
assert.equal(P.HTML2CANVAS_URL,'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','thư viện ảnh phải pin version, không dùng latest');
assert.equal(P.JSZIP_URL,'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','JSZip phải pin version, không dùng latest');
assert.equal(P.safeName('KHỐI 1 / 29-09'),'KHOI_1_29-09');
assert.equal(P.chooseScale(1800,2000,2.5),2.5,'ảnh 1800px vẫn giữ scale 2.5 để nét');
assert.ok(P.chooseScale(1800,14000,2.5)<2.5,'ảnh quá cao phải tự hạ scale để tránh vỡ bộ nhớ trên điện thoại');
assert.ok(P.chooseScale(1800,14000,2.5)>=1);

const source=fs.readFileSync('daily-png-export-v1.js','utf8');
assert.match(source,/cloneNode\(true\)/,'phải chụp từ bản sao DOM, không sửa bảng người dùng đang xem');
assert.match(source,/left='-100000px'/,'bản sao xuất ảnh phải nằm ngoài màn hình');
assert.match(source,/overflow:visible!important/,'bảng xuất PNG phải bỏ vùng cuộn để lấy đủ cột');
assert.match(source,/position:static!important/,'sticky header/cột phải được tắt trong ảnh');
assert.match(source,/table-layout:fixed!important/,'ảnh phải chia cột ổn định');
assert.match(source,/width:8%!important/,'cột GV bản cuối phải thu còn 8%');
assert.match(source,/width:6%!important/,'cột TỔNG bản cuối phải thu còn 6%');
assert.match(source,/el\.textContent='TỔNG'/,'PNG phải đổi TỔNG NGÀY thành TỔNG');
assert.match(source,/font-size:16px!important/,'chữ ô tiết phải tăng lại 16px để dễ đọc khi cột đã hẹp hơn');
assert.match(source,/font-size:40px!important/,'tiêu đề PNG phải rõ hơn');
assert.match(source,/white-space:normal!important/,'ô PNG phải cho phép xuống dòng');
assert.match(source,/overflow-wrap:anywhere!important/,'tên trường dài phải có điểm ngắt dòng an toàn');
assert.match(source,/word-break:break-word!important/,'chuỗi địa điểm dài không được bị cắt ngang');
assert.match(source,/overflow:visible!important/,'bản export không được giấu phần chữ tràn');
assert.match(source,/max-height:none!important/,'hàng và nội dung phải được tự nở theo chữ');
assert.match(source,/text-overflow:clip!important/,'không dùng ellipsis/cắt chữ trong ảnh');
assert.match(source,/jszip@3\.10\.1/,'ZIP tuần phải dùng JSZip pin version');
assert.match(source,/compression:'STORE'/,'PNG đã nén nên ZIP phải ưu tiên STORE để giảm CPU/bộ nhớ');
assert.doesNotMatch(source,/localStorage|indexedDB|document\.cookie/,'bộ xuất PNG không được chạm dữ liệu người dùng');
assert.doesNotMatch(source,/setInterval\s*\(/,'bộ xuất PNG không được thêm polling');

console.log('OK daily PNG final: 1800px narrow-period layout, 16px slot text, full wrapping, lazy ZIP');
