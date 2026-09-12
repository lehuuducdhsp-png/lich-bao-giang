'use strict';
const assert=require('node:assert/strict');
const Per=require('../ga-per-class-v2.js');

const entries=[
  {day:5,session:'Chiều',school:'PHÚ THUẬN',className:'2/1',address:'A1'},
  {day:5,session:'Chiều',school:'PHÚ THUẬN',className:'2/4',address:'A2'},
  {day:5,session:'Chiều',school:'PHÚ THUẬN',className:'2/2',address:'A3'}
];
const loc=Per.locOf(entries[0]).key;
let values={
  [Per.classGaKey(5,'Chiều',loc,'2/1')]:'1',
  [Per.classGaKey(5,'Chiều',loc,'2/4')]:'1',
  [Per.classGaKey(5,'Chiều',loc,'2/2')]:'2'
};
let profile=Per.buildProfiles(entries,values)[0];
assert.equal(profile.header,1);
assert.equal(profile.tie,false);
assert.equal(profile.classes.get('2/1').annotate,false);
assert.equal(profile.classes.get('2/4').annotate,false);
assert.equal(profile.classes.get('2/2').annotate,true);
assert.equal(profile.classes.get('2/2').ga,2);

values={
  [Per.classGaKey(5,'Chiều',loc,'2/1')]:'1',
  [Per.classGaKey(5,'Chiều',loc,'2/4')]:'2'
};
profile=Per.buildProfiles(entries.slice(0,2),values)[0];
assert.equal(profile.header,null);
assert.equal(profile.tie,true);
assert.equal(profile.classes.get('2/1').annotate,true);
assert.equal(profile.classes.get('2/4').annotate,true);

const grouped=[
  {day:5,session:'Chiều',school:'PHÚ THUẬN',className:'2/1+2/2+2/3',address:'G1'},
  {day:5,session:'Chiều',school:'PHÚ THUẬN',className:'2/4',address:'G2'}
];
const groupedLoc=Per.locOf(grouped[0]).key;
values={
  [Per.classGaKey(5,'Chiều',groupedLoc,'2/1+2/2+2/3')]:'1',
  [Per.classGaKey(5,'Chiều',groupedLoc,'2/4')]:'2'
};
profile=Per.buildProfiles(grouped,values)[0];
assert.equal(profile.header,1,'combined three-class group must outweigh one minority class');

const ev=(ga,address,classId)=>({ga,gaSource:'previous',addresses:[address],classId,classDisplay:classId});
let plan=Per.planApplications([ev(1,'A1','2/1'),ev(2,'A3','2/2')],entries,{});
assert.equal(plan.apply.length,2,'different GA in one location must be separate class targets');
assert.equal(plan.conflicts.length,0);

const defaultKey=Per.gaKey(5,'Chiều',loc);
plan=Per.planApplications([ev(1,'A1','2/1'),ev(2,'A3','2/2')],entries,{[defaultKey]:'1'});
assert.equal(plan.same.length,1,'class matching common GA is already satisfied');
assert.equal(plan.apply.length,1,'minority class may override common GA');
assert.equal(plan.apply[0].ga,2);

const class2Key=Per.classGaKey(5,'Chiều',loc,'2/2');
plan=Per.planApplications([ev(2,'A3','2/2')],entries,{[defaultKey]:'1',[class2Key]:'3'});
assert.equal(plan.apply.length,0);
assert.equal(plan.conflicts.length,1,'existing class-specific GA must be protected');

const write=Per.applyPlan(Per.planApplications([ev(1,'A1','2/1'),ev(2,'A3','2/2')],entries,{}),{});
assert.equal(write.applied,2);
assert.equal(write.values[Per.classGaKey(5,'Chiều',loc,'2/1')],'1');
assert.equal(write.values[class2Key],'2');

let calls=0;
const original=(ws,code)=>{calls++;return{ws,code,entries:[]}};
const wrapped=Per.makeAnalyzeDecorator(original,a=>({...a,decorated:true}),()=>true);
const result=wrapped({name:'14T09'},'THANH');
assert.equal(calls,1,'stable wrapper must call base analyzer exactly once');
assert.equal(result.decorated,true);
assert.equal(wrapped.__lbgOriginalAnalyze,original,'wrapper must capture immutable original analyzer');

console.log('OK per-class GA v2: majority/tie, weighted groups, class targets, manual protection, stable analyzer wrapper');
