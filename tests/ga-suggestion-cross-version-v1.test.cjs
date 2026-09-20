'use strict';
const assert=require('node:assert/strict');
const Cross=require('../ga-suggestion-cross-version-v1.js');
const V7=require('../ga-suggestion-v7.js');
assert.equal(Cross.version,'20260920.1');

const ws=(name,entries=[])=>({name,entries});
const book=worksheets=>({worksheets,getWorksheet(name){return worksheets.find(x=>x.name===name)||null}});
const starts={
  '7T9':new Date(2026,8,7,12),
  '14T9':new Date(2026,8,14,12)
};
const opts={
  parser:{scanAssignments(s){return s.entries||[]}},
  roleResolver(){return'KNS'},
  startDateFor(s){return starts[s.name]||null},
  weekLike(){return true}
};

// Bản cũ của cùng tuần có thêm một sự kiện; nếu bị cộng trùng sẽ đẩy GA sai.
const old7=ws('7T9',[
  {code:'THANH',teacherName:'Hoài Thanh',day:2,session:'Sáng',period:1,teachingPeriod:1,schoolName:'THUỶ LƯƠNG',schoolKey:'THUY LUONG',locationKey:'THUY LUONG|',locationLabel:'THUỶ LƯƠNG',classRaw:'2/5',className:'2/5',address:'OLD1'},
  {code:'THANH',teacherName:'Hoài Thanh',day:3,session:'Sáng',period:1,teachingPeriod:1,schoolName:'THUỶ LƯƠNG',schoolKey:'THUY LUONG',locationKey:'THUY LUONG|',locationLabel:'THUỶ LƯƠNG',classRaw:'2/5',className:'2/5',address:'OLD2'}
]);

// Bản mới nhất 7T9 tái hiện đúng file thật: C189 chứa ghi chú giờ học,
// parser cũ hiểu nhầm ghi chú này là một "Địa điểm" nên locationKey khác tuần 14T09.
const operationalNote='+ Buổi sáng: 7h15 có mặt ở trường để quản lý HS lớp, 7h30 vào tiết 1 + Buổi chiều: 13h30 có mặt ở trường để quản lý HS lớp, 13h45 vào tiết 1';
const new7=ws('7T9',[
  {code:'THANH',teacherName:'Hoài Thanh',day:4,session:'Sáng',period:1,teachingPeriod:1,schoolName:'THUỶ LƯƠNG',schoolKey:'THUY LUONG',siteType:'Địa điểm',siteRaw:operationalNote,siteName:operationalNote,siteDisplay:`Địa điểm: ${operationalNote}`,locationKey:'THUY LUONG|BUOI SANG NOTE',locationLabel:`THUỶ LƯƠNG\nĐịa điểm: ${operationalNote}`,classRaw:'2/5',className:'2/5',address:'Y190'},
  {code:'THANH',teacherName:'Hoài Thanh',day:4,session:'Sáng',period:3,teachingPeriod:3,schoolName:'THUỶ LƯƠNG',schoolKey:'THUY LUONG',siteType:'Địa điểm',siteRaw:operationalNote,siteName:operationalNote,siteDisplay:`Địa điểm: ${operationalNote}`,locationKey:'THUY LUONG|BUOI SANG NOTE',locationLabel:`THUỶ LƯƠNG\nĐịa điểm: ${operationalNote}`,classRaw:'2/4',className:'2/4',address:'AA190'}
]);

const current14=ws('14T9',[
  {code:'THANH',teacherName:'Hoài Thanh',day:4,session:'Sáng',period:1,teachingPeriod:1,schoolName:'THUỶ LƯƠNG',schoolKey:'THUY LUONG',locationKey:'THUY LUONG|',locationLabel:'THUỶ LƯƠNG',classRaw:'2/5',className:'2/5',address:'Y210'},
  {code:'THANH',teacherName:'Hoài Thanh',day:4,session:'Sáng',period:3,teachingPeriod:3,schoolName:'THUỶ LƯƠNG',schoolKey:'THUY LUONG',locationKey:'THUY LUONG|',locationLabel:'THUỶ LƯƠNG',classRaw:'2/4',className:'2/4',address:'AA210'}
]);

const sources=[
  {id:'old',created:'2026-09-07T08:00:00Z',book:book([old7])},
  {id:'revised',created:'2026-09-10T08:00:00Z',book:book([new7])},
  {id:'active',created:'2026-09-12T08:00:00Z',book:book([current14])}
];
const currentBook=sources[2].book;

const picked=Cross.selectWeekSheets(sources,currentBook,'14T9',opts);
assert.equal(picked.weekCount,2,'chỉ lấy một bản mới nhất cho mỗi tuần');
assert.equal(picked.worksheets[0],new7,'tuần 7T9 phải dùng bản cập nhật mới nhất, không dùng bản cũ');
assert.equal(picked.worksheets[1],current14,'tuần đang chọn luôn dùng workbook hiện tại');

assert.equal(Cross.isOperationalNoteSite(new7.entries[0]),true,'ghi chú giờ vào học phải được nhận diện là ghi chú, không phải địa điểm');
const normalized=Cross.normalizeHistoryEntry(new7.entries[0]);
assert.equal(normalized.locationKey,'THUY LUONG|','lịch sử phải quy về đúng khóa trường THUỶ LƯƠNG');
assert.equal(normalized.siteRaw,'');

const history=Cross.buildHistoryAcrossSources(V7,sources,currentBook,'14T9',opts);
const c25=history.byAddress.get('14T9!Y210');
const c24=history.byAddress.get('14T9!AA210');
assert.ok(c25&&c24,'phải ghép được hai lớp hiện tại với lịch sử');
assert.equal(c25.ga,2,'2/5 đã có GA1 tuần trước nên 16/9 phải gợi ý GA2');
assert.equal(c24.ga,2,'2/4 đã có GA1 tuần trước nên 16/9 phải gợi ý GA2');
assert.match(V7.basisText(c25),/GA gần nhất/);
assert.match(V7.basisText(c24),/GA gần nhất/);
console.log('OK GA cross-version: THUỶ LƯƠNG note-in-site normalized; Hoài Thanh 2/5 & 2/4 advance GA1 -> GA2');

// Ca thực tế HUỆ 3/9: workbook hiện tại đã chứa đủ 7T9 / 14T9 / 21T9.
// Một phiên bản lưu sau đó có 7T9 cũ sai (2 lần KNS cho 3/9). Trước đây bản lưu sau
// có thể đè 7T9 của workbook đang mở, khiến 10/9 thành GA2 và 24/9 nhảy lên GA4.
const hueStarts={
  '7T9':new Date(2026,8,7,12),
  '8T9':new Date(2026,8,8,12), // lịch năm học khác, lệch nhịp tuần hiện tại
  '14T9':new Date(2026,8,14,12),
  '21T9':new Date(2026,8,21,12)
};
const hueEntry=(code,day,address)=>({
  code,teacherName:code==='HƯƠNG'?'Phan Thị Quý Hương':'Phan Thị Huệ',
  day,session:'Sáng',period:5,teachingPeriod:5,
  schoolName:'THỦY PHƯƠNG',schoolKey:'THUY PHUONG',
  locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
  classRaw:'3/9',className:'3/9',address
});
const currentHue7=ws('7T9',[hueEntry('HUỆ',5,'AM176')]);
const currentHue14=ws('14T9',[hueEntry('HƯƠNG',5,'AM170')]);
const currentHue21=ws('21T9',[hueEntry('HUỆ',5,'AM170')]);

// Bản stale 7T9 có thêm một lượt KNS giả/cũ cho cùng 3/9. Nếu bản này thắng,
// chuỗi KNS sẽ thành GA1 -> GA2 ngay trong 7T9, và 21T9 sẽ bị đẩy thành GA4.
const staleHue7=ws('7T9',[
  hueEntry('HUỆ',3,'OLD-HUE-1'),
  hueEntry('HUỆ',5,'OLD-HUE-2')
]);
// Sheet 8T9 mô phỏng workbook năm học khác: không được chen vào lịch tuần 7 ngày của 2026-2027.
const foreign8=ws('8T9',[{
  code:'KHÁC',teacherName:'Giáo viên khác',day:5,session:'Sáng',period:5,teachingPeriod:5,
  schoolName:'THỦY PHƯƠNG',schoolKey:'THUY PHUONG',
  locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
  classRaw:'4/1',className:'4/1',address:'FOREIGN-8T9'
}]);

const currentHueBook=book([currentHue7,currentHue14,currentHue21]);
const hueSources=[
  {id:'active-current',created:'2026-09-20T07:00:00Z',book:currentHueBook},
  {id:'later-stale',created:'2026-09-20T08:00:00Z',book:book([staleHue7,foreign8])}
];
const hueOpts={
  parser:{scanAssignments(s){return s.entries||[]}},
  roleResolver(ws,code){return String(code).toUpperCase()==='HƯƠNG'?'STEM':'KNS'},
  startDateFor(s){return hueStarts[s.name]||null},
  weekLike(){return true}
};

const huePicked=Cross.selectWeekSheets(hueSources,currentHueBook,'21T9',hueOpts);
assert.deepEqual(huePicked.worksheets.map(x=>x.name),['7T9','14T9','21T9'],
  'lịch sử phải chỉ theo nhịp tuần hiện tại; 8T9 của năm học khác không được chen vào');
assert.equal(huePicked.worksheets[0],currentHue7,
  '7T9 trong workbook đang mở phải thắng mọi bản 7T9 cũ dù bản cũ có timestamp muộn hơn');

const hueHistory=Cross.buildHistoryAcrossSources(V7,hueSources,currentHueBook,'21T9',hueOpts);
const hue7=hueHistory.byAddress.get('7T9!AM176');
const hue14=hueHistory.byAddress.get('14T9!AM170');
const hue21=hueHistory.byAddress.get('21T9!AM170');
assert.ok(hue7&&hue14&&hue21,'phải ghép được đủ 3 mốc thật của lớp 3/9');
assert.equal(hue7.track,'kns');
assert.equal(hue7.ga,1,'7T9 HUỆ – KNS phải là GA1');
assert.equal(hue14.track,'stem');
assert.equal(hue14.ga,3,'14T9 HƯƠNG đỏ – STEM phải là GA3 độc lập');
assert.equal(hue21.track,'kns');
assert.equal(hue21.ga,2,'21T9 HUỆ – KNS phải tiếp GA1 -> GA2, tuyệt đối không bị STEM đẩy thành GA4');
assert.equal(hue21.previousEvents.length,1);
assert.equal(hue21.previousEvents[0],hue7,'mốc KNS gần nhất của 3/9 phải là 7T9 GA1');
assert.match(V7.basisText(hue21),/GA 1/,'căn cứ phải nói mốc gần nhất là GA1');
assert.match(V7.basisText(hue21),/GA 2/,'căn cứ phải kết luận lần KNS kế tiếp là GA2');

console.log('OK HUỆ 3/9: current workbook authoritative; KNS GA1 -> STEM GA3 riêng -> KNS GA2; stale 7T9 không còn đẩy thành GA4');
