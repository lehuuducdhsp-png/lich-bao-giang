'use strict';
const assert=require('node:assert/strict');
const N=require('../ga-kns-november-2026-safe-v1.js');
const V=require('../ga-suggestion-v7.js');
const D=require('../ga-progress-dashboard-v1.js');
const site='PHU BINH|CO SO 2|PHU BINH CU';
const days={'7T9':'2026-09-07','14T9':'2026-09-14','21T9':'2026-09-21','28T9':'2026-09-28','5T10':'2026-10-05','12T10':'2026-10-12','19T10':'2026-10-19','26T10':'2026-10-26','02T11':'2026-11-02','09T11':'2026-11-09','16T11':'2026-11-16'};
const make=(cls,week,ga,track='kns',loc=site)=>({id:cls+'-'+week+'-'+track,sheet:week,dateKey:days[week],date:new Date(days[week]+'T12:00:00+07:00'),day:4,session:'Chiều',period:4,grade:Number(cls[0]),members:[cls],classDisplay:cls,school:'PHÚ BÌNH',locationKey:loc,ga,gaSource:'previous',track});
// Grounded by the 11 weeks of uploaded TKB NĂM HỌC 26-27(3).xlsx.
// 1/5 and 2/5: KNS 7T9 14T9 28T9 12T10 19T10 26T10 09T11 16T11.
// 5/7: KNS 7T9 14T9 21T9 5T10 19T10 26T10 09T11 16T11.
// All three: STEM 02T11, so no KNS GA is earned in that week.
const events=[],byId=new Map();
for(const cls of ['1/5','2/5','5/7']){
 const kns=cls==='5/7'?['7T9','14T9','21T9','5T10','19T10','26T10','09T11','16T11']:
  ['7T9','14T9','28T9','12T10','19T10','26T10','09T11','16T11'];
 const stem=cls==='5/7'?['28T9','12T10','02T11']:['21T9','5T10','02T11'];
 for(const [i,week]of kns.entries()){const e=make(cls,week,[1,2,4,5,7,8,9,10][i]);events.push(e);byId.set(e.id,e)}
 for(const [i,week]of stem.entries())events.push(make(cls,week,[3,6,13][i],'stem'));
}
const stem34=make('3/4','16T11',13,'stem');events.push(stem34);
const other=make('2/6','09T11',12,'kns','THUY PHUONG|THANH LAM CU');events.push(other);
const phuHau=make('3/1','09T11',12,'kns','PHU BINH|CO SO 1|PHU HAU CU');events.push(phuHau);
const history=N.apply({events,warnings:[]});
for(const cls of ['1/5','2/5','5/7']){
 const w9=byId.get(cls+'-09T11-kns'),w16=byId.get(cls+'-16T11-kns');
 assert.equal(w9.ga,9,cls+' 09T11 must complete GA9 before GA10');
 assert.equal(w16.ga,10,cls+' 16T11 must be GA10, not GA11');
 assert.equal(w9.gaSource,'kns-nov-phu-binh-sequence');
 assert.equal(w16.gaSource,'kns-nov-phu-binh-sequence');
 assert.equal(w16.__lbgNovemberExpectedGa,10);
 assert.match(V.basisText(w16),/dự kiến 10/);
}
assert.equal(stem34.ga,13,'3/4 remains STEM GA13');
assert.equal(other.ga,10,'Other-school approved 09T11 policy unchanged');
assert.equal(phuHau.ga,10,'Phú Hậu is a different historical site');
const before=events.map(x=>x.ga);N.apply(history);assert.deepEqual(events.map(x=>x.ga),before);
const progress=D.summarizeTrack([make('1/5','09T11',9)],'kns');assert.equal(progress.nextGa,10,'Do not skip to GA11 from GA9');
const manual=make('1/5','16T11',11);manual.gaSource='manual';
const audit=N.apply({events:[make('1/5','26T10',8),make('1/5','09T11',9),manual],warnings:[]});
assert.equal(manual.ga,11,'Never auto-overwrite user GA values');
assert.equal(manual.__lbgNovemberGaReview.expected,10);
assert.equal(manual.__lbgNovemberGaReview.stored,11);
assert.ok(audit.warnings.some(x=>x.toLowerCase().includes('không tự ghi đè')));
assert.match(V.basisText(manual),/CẦN XÁC NHẬN/);
console.log('PASS: 3 classes GA9→GA10, 3/4 STEM GA13, independent sites, manual conflict protected');
