'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('report-atomic-display-v1.js','utf8');
const originalDisplay=entries=>entries.slice(0,1);
class FakeMutationObserver{constructor(fn){this.fn=fn}observe(){}disconnect(){}}
const context={
  console,setTimeout,clearTimeout,setInterval,clearInterval,MutationObserver:FakeMutationObserver,
  window:{addEventListener:()=>{},LBGReportPayRulesV1:{reportPeriod:e=>e.teachingPeriod,displayEntries:originalDisplay}},
  document:{readyState:'loading',addEventListener:()=>{},querySelector:()=>null,body:{}},
};
context.global=context;vm.createContext(context);vm.runInContext(code,context);
const api=context.window.LBGReportAtomicDisplayV1;assert(api,'missing atomic display API');
const entries=[
  {day:2,session:'Sáng',slotPeriod:1,teachingPeriod:4,classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',address:'E176'},
  {day:2,session:'Sáng',slotPeriod:2,teachingPeriod:4,classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',address:'F176'},
  {day:2,session:'Sáng',slotPeriod:3,teachingPeriod:3,classRaw:'4/6',address:'J172'},
  {day:3,session:'Sáng',slotPeriod:1,teachingPeriod:4,classRaw:'KHỐI 3 (4 LỚP) - TIẾT 4',address:'R183'},
];
const slot=api.atomicDisplayEntries(entries,2,'Sáng',4);
assert.equal(slot.length,2,'same teaching event must keep both atomic pay/source units for display');
assert.deepEqual(slot.map(x=>x.address),['E176','F176']);
assert.equal(api.periodOf({slotPeriod:1,groupNote:'TIẾT 4'}),4,'explicit TIẾT N must win over source slot');
assert.equal(api.install(),true);
const rules=context.window.LBGReportPayRulesV1;
assert.equal(typeof rules.displayTeachingEvents,'function','old grouped event display must remain callable');
assert.equal(rules.displayTeachingEvents(entries).length,1,'preserved grouped display must retain old behavior');
assert.equal(rules.displayEntries(entries,2,'Sáng',4).length,2);
assert.equal(rules.displayMode,'atomic-joined-by-ampersand');
const joined=rules.displayEntries(entries,2,'Sáng',4).map(x=>x.classRaw).join(' & ');
assert.equal(joined,'4/1+4/2+4/3+4/4 - TIẾT 4 & 4/1+4/2+4/3+4/4 - TIẾT 4');
console.log('OK report atomic display: duplicate source cells remain visible and join with &');
