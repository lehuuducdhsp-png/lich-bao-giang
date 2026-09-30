'use strict';
const assert=require('node:assert/strict');
const fs=require('fs');

const school=require('../school-report-v1.js');
const daily=require('../daily-report-v1.js');
const report=fs.readFileSync('report-engine-v4.js','utf8');

const expected=[[3,1],[6,2],[13,3],[16,4],[20,5],[23,6],[27,7],[32,8],[35,9]];
for(const [ga,ordinal] of expected){
  assert.equal(school.stemGaOrdinal(ga),ordinal,`GA ${ga} phải là STEM số ${ordinal}`);
  assert.equal(school.gaText({ga,gaTrack:'stem'}),`GA ${ga} (${ordinal})`);
}
assert.equal(school.stemGaOrdinal(9),null);
assert.equal(school.gaText({ga:9,gaTrack:'kns'}),'GA 9');
assert.equal(school.gaText({ga:3,gaTrack:'kns'}),'GA 3','KNS dù trùng số GA STEM cũng không được thêm ngoặc');

const d=daily.eventLines({schoolName:'TRƯỜNG A',className:'4/1',ga:20,gaTrack:'stem'},'full');
assert.equal(d[2],'GA 20 (5)');
assert.equal(daily.eventLines({schoolName:'TRƯỜNG A',className:'4/1',ga:20,gaTrack:'kns'},'full')[2],'GA 20');

assert.match(report,/const STEM_GA_SEQUENCE=\[3,6,13,16,20,23,27,32,35\]/,'LBG thường phải dùng đúng chuỗi STEM');
assert.match(report,/function stemGaOrdinal\(ga\)/);
assert.match(report,/function reportEntryTrack\(a,e\)/,'LBG thường phải xác định đúng track giáo viên/tiết');
assert.match(report,/LBGGaRoleTrackStaleRepairV1\?\.roleFor/,'phải tái sử dụng bộ nhận diện STEM hiện hành');
assert.match(report,/function gaDisplayValue\(a,d,s,loc\)/);
assert.match(report,/data-stem="\$\{stem\?'1':'0'\}"/,'input GA phải chỉ mang cờ STEM, không đổi kiểu dữ liệu');
assert.match(report,/class="lbg-r4-stem-ordinal"/,'web phải hiển thị số STEM ở suffix riêng');
assert.match(report,/type="number"/,'ô GA gốc vẫn phải là input số');
assert.match(report,/value="\$\{escHtml\(value\)\}"/,'input phải giữ GA gốc, không nhét chuỗi ngoặc vào value');
assert.match(report,/ensureGa\(a\)\[key\]=value/,'lưu GA vẫn chỉ ghi giá trị số đã safeGa xử lý');
assert.match(report,/lines\.push\(\`\(GA \$\{gaDisplayValue\(a,d,s,loc\)\}\)\`\)/,'Excel LBG thường phải dùng nhãn STEM mới');
assert.doesNotMatch(report,/ensureGa\(a\)\[key\].*stemGaOrdinal/,'không được ghi ordinal STEM vào storage');

console.log('OK STEM GA display: 3→1, 6→2, 13→3, 16→4, 20→5, 23→6, 27→7, 32→8, 35→9; storage remains raw GA');
