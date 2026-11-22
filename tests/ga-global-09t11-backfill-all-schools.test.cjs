'use strict';
const assert=require('node:assert/strict');
const N=require('../ga-kns-november-2026-safe-v1.js');
const D=require('../ga-progress-dashboard-v1.js');
const V=require('../ga-suggestion-v7.js');
// From workbook TKB NĂM HỌC 26-27(3).xlsx, sheets 7T9..16T11:
// 14 schools have class assignments in both 09T11 and 16T11.
// Scenarios below are POLICY fixtures, NOT claims about actual taught GA per class.
const active=[
  'VÂN DƯƠNG','QUANG TRUNG','VỸ DẠ','TRẦN QUỐC TOẢN',
  'PHÚ BÌNH','HƯƠNG VINH','HÀ THẾ HẠNH','THUẬN AN',
  'TH & THCS HẢI DƯƠNG','PHÚ TÂN','THỦY PHƯƠNG',
  'THỦY DƯƠNG','THUỶ LƯƠNG','THỦY PHÙ'
];
const no09=[
  'DƯƠNG NỔ 1','DƯƠNG NỔ 2','LÊ QUANG TIẾN',
  'PHÚ AN','PHÚ GIA','PHÚ MỸ','PHÚ THUẬN'
];
assert.equal(active.length,14);assert.equal(no09.length,7);
const dates={'21T9':'2026-09-21','26T10':'2026-10-26','02T11':'2026-11-02','09T11':'2026-11-09','16T11':'2026-11-16','23T11':'2026-11-23','30T11':'2026-11-30'};
let count=0;
function make({school,site,cls='1/1',week='09T11',ga=1,track='kns',source='previous',members}){
  const dateKey=dates[week],date=new Date(dateKey+'T12:00:00+07:00'),grade=Number(cls[0]),locationKey=site||school+'|SITE 1';
  return{id:String(++count),sheet:week,dateKey,date,day:3,session:'Chiều',period:4,
    grade,members:members||[cls],classDisplay:cls,track,ga,gaSource:source,school,locationKey};
}
const events=[],checks=[];
for(const school of active){
 const loc=school+'|SITE 1';
 const prior=make({school,site:loc,week:'26T10',ga:8});
 const special=make({school,site:loc,week:'09T11',ga:9});
 const catchup=make({school,site:loc,week:'16T11',ga:11});
 events.push(prior,special,catchup);checks.push({school,special,catchup});
 // Another class at the same school had STEM in week 09, so GA10 KNS is still owed.
 const cls='2/1';
 const early=make({school,site:loc,cls,week:'26T10',ga:8});
 const stem09=make({school,site:loc,cls,week:'09T11',track:'stem',ga:13});
 const late10=make({school,site:loc,cls,week:'16T11',ga:11});
 const laterMissing=make({school,site:loc,cls,week:'23T11',ga:12});
 events.push(early,stem09,late10,laterMissing);
 checks[checks.length-1].stem09=stem09;
 checks[checks.length-1].late10=late10;
 checks[checks.length-1].laterMissing=laterMissing;
}
// A school with no KNS/STEM assignment in 09T11 must not be forced to GA10.
for(const school of no09)events.push(make({school,week:'26T10',ga:8}),make({school,week:'16T11',ga:9}));
// Campus isolation: same class ID but different place and attendance in 09T11.
const binh='PHÚ BÌNH|CO SO 2|PHU BINH CU',hau='PHÚ BÌNH|CO SO 1|PHU HAU CU';
const atB=make({school:'PHÚ BÌNH',site:binh,cls:'5/7',week:'09T11',ga:9});
const atH=make({school:'PHÚ BÌNH',site:hau,cls:'5/7',week:'09T11',track:'stem',ga:13});
const b16=make({school:'PHÚ BÌNH',site:binh,cls:'5/7',week:'16T11',ga:11});
const h16=make({school:'PHÚ BÌNH',site:hau,cls:'5/7',week:'16T11',ga:11});
events.push(make({school:'PHÚ BÌNH',site:binh,cls:'5/7',week:'26T10',ga:8}),atB,b16,
  make({school:'PHÚ BÌNH',site:hau,cls:'5/7',week:'26T10',ga:8}),atH,h16);
// Teacher's manually stored values must not be silently changed.
const manual09=make({school:'THUẬN AN',site:'THUAN AN|1',cls:'3/7',week:'09T11',ga:11,source:'manual'});
const manual16=make({school:'THUẬN AN',site:'THUAN AN|1',cls:'4/7',week:'16T11',ga:11,source:'manual'});
events.push(make({school:'THUẬN AN',site:'THUAN AN|1',cls:'3/7',week:'26T10',ga:8}),manual09,
  make({school:'THUẬN AN',site:'THUAN AN|1',cls:'4/7',week:'26T10',ga:8}),
  make({school:'THUẬN AN',site:'THUAN AN|1',cls:'4/7',week:'09T11',ga:9}),manual16);
// A group containing classes with different missing GAs must be reviewed.
const loc='THỦY PHƯƠNG|PHAN HIEU THANH LAM CU';
events.push(make({school:'THỦY PHƯƠNG',site:loc,cls:'1/3',week:'26T10',ga:8}),
  make({school:'THỦY PHƯƠNG',site:loc,cls:'1/4',week:'26T10',ga:9}));
const group09=make({school:'THỦY PHƯƠNG',site:loc,cls:'1/3+1/4',week:'09T11',ga:9,members:['1/3','1/4']});
const group16=make({school:'THỦY PHƯƠNG',site:loc,cls:'1/3+1/4',week:'16T11',ga:11,members:['1/3','1/4']});
events.push(group09,group16);
// A new class with no earlier KNS history cannot be automatically issued GA11.
const noHistory09=make({school:'VỸ DẠ',site:'VY DA|NO HISTORY',cls:'5/9',week:'09T11',ga:1});
const noHistory16=make({school:'VỸ DẠ',site:'VY DA|NO HISTORY',cls:'5/9',week:'16T11',ga:11});
events.push(noHistory09,noHistory16);
// Quang Trung has a separately confirmed starting GA2 for some classes, so
// don't infer GA1 was taught/missing; seek missing from the earliest verified GA.
const qt='QUANG TRUNG|SPECIAL',qt09=make({school:'QUANG TRUNG',site:qt,cls:'1/8',week:'09T11',ga:9});
const qt16=make({school:'QUANG TRUNG',site:qt,cls:'1/8',week:'16T11',ga:11});
events.push(make({school:'QUANG TRUNG',site:qt,cls:'1/8',week:'21T9',ga:2}),qt09,qt16);
const history=N.apply({events,warnings:[]});
for(const c of checks){
 assert.equal(c.special.ga,10,c.school+' 09T11 if KNS => GA10');
 assert.equal(c.catchup.ga,9,c.school+' 16T11 return missed GA9, never default GA11');
 assert.equal(c.stem09.ga,13,c.school+' STEM independent');
 assert.equal(c.late10.ga,10,c.school+' STEM09 => makeup KNS GA10 at next KNS');
 assert.equal(c.laterMissing.ga,9,c.school+' after makeup => GA9');
}
for(const school of no09){
 const e=events.find(e=>e.school===school&&e.sheet==='16T11');
 assert.equal(e.ga,9,school+' no 09T11 class => standard KNS progression');
}
assert.equal(atB.ga,10);assert.equal(b16.ga,9);
assert.equal(atH.ga,13);assert.equal(h16.ga,10);
assert.equal(manual09.ga,11);assert.equal(manual16.ga,11);
assert.equal(manual09.__lbgGaNeedsConfirmation.expected,10);
assert.equal(manual16.__lbgGaNeedsConfirmation.expected,9);
assert.ok(history.warnings.some(x=>x.includes('không tự ghi đè')));
assert.equal(group09.ga,10);assert.equal(group16.ga,null);
assert.equal(group16.gaSource,'conflict');
assert.equal(noHistory09.ga,10);assert.equal(noHistory16.ga,null);
assert.equal(qt09.ga,10);assert.equal(qt16.ga,4);
assert.equal(N.nextUnlearned(new Set([1,2,4,5,7,8,10])),9);
assert.equal(N.nextUnlearned(new Set([1,2,4,5,7,8,9,10])),11);
assert.equal(N.nextUnlearned(new Set([10])),null,'Incomplete early history => review');
const ds=[
  {track:'kns',sheet:'26T10',ga:8,gaSource:'previous',date:new Date('2026-10-26')},
  {track:'kns',sheet:'09T11',ga:10,gaSource:'kns-nov-09-ga10-anchor',date:new Date('2026-11-09')}
];
assert.equal(D.summarizeTrack(ds,'kns').nextGa,9,'Dashboard must suggest GA9 after special GA10');
const missing=D.summarizeTrack(ds.slice(1),'kns');
assert.equal(missing.nextGa,null);assert.equal(missing.needsHistoryReview,true);assert.equal(missing.done,false);
assert.match(V.basisText(checks[0].special),/GA10 đặc biệt/);
assert.match(V.basisText(checks[0].catchup),/GA 9/);
const again=events.map(x=>x.ga);N.apply(history);assert.deepEqual(events.map(x=>x.ga),again);
// Tại tuần 23T11, GA10 không được xuất hiện trong gợi ý tại bất kỳ trường nào.
const missed=make({school:'HÀ THẾ HẠNH',site:'HA THE HANH|TU HA 1 CU',cls:'3/4',week:'26T10',ga:8});
const missedStem=make({school:'HÀ THẾ HẠNH',site:'HA THE HANH|TU HA 1 CU',cls:'3/4',week:'09T11',ga:13,track:'stem'});
const missed23=make({school:'HÀ THẾ HẠNH',site:'HA THE HANH|TU HA 1 CU',cls:'3/4',week:'23T11',ga:10});
N.apply({events:[missed,missedStem,missed23],warnings:[]});
assert.equal(missed23.ga,9,'23T11 không được lấy GA10 dù từng học STEM');
assert.equal(D.summarizeTrack([
 make({school:'HÀ THẾ HẠNH',week:'16T11',ga:9})
],'kns').nextGa,11,'Dashboard sau 16T11 không được gợi ý GA10');
console.log('PASS: 14 active schools + 7 absent in week 09; GA10 only 09T11/16T11, later missing KNS without GA10, manual review');
