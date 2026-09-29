'use strict';
const assert=require('node:assert/strict');
const fs=require('fs');
const P=require('../daily-png-export-v1.js');

assert.equal(P.VERSION,'20260929.3');
assert.equal(P.DEFAULT_WIDTH,3000,'PNG V2 phải dựng bảng rộng hơn để chữ rõ và vẫn đủ toàn bộ cột');
assert.equal(P.HTML2CANVAS_URL,'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','thư viện ảnh phải pin version, không dùng latest');
assert.equal(P.JSZIP_URL,'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','JSZip phải pin version, không dùng latest');
assert.equal(P.safeName('KHỐI 1 / 29-09'),'KHOI_1_29-09');
assert.equal(P.chooseScale(3000,1200,2.5),2.5,'ảnh ngày bình thường nên giữ scale 2.5 để nét hơn');
assert.ok(P.chooseScale(3000,9000,2.5)<2.5,'ảnh quá cao phải tự hạ scale để tránh vỡ bộ nhớ trên điện thoại');
assert.ok(P.chooseScale(3000,9000,2.5)>=1);

const source=fs.readFileSync('daily-png-export-v1.js','utf8');
assert.match(source,/cloneNode\(true\)/,'phải chụp từ bản sao DOM, không sửa bảng người dùng đang xem');
assert.match(source,/left='-100000px'/,'bản sao xuất ảnh phải nằm ngoài màn hình');
assert.match(source,/overflow:visible!important/,'bảng xuất PNG phải bỏ vùng cuộn để lấy đủ cột');
assert.match(source,/position:static!important/,'sticky header/cột phải được tắt trong ảnh');
assert.match(source,/table-layout:fixed!important/,'ảnh phải chia cột ổn định');
assert.match(source,/width:9%!important/,'cột GV trong PNG phải thu còn 9%');
assert.match(source,/width:7%!important/,'cột TỔNG trong PNG phải thu còn 7%');
assert.match(source,/el\.textContent='TỔNG'/,'PNG phải đổi TỔNG NGÀY thành TỔNG');
assert.match(source,/font-size:16px!important/,'chữ trong ô phải cân bằng giữa độ rõ và khả năng hiển thị đủ tên trường');
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

console.log('OK daily PNG V2: sharper 3000px layout, narrow GV/TỔNG, lazy pinned ZIP, memory-safe scale, no data mutation');
