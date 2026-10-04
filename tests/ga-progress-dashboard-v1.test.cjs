'use strict';
const assert=require('node:assert/strict');
const D=require('../ga-progress-dashboard-v1.js');

assert.equal(D.VERSION,'20261004.1');
assert.equal(D.nextGa('kns',1),2);
assert.equal(D.nextGa('kns',2),4);
assert.equal(D.nextGa('stem',3),6);
assert.equal(D.nextGa('stem',null),3);

const d=s=>new Date(`${s}T12:00:00+07:00`);
const atom=(school,site,locationKey)=>({schoolName:school,siteDisplay:site,locationKey});
const ev=(id,{sheet,date,track,ga,member,school='QUANG TRUNG',site='Trường chính',locationKey='QUANG TRUNG|TRUONG CHINH',grade=1,gaSource='previous',historyMismatch=false,classDisplay})=>({
  id,sheet,date:d(date),dateKey:date,track,ga,grade,period:4,locationKey,school:`${school}\n${site}`,classDisplay:classDisplay||member,members:member?[member]:[],atoms:[atom(school,site,locationKey)],gaSource,historyMismatch
});

// STEM có thể đứng trước KNS; không được cảnh báo chỉ vì không theo nhịp 3 KNS : 1 STEM.
const history={events:[
  ev('a',{sheet:'7T9',date:'2026-09-08',track:'stem',ga:3,member:'1/1'}),
  ev('b',{sheet:'14T9',date:'2026-09-15',track:'kns',ga:1,member:'1/1'}),
  ev('c',{sheet:'21T9',date:'2026-09-22',track:'kns',ga:2,member:'1/1'}),
  ev('d',{sheet:'28T9',date:'2026-09-29',track:'stem',ga:6,member:'1/1'}),
  ev('e',{sheet:'28T9',date:'2026-09-30',track:'kns',ga:4,member:'1/1'}),
  // 1/2 mới chỉ học STEM trước, chưa có KNS vẫn hợp lệ.
  ev('f',{sheet:'21T9',date:'2026-09-22',track:'stem',ga:3,member:'1/2'}),
  // Cùng lớp ở cơ sở khác phải là hồ sơ khác.
  ev('g',{sheet:'21T9',date:'2026-09-22',track:'kns',ga:1,member:'1/1',school:'HƯƠNG VINH',site:'HƯƠNG VINH 2 CŨ',locationKey:'HUONG VINH|HV2'}),
  // Nhóm cả khối phải fan-out đến các lớp cụ thể đã biết trong cùng điểm dạy.
  ev('h',{sheet:'7T9',date:'2026-09-09',track:'kns',ga:1,member:null,classDisplay:'KHỐI 2 (2 LỚP)',grade:2,school:'PHÚ THUẬN',site:'PHÚ THUẬN CŨ',locationKey:'PHU THUAN|CU'}),
  ev('i',{sheet:'14T9',date:'2026-09-16',track:'kns',ga:2,member:'2/1',grade:2,school:'PHÚ THUẬN',site:'PHÚ THUẬN CŨ',locationKey:'PHU THUAN|CU'}),
  ev('j',{sheet:'14T9',date:'2026-09-16',track:'kns',ga:2,member:'2/2',grade:2,school:'PHÚ THUẬN',site:'PHÚ THUẬN CŨ',locationKey:'PHU THUAN|CU'}),
  // Dòng mâu thuẫn phải được đưa vào Cần kiểm tra.
  ev('k',{sheet:'28T9',date:'2026-09-30',track:'kns',ga:null,member:'3/1',grade:3,school:'TEST',site:'A',locationKey:'TEST|A',gaSource:'conflict',historyMismatch:true})
]};

const rows=D.buildClassProgress(history);
const qt11=rows.find(x=>x.school==='QUANG TRUNG'&&x.className==='1/1');
assert.ok(qt11);
assert.equal(qt11.kns.lastGa,4);
assert.equal(qt11.kns.nextGa,5);
assert.equal(qt11.stem.lastGa,6);
assert.equal(qt11.stem.nextGa,13);
assert.equal(qt11.status,'ok','không cảnh báo chỉ vì STEM/KNS xen kẽ không theo tỷ lệ 3:1');
assert.deepEqual(qt11.rhythm.map(x=>`${x.track}:${x.ga}`),['stem:3','kns:1','kns:2','stem:6','kns:4']);

const qt12=rows.find(x=>x.school==='QUANG TRUNG'&&x.className==='1/2');
assert.ok(qt12);
assert.equal(qt12.kns.count,0);
assert.equal(qt12.kns.nextGa,1,'chưa học KNS thì KNS kế tiếp vẫn là GA1');
assert.equal(qt12.stem.lastGa,3);
assert.equal(qt12.stem.nextGa,6);
assert.equal(qt12.status,'ok','STEM trước KNS vẫn hợp lệ');

const hv11=rows.find(x=>x.school==='HƯƠNG VINH'&&x.className==='1/1');
assert.ok(hv11);
assert.notEqual(hv11.key,qt11.key,'cùng tên lớp ở điểm dạy khác không được nhập lịch sử');

for(const cls of ['2/1','2/2']){
  const row=rows.find(x=>x.school==='PHÚ THUẬN'&&x.className===cls);
  assert.ok(row,`${cls} phải nhận lịch sử từ lần học gộp cả khối`);
  assert.equal(row.kns.history[0].sheet,'7T9');
  assert.equal(row.kns.history[0].ga,1);
  assert.equal(row.kns.lastGa,2);
  assert.equal(row.kns.nextGa,4);
}

const bad=rows.find(x=>x.school==='TEST'&&x.className==='3/1');
assert.ok(bad);
assert.equal(bad.status,'review');
assert.ok(bad.warnings.some(x=>/Mâu thuẫn/.test(x)));
assert.ok(bad.warnings.some(x=>/chưa xác định/i.test(x)));

assert.equal(D.filterRows(rows,{state:'stem-none'}).some(x=>x.className==='1/2'),false,'1/2 đã học STEM nên không thuộc stem-none');
assert.equal(D.filterRows(rows,{state:'stem-has',school:'QUANG TRUNG'}).length,2);
assert.equal(D.filterRows(rows,{stemNext:'13'}).some(x=>x.key===qt11.key),true);
assert.equal(D.filterRows(rows,{query:'hương vinh'}).length,1);

const summary=D.summarizeRows(rows);
assert.ok(summary.schools>=4);
assert.equal(summary.review,1);
const dist=D.nextStemDistribution(rows);
assert.ok(dist.some(x=>x.ga===13&&x.count>=1));
assert.ok(dist.some(x=>x.ga===6&&x.count>=1));

console.log('OK GA progress dashboard: per-class KNS/STEM history, flexible STEM-before-KNS, school/site separation and STEM filters');
