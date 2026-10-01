'use strict';
const assert=require('node:assert/strict');
const Cross=require('../ga-suggestion-cross-version-v1.js');
const V7=require('../ga-suggestion-v7.js');

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


// Regression thực tế PHÚ THUẬN CŨ từ file TKB 7T9 → 28T9:
// 7T9 chưa có dòng ghi chú cơ sở lẻ, các tuần sau có thêm ghi chú,
// nhưng đây vẫn là cùng Trường chính: PHÚ THUẬN CŨ.
const phuThuanOld7Site={
  schoolName:'PHÚ THUẬN',schoolKey:'PHU THUAN',
  siteType:'Trường chính',siteRaw:'TRƯỜNG CHÍNH - PHÚ THUẬN CŨ',
  siteName:'PHÚ THUẬN CŨ',siteDisplay:'Trường chính: PHÚ THUẬN CŨ',
  locationKey:'PHU THUAN|TRUONG CHINH|PHU THUAN CU',
  locationLabel:'PHÚ THUẬN\\nTrường chính: PHÚ THUẬN CŨ'
};
const phuThuanOldLaterSite={
  schoolName:'PHÚ THUẬN',schoolKey:'PHU THUAN',
  siteType:'Trường chính',
  siteRaw:'TRƯỜNG CHÍNH - PHÚ THUẬN CŨ 13 14 23 24 33 34 43 44 54 55 là cơ sở lẻ',
  siteName:'PHÚ THUẬN CŨ – 13 14 23 24 33 34 43 44 54 55 là cơ sở lẻ',
  siteDisplay:'Trường chính: PHÚ THUẬN CŨ – 13 14 23 24 33 34 43 44 54 55 là cơ sở lẻ',
  locationKey:'PHU THUAN|TRUONG CHINH|PHU THUAN CU 13 14 23 24 33 34 43 44 54 55 LA CO SO LE',
  locationLabel:'PHÚ THUẬN\\nTrường chính: PHÚ THUẬN CŨ – 13 14 23 24 33 34 43 44 54 55 là cơ sở lẻ'
};
assert.equal(Cross.isPhuThuanOldMainSite(phuThuanOld7Site),true);
assert.equal(Cross.isPhuThuanOldMainSite(phuThuanOldLaterSite),true);
const pt7Normalized=Cross.normalizeHistoryEntry(phuThuanOld7Site);
const ptLaterNormalized=Cross.normalizeHistoryEntry(phuThuanOldLaterSite);
assert.equal(pt7Normalized.locationKey,'PHU THUAN|TRUONG CHINH|PHU THUAN CU');
assert.equal(ptLaterNormalized.locationKey,pt7Normalized.locationKey,'ghi chú cơ sở lẻ không được tách lịch sử PHÚ THUẬN CŨ thành địa điểm mới');
assert.equal(ptLaterNormalized.siteDisplay,'Trường chính: PHÚ THUẬN CŨ');

const ptClasses=['4/2','4/1','5/1','5/2'];
const makePtEntries=(code,site,rowPrefix)=>ptClasses.map((cls,i)=>({
  code,teacherName:code,day:6,session:'Sáng',period:i+1,teachingPeriod:i+1,
  ...site,classRaw:cls,className:cls,address:`${rowPrefix}${i+1}`
}));
const pt7=ws('7T9',makePtEntries('VÂN',phuThuanOld7Site,'PT7_'));
const pt14=ws('14T9',makePtEntries('KHÁNH',phuThuanOldLaterSite,'PT14_'));
const pt21=ws('21T9',makePtEntries('LINH2',phuThuanOldLaterSite,'PT21_'));
const pt28=ws('28T9',makePtEntries('ĐỨC',phuThuanOldLaterSite,'PT28_'));
const ptStarts={
  '7T9':new Date(2026,8,7,12),'14T9':new Date(2026,8,14,12),
  '21T9':new Date(2026,8,21,12),'28T9':new Date(2026,8,28,12)
};
const ptSources=[
  {id:'pt7',created:'2026-09-07T08:00:00Z',book:book([pt7])},
  {id:'pt14',created:'2026-09-14T08:00:00Z',book:book([pt14])},
  {id:'pt21',created:'2026-09-21T08:00:00Z',book:book([pt21])},
  {id:'pt28',created:'2026-09-28T08:00:00Z',book:book([pt28])}
];
const ptHistory=Cross.buildHistoryAcrossSources(V7,ptSources,ptSources[3].book,'28T9',{
  parser:{scanAssignments(s){return s.entries||[]}},
  roleResolver(ws,code){return ws.name==='14T9'&&code==='KHÁNH'?'STEM':'KNS'},
  startDateFor(s){return ptStarts[s.name]||null},
  weekLike(){return true}
});
for(let i=0;i<ptClasses.length;i++){
  assert.equal(ptHistory.byAddress.get(`7T9!PT7_${i+1}`)?.ga,1,`${ptClasses[i]} tuần 7T9 phải là KNS GA1`);
  assert.equal(ptHistory.byAddress.get(`14T9!PT14_${i+1}`)?.ga,3,`${ptClasses[i]} tuần 14T9 là STEM riêng GA3`);
  assert.equal(ptHistory.byAddress.get(`21T9!PT21_${i+1}`)?.ga,2,`${ptClasses[i]} tuần 21T9 phải nối KNS GA1 → GA2`);
  assert.equal(ptHistory.byAddress.get(`28T9!PT28_${i+1}`)?.ga,4,`${ptClasses[i]} tuần 28T9 phải nối KNS GA2 → GA4`);
}


const q14=ws('14T9',[
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:2,session:'Sáng',period:1,teachingPeriod:1,schoolName:'QUANG TRUNG',schoolKey:'QUANG TRUNG',locationKey:'QUANG TRUNG|',locationLabel:'QUANG TRUNG',classRaw:'1/2',className:'1/2',address:'Q14'}
]);
const q21=ws('21T9',[
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:2,session:'Sáng',period:1,teachingPeriod:1,schoolName:'QUANG TRUNG',schoolKey:'QUANG TRUNG',locationKey:'QUANG TRUNG|',locationLabel:'QUANG TRUNG',classRaw:'1/2',className:'1/2',address:'Q21'},
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:2,session:'Sáng',period:2,teachingPeriod:2,schoolName:'QUANG TRUNG',schoolKey:'QUANG TRUNG',locationKey:'QUANG TRUNG|',locationLabel:'QUANG TRUNG',classRaw:'2/5',className:'2/5',address:'Q21_25'}
]);
const qStarts={'14T9':new Date(2026,8,14,12),'21T9':new Date(2026,8,21,12)};
const qSources=[
  {id:'old-14',created:'2026-09-15T08:00:00Z',book:book([q14])},
  {id:'active-21',created:'2026-09-21T08:00:00Z',book:book([q21])}
];
const qHistory=Cross.buildHistoryAcrossSources(V7,qSources,qSources[1].book,'21T9',{
  parser:{scanAssignments(s){return s.entries||[]}},
  roleResolver(){return'KNS'},
  startDateFor(s){return qStarts[s.name]||null},
  weekLike(){return true}
});
assert.equal(qHistory.byAddress.get('14T9!Q14'),undefined,'cross-version cũng phải bỏ QUANG TRUNG 14T9');
assert.equal(qHistory.byAddress.get('21T9!Q21').ga,2,'cross-version phải giữ mốc 21T9: lớp 1/2 là GA2');
assert.equal(qHistory.byAddress.get('21T9!Q21_25').ga,1,'cross-version phải giữ mốc 21T9: lớp 2/5 là GA1');

console.log('OK GA cross-version: THUỶ LƯƠNG note normalized; PHÚ THUẬN CŨ keeps one history key and 7T9 GA1 -> 21T9 GA2 -> 28T9 GA4; Quang Trung anchors preserved.');