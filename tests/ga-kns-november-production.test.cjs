'use strict';
const assert=require('node:assert/strict');
const N=require('../ga-kns-november-2026-safe-v1.js');
const D=require('../ga-progress-dashboard-v1.js');
const d=x=>new Date(x+'T12:00:00+07:00');
const make=(id,sheet,day,cls,ga,track='kns',loc='THỦY PHƯƠNG|THANH LAM CŨ')=>({
  id,sheet,dateKey:day,date:d(day),grade:Number(cls[0]),members:[cls],track,ga,
  school:'THỦY PHƯƠNG',locationKey:loc,classDisplay:cls,gaSource:'previous',
  day:2,session:'Chiều',period:4
});
const rows=[
  make('a26','26T10','2026-10-26','1/6',8),
  make('s26','26T10','2026-10-26','2/6',8),
  make('c26','26T10','2026-10-26','3/6',8),
  make('e26','26T10','2026-10-26','5/6',8),
  make('a02','02T11','2026-11-02','1/6',10),
  make('a09','09T11','2026-11-09','1/6',12),
  make('a16','16T11','2026-11-16','1/6',12),
  make('s09','09T11','2026-11-09','2/6',3,'stem'),
  make('s16','16T11','2026-11-16','2/6',11),
  make('s23','23T11','2026-11-23','2/6',12),
  make('c02','02T11','2026-11-02','3/6',10),
  make('c09s','09T11','2026-11-09','3/6',4,'stem'),
  make('c16','16T11','2026-11-16','3/6',12),
  make('c23','23T11','2026-11-23','3/6',12),
  make('d09s','09T11','2026-11-09','4/6',2,'stem'),
  make('d16s','16T11','2026-11-16','4/6',3,'stem'),
  make('e09s','09T11','2026-11-09','5/6',1,'stem'),
  make('e09k','09T11','2026-11-10','5/6',12),
  make('e16','16T11','2026-11-16','5/6',12),
  make('other','16T11','2026-11-16','2/6',1,'kns','THỦY PHƯƠNG|OTHER')
];
const history=N.apply({events:rows,warnings:[]});
const byId=Object.fromEntries(rows.map(x=>[x.id,x]));
for(const [id,ga] of Object.entries({a26:8,s26:8,c26:8,e26:8,a02:11,a09:10,a16:9,s09:3,s16:10,s23:9,c02:11,c09s:4,c16:10,c23:9,d09s:2,d16s:3,e09s:1,e09k:10,e16:9,other:1})){
  assert.equal(byId[id].ga,ga,id);
}
assert.ok(history.__lbgGaKnsNovemberStats.missingKns16.some(x=>x.member==='4/6'));
const warning=D.buildClassProgress(history).find(x=>x.className==='4/6');
assert.equal(warning.status,'review');
assert.ok(warning.warnings.some(x=>x.includes('Thiếu tiết KNS GA10 tuần 16T11')));
const once=JSON.stringify(rows.map(x=>x.ga));
N.apply(history);assert.equal(JSON.stringify(rows.map(x=>x.ga)),once);
assert.equal(N.normalizedWeek('9T11'),'09T11');
// STEM ở 09T11, không có KNS 16T11: 23T11 KHÔNG được xếp GA10 muộn.
const lateStem=[
 make('late-old','26T10','2026-10-26','4/7',8),
 make('late-stem','09T11','2026-11-09','4/7',3,'stem'),
 make('late23','23T11','2026-11-23','4/7',10),
 make('late30','30T11','2026-11-30','4/7',10)
];
N.apply({events:lateStem,warnings:[]});
assert.equal(lateStem[2].ga,9,'23T11 quay lại GA9, không bù GA10 trễ');
assert.equal(lateStem[3].ga,11,'30T11 học tiếp GA11, bỏ qua GA10');
const complete=[
 make('all01','21T9','2026-09-21','1/9',8),
 make('all09','09T11','2026-11-09','1/9',10),
 make('all16','16T11','2026-11-16','1/9',9),
 make('all23','23T11','2026-11-23','1/9',10)
];
N.apply({events:complete,warnings:[]});
assert.equal(complete[3].ga,11,'KNS đã học GA9,10 thì 23T11 lên GA11');
const manual=[
 make('manual26','26T10','2026-10-26','5/9',8),
 make('manual23','23T11','2026-11-23','5/9',10)
];
manual[1].gaSource='manual';
const flagged=N.apply({events:manual,warnings:[]});
assert.equal(manual[1].ga,null,'GA10 nhập tay ở 23T11 phải chờ xác minh, không coi là lịch học hợp lệ');
assert.equal(manual[1].__lbgGaNeedsConfirmation.stored,10);
assert.match(flagged.warnings.join(' '),/Giữ dữ liệu gốc/);
console.log('PASS: GA10 chỉ ở 09T11/16T11; 23T11 dùng GA còn thiếu, STEM không kéo GA10 muộn, manual được cảnh báo.');
