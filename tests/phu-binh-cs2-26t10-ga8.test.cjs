'use strict';
const assert=require('node:assert/strict');
const V=require('../ga-suggestion-v7.js');
const G=require('../ga-group-split-history-safe-v1.js');
const Cross=require('../ga-suggestion-cross-version-v1.js');
const target=['1/6','5/7','4/4'];
function e(cls,site='CƠ SỞ 2 - PHÚ BÌNH CŨ',track='KNS',address='A1'){
 return {code:track==='STEM'?'STEM1':'TÂM',day:5,session:'Chiều',period:3,
  schoolName:'PHÚ BÌNH',school:'PHÚ BÌNH',siteRaw:site,siteName:site,siteDisplay:'Cơ sở: '+site,
  locationKey:'PHU BINH|'+site.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(),
  className:cls,classRaw:cls,address};
}
const worksheets=[
{name:'19T10',entries:target.map((x,i)=>e(x,undefined,'KNS','P'+i))},
{name:'26T10',entries:[
...target.map((x,i)=>e(x,undefined,'KNS','T'+i)),
e('1/6','CƠ SỞ 1 - PHÚ HẬU CŨ','KNS','OTHER_SITE'),
e('4/5',undefined,'KNS','OTHER_CLASS'),
e('1/6',undefined,'STEM','STEM')]},
{name:'2T11',entries:target.map((x,i)=>e(x,undefined,'KNS','F'+i))}
];
const dates={'19T10':new Date(2026,9,19,12),'26T10':new Date(2026,9,26,12),'2T11':new Date(2026,10,2,12)};
const parser={scanAssignments:ws=>ws.entries};
const opts={parser,roleResolver:(_ws,code)=>code==='STEM1'?'STEM':'KNS',
startDateFor:ws=>dates[ws.name],weekLike:()=>true,manualResolver:(_e,ws)=>ws.name==='26T10'?7:null};
const book={worksheets};
const builders=[
()=>V.buildHistory(book,'2T11',opts),
()=>G.wrapBuildHistory(V.buildHistory)(book,'2T11',opts),
()=>Cross.buildHistoryAcrossSources(V,[{id:'active',book}],book,'2T11',opts)
];
for(const build of builders){
 const h=build();
 for(let i=0;i<3;i++){
 const now=h.byAddress.get('26T10!T'+i),next=h.byAddress.get('2T11!F'+i);
 assert.ok(now&&next);assert.equal(now.ga,8);assert.equal(now.gaSource,'phu-binh-cs2-26t10-ga8-anchor');
 assert.equal(next.ga,9);assert.notEqual(h.byAddress.get('19T10!P'+i).ga,8);
 }
 assert.notEqual(h.byAddress.get('26T10!OTHER_SITE').ga,8);
 assert.notEqual(h.byAddress.get('26T10!OTHER_CLASS').ga,8);
 assert.notEqual(h.byAddress.get('26T10!STEM').ga,8);
}
assert.equal(V.phuBinhCs2Week26Ga8({sheet:'26T10',track:'kns',members:['1/6'],atoms:[e('1/6')]}),8);
assert.equal(V.phuBinhCs2Week26Ga8({sheet:'26T10',track:'stem',members:['1/6'],atoms:[e('1/6')]}),null);
console.log('PASS GA8 Phú Bình CS2 26T10: 3 lớp, các lớp/cơ sở khác và STEM không đổi, tuần sau GA9.');
