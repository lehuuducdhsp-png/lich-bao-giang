'use strict';
const assert=require('node:assert/strict');
const R=require('../tkb-roster-group-period-safe-v1.js');
const GA=require('../ga-suggestion-v7.js');
const Cross=require('../ga-suggestion-cross-version-v1.js');
const PerClass=require('../ga-per-class-v2.js');
assert.equal(R.VERSION,'20261113.3');
// 07T9–09T11 dùng CƠ SỞ 1 - PHÚ HẬU CŨ và CỞ SỞ 2 - PHÚ BÌNH CŨ.
// 16T11 chỉ đổi tên hiển thị, không phải hai cơ sở mới.
const cells=new Map([
 ['B81','PHÚ BÌNH'],['B95','HƯƠNG VINH'],
 ['AB81','CƠ SỞ PHÚ BÌNH\nHỌC TIẾT 4 CHIỀU THỨ 4'],
 ['AQ81','CƠ SỞ PHÚ HẬU\nHỌC TIẾT 5 SÁNG THỨ 6']
]);
const colName=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s};
const ws={name:'16T11',rowCount:120,model:{merges:['B81:B94','B95:B110','AB81:AC94','AQ81:AR94']},
 getCell(row,col){const a=colName(col)+row,v=cells.get(a)||'';return{text:v,value:v,address:a}}};
const parser={locationAt(_w,r){return r<=94?{schoolName:'PHÚ BÌNH',school:'PHÚ BÌNH',locationKey:'PHU BINH|'}:
  {schoolName:'HƯƠNG VINH',school:'HƯƠNG VINH',locationKey:'HUONG VINH|'}},
 buildHeader(){return{headerRow:4}}};
function current(row,col,cls,code){
 return R.normalizeEntry(ws,{row,col,classRow:row-1,className:cls,classRaw:cls,classType:'single',code,sourceCode:code,
  day:4,session:'Chiều',period:1,school:'PHÚ BÌNH',schoolName:'PHÚ BÌNH',locationKey:'PHU BINH|',address:colName(col)+row},parser);
}
const binh=current(82,32,'1/6','CTV'),hau=current(82,47,'1/3','DUNG');
const binhOld='PHU BINH|CO SO 2|PHU BINH CU',hauOld='PHU BINH|CO SO 1|PHU HAU CU';
const binhWrong='PHU BINH|CO SO|PHU BINH',hauWrong='PHU BINH|CO SO|PHU HAU';
assert.equal(binh.schoolName,'PHÚ BÌNH');assert.equal(hau.schoolName,'PHÚ BÌNH');
assert.equal(binh.siteDisplay,'Cơ sở: Phú Bình');assert.equal(hau.siteDisplay,'Cơ sở: Phú Hậu');
assert.equal(binh.locationKey,binhOld);assert.equal(hau.locationKey,hauOld);
assert.notEqual(binh.locationKey,hau.locationKey);
assert.deepEqual(binh.gaLegacyLocationKeys,[binhWrong]);assert.deepEqual(hau.gaLegacyLocationKeys,[hauWrong]);
assert.equal(binh.day,4);assert.equal(binh.period,4);
assert.equal(hau.day,6);assert.equal(hau.period,5);
assert.equal(R.specialScheduleHintAt(ws,95,31,parser).location.locationKey,binhOld);
assert.equal(R.specialScheduleHintAt(ws,95,45,parser).location.locationKey,hauOld);
assert.equal(R.specialScheduleHintAt(ws,97,31,parser),null);
const priorBinh={code:'TÂM',className:'1/6',classRaw:'1/6',classType:'single',schoolName:'PHÚ BÌNH',school:'PHÚ BÌNH',
 siteRaw:'CỞ SỞ 2 - PHÚ BÌNH CŨ',siteDisplay:'Cơ sở 2: PHÚ BÌNH CŨ',locationKey:binhOld,
 day:4,session:'Chiều',period:3,address:'AO88'};
const priorHau={code:'ĐỨC',className:'1/3',classRaw:'1/3',classType:'single',schoolName:'PHÚ BÌNH',school:'PHÚ BÌNH',
 siteRaw:'CƠ SỞ 1 - PHÚ HẬU CŨ',siteDisplay:'Cơ sở 1: PHÚ HẬU CŨ',locationKey:hauOld,
 day:4,session:'Chiều',period:1,address:'AD85'};
assert.equal(GA.phuBinhCs2Week26Ga8({sheet:'26T10',track:'kns',members:['1/6'],atoms:[priorBinh]}),8);
const weeks=[{name:'26T10',rows:[priorBinh]},{name:'09T11',rows:[priorHau]},{name:'16T11',rows:[binh,hau]}];
const dates={'26T10':new Date(2026,9,26,12),'09T11':new Date(2026,10,9,12),'16T11':new Date(2026,10,16,12)};
const history=GA.buildHistory({worksheets:weeks},'16T11',{
 parser:{scanAssignments:w=>w.rows},roleResolver:(_w,code)=>code==='CTV'?'CTV':'KNS',
 startDateFor:w=>dates[w.name],weekLike:()=>true
});
const b=history.byAddress.get('16T11!AF82'),h=history.byAddress.get('16T11!AU82');
assert.ok(b&&h);
assert.ok(b.previousEvents.length);assert.ok(h.previousEvents.length);
assert.equal(b.ga,9,'GA8 KNS 26T10 -> GA9 16T11 trong fixture chỉ có 2 lượt');
assert.equal(h.ga,2,'GA1 KNS 09T11 -> GA2 16T11 trong fixture chỉ có 2 lượt');
assert.notEqual(b.gaSource,'first');assert.notEqual(h.gaSource,'first');
// Dữ liệu GA đã nhập thủ công trong phiên bản 13/11 phải còn đọc được; không xóa/sửa dữ liệu cũ.
for(const [e,alias,day,session] of [[binh,binhWrong,4,'Chiều'],[hau,hauWrong,6,'Sáng']]){
 const cls=PerClass.entryClassKey(e,GA.normalizeClass);
 const savedKey=PerClass.classGaKey(day,session,alias,cls);
 const saved={[savedKey]:'11'};
 const profiles=PerClass.buildProfiles([e],saved,GA.normalizeClass);
 assert.equal(profiles.length,1);assert.equal(profiles[0].header,11);
 const target=Cross.entryApplyTarget(e,{school:e.schoolName});
 assert.equal(target.locationKey,e.locationKey);
 assert.equal(Cross.currentGaRaw({[String(day)+'|'+session+'|'+alias]:'11'},target),'11');
 assert.equal(saved[savedKey],'11','Giữ nguyên giá trị đã lưu trước đó');
}
console.log('PASS: Phú Bình/Phú Hậu 09T11→16T11 dùng cùng site, giữ GA8 anchor + manual GA alias');
