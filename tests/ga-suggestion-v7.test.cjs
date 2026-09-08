'use strict';
const assert=require('node:assert/strict');
const V=require('../ga-suggestion-v7.js');
assert.equal(V.version,'20260909.1');
assert.deepEqual(V.KNS_SEQUENCE,[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34]);
assert.deepEqual(V.STEM_SEQUENCE,[3,6,13,16,20,23,27,32,35]);

const ws1={name:'7T9',entries:[
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:2,session:'Sáng',period:1,teachingPeriod:4,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',className:'4/1+4/2+4/3+4/4',address:'E176'},
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:2,session:'Sáng',period:2,teachingPeriod:4,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',className:'4/1+4/2+4/3+4/4',address:'F176'},
  {code:'CTV1',teacherName:'CTV Một',day:2,session:'Sáng',period:3,teachingPeriod:4,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',className:'4/1+4/2+4/3+4/4',address:'G176'},
  {code:'STEM1',teacherName:'GV STEM',day:3,session:'Sáng',period:3,teachingPeriod:3,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4',className:'4/1+4/2+4/3+4/4',address:'H176'},
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:3,session:'Chiều',period:3,teachingPeriod:3,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/6',className:'4/6',address:'L172'},
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:4,session:'Sáng',period:1,teachingPeriod:4,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',className:'4/1+4/2+4/3+4/4',address:'M176'}
]};
const ws2={name:'14T9',entries:[
  {code:'ĐỨC',teacherName:'Lê Hữu Đức',day:2,session:'Sáng',period:1,teachingPeriod:4,locationKey:'THUY_PHUONG',locationLabel:'THỦY PHƯƠNG',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',className:'4/1+4/2+4/3+4/4',address:'E200'}
]};
const book={worksheets:[ws1,ws2]};
const parser={scanAssignments(ws){return ws.entries}};
const roles={ĐỨC:'KNS',CTV1:'CTV',STEM1:'STEM'};
const starts={7T9:new Date(2026,8,7,12),14T9:new Date(2026,8,14,12)};
const history=V.buildHistory(book,'14T9',{parser,roleResolver(_ws,code){return roles[code]||'KNS'},startDateFor(ws){return starts[ws.name]},weekLike(){return true}});

const first=history.byAddress.get('7T9!E176');
const duplicate=history.byAddress.get('7T9!F176');
const ctv=history.byAddress.get('7T9!G176');
assert.ok(first&&duplicate&&ctv);
assert.equal(first.id,duplicate.id,'duplicate source cells with same - TIẾT 4 are one teaching event');
assert.equal(first.id,ctv.id,'KNS teacher + CTV on same class/actual period are one collaborative event');
assert.equal(first.period,4,'actual teaching period wins over source slot');
assert.equal(first.ga,1,'first KNS teaching event starts at GA 1');
assert.equal(first.atoms.length,3,'three source cells are preserved inside one event');
assert.equal(first.participants.length,2,'KNS teacher and CTV are both retained as participants');

const stem=history.byAddress.get('7T9!H176');
assert.equal(stem.track,'stem');
assert.equal(stem.ga,3,'STEM has its own independent sequence');

const class46=history.byAddress.get('7T9!L172');
assert.equal(class46.track,'kns');
assert.equal(class46.ga,1,'different class 4/6 does not inherit GA from 4/1+4/2+4/3+4/4');

const secondKns=history.byAddress.get('7T9!M176');
assert.equal(secondKns.ga,2,'next actual KNS event for same class group advances to GA 2, not GA 3/STEM');

const nextWeek=history.byAddress.get('14T9!E200');
assert.equal(nextWeek.ga,4,'next real KNS event advances along KNS sequence 1 → 2 → 4');
assert.match(V.basisText(nextWeek),/GA gần nhất/);
console.log('OK GA suggestion V7: actual-period grouping, collaboration, separate KNS/STEM progress, class-specific nearest GA');
