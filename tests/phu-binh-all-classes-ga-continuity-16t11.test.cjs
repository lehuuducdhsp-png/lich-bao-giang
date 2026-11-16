'use strict';
const assert=require('node:assert/strict');
const N=require('../ga-kns-november-2026-safe-v1.js');
// Verified against the 19 Cơ sở 2 – Phú Bình cũ class cells in
// TKB NĂM HỌC 26-27(3).xlsx, weeks 7T9 through 16T11.
const site='PHU BINH|CO SO 2|PHU BINH CU';
const all=['1/4','1/5','1/6','1/7','2/4','2/5','2/6','2/7','3/4','3/5','3/6','3/7','4/4','4/5','4/6','4/7','5/5','5/7','5/8'];
const ga10=['1/4','1/5','1/6','1/7','2/5','2/6','2/7','3/6','4/4','4/6','4/7','5/7'];
const ga11=['3/5','5/5'];
const stem=['2/4','3/4','3/7','4/5','5/8'];
assert.equal(all.length,19);
assert.equal(ga10.length,12);assert.equal(ga11.length,2);assert.equal(stem.length,5);
assert.equal(new Set([...ga10,...ga11,...stem]).size,19);
const make=(cls,week,ga,track='kns')=>{
 const day=week==='26T10'?'2026-10-26':week==='02T11'?'2026-11-02':week==='09T11'?'2026-11-09':'2026-11-16';
 return{id:cls+'-'+week+'-'+track,date:new Date(day+'T12:00:00+07:00'),dateKey:day,sheet:week,day:4,session:'Chiều',period:4,
 school:'PHÚ BÌNH',locationKey:site,grade:Number(cls[0]),members:[cls],classDisplay:cls,ga,gaSource:'previous',track};
};
const events=[],last=new Map();
for(const cls of ga10){
 for(const [week,ga]of [['26T10',8],['09T11',9],['16T11',10]]){
  const e=make(cls,week,ga);events.push(e);if(week==='16T11')last.set(cls,e);
 }
 events.push(make(cls,'02T11',13,'stem'));
}
for(const cls of ga11){
 for(const [week,ga]of [['26T10',8],['02T11',9],['09T11',10],['16T11',11]]){
  const e=make(cls,week,ga);events.push(e);if(week==='16T11')last.set(cls,e);
 }
}
for(const cls of stem)events.push(make(cls,'16T11',13,'stem'));
const h=N.apply({events,warnings:[]});
for(const cls of ga10){assert.equal(last.get(cls).ga,10,cls+' must not jump to GA11');assert.equal(last.get(cls).__lbgNovemberExpectedGa,10)}
for(const cls of ga11){assert.equal(last.get(cls).ga,11,cls+' correctly follows GA10 in week 09T11')}
for(const cls of stem){assert.equal(events.find(e=>e.id===cls+'-16T11-stem').ga,13,cls+' STEM unaffected')}
for(const cls of all)assert.equal(N.isVerifiedPhuBinhEvent({locationKey:site},[cls],'16T11'),true,cls+' included in audit');
assert.equal(N.isVerifiedPhuBinhEvent({locationKey:'PHU BINH|CO SO 1|PHU HAU CU'},['1/5'],'16T11'),false);
const once=events.map(e=>e.ga);N.apply(h);assert.deepEqual(events.map(e=>e.ga),once,'No duplicate advances');
console.log('PASS 19 Phú Bình old-site classes: 12 KNS GA10, 2 KNS GA11, 5 STEM unchanged; previous GA8 anchors honored');
