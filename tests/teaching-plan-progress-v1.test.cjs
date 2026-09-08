'use strict';
const assert=require('node:assert/strict');
global.window={};
global.localStorage={getItem(){return null}};
require('../teaching-plan-progress-v1.js');
const H=global.window.LBGTeachingPlanProgressV1;
assert.ok(H,'progress helper must be exposed');
assert.equal(H.version,'20260909.1');
assert.deepEqual(H.KNS_SEQUENCE,[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34]);
assert.deepEqual(H.STEM_SEQUENCE,[3,6,13,16,20,23,27,32,35]);

const cell=tone=>({font:{color:tone==='red'?{argb:'FFFF0000'}:tone==='blue'?{argb:'FF0000FF'}:undefined}});
assert.equal(H.fontTone(cell('black')),'black');
assert.equal(H.fontTone(cell('red')),'red');
assert.equal(H.fontTone(cell('blue')),'blue');
assert.equal(H.sourcePeriodFor(4,'kns',12),13);
assert.equal(H.titleFor(4,'kns',12).title,'Giá trị của gia đình');
assert.equal(H.titleFor(5,'kns',12).title,'Kĩ năng tạo cảm hứng trong học tập');
assert.equal(H.sourcePeriodFor(4,'stem',13),12);
assert.equal(H.titleFor(4,'stem',13).title,'Kèn cổ vũ');
assert.equal(H.titleFor(5,'stem',13).title,'Thiết bị đo độ dẫn điện');

const colors=new Map([['1:4','black'],['1:5','blue'],['1:6','red'],['2:4','black'],['3:4','black']]);
const ws={name:'7T9',getCell(r,c){return cell(colors.get(`${r}:${c}`)||'black')}};
ws.entries=[
 {code:'ĐỨC',teacherName:'Đức',row:1,col:4,day:2,session:'Sáng',period:1,teachingPeriod:4,locationKey:'A',locationLabel:'Trường A',className:'KHỐI 4 (4 LỚP)',classRaw:'KHỐI 4 (4 LỚP) - TIẾT 4',classType:'combined-explicit',address:'D1'},
 {code:'CTV1',teacherName:'CTV Một',row:1,col:5,day:2,session:'Sáng',period:2,teachingPeriod:4,locationKey:'A',locationLabel:'Trường A',className:'KHỐI 4 (4 LỚP)',classRaw:'KHỐI 4 (4 LỚP) - TIẾT 4',classType:'combined-explicit',address:'E1'},
 {code:'STEM',teacherName:'GV STEM',row:1,col:6,day:2,session:'Sáng',period:3,teachingPeriod:3,locationKey:'A',locationLabel:'Trường A',className:'4/1',classRaw:'4/1',classType:'single',address:'F1'},
 {code:'ĐỨC',teacherName:'Đức',row:2,col:4,day:3,session:'Sáng',period:1,teachingPeriod:1,locationKey:'A',locationLabel:'Trường A',className:'4/1',classRaw:'4/1',classType:'single',address:'D2'},
 {code:'ĐỨC',teacherName:'Đức',row:3,col:4,day:5,session:'Chiều',period:2,teachingPeriod:2,locationKey:'A',locationLabel:'Trường A',className:'4/1',classRaw:'4/1',classType:'single',address:'D3'}
];
const parser={scanAssignments(sheet){return sheet.entries}};
const book={worksheets:[ws]};
const ledger=H.buildLedger(book,{parser,startDateFor(){return new Date(2026,8,7,12)}});
const collab=ledger.events.find(e=>e.teachingPeriod===4&&e.track==='kns');
assert.ok(collab,'combined KNS event exists');
assert.equal(collab.participants.length,2,'black KNS + blue/green-style CTV are one collaborative event');
assert.deepEqual(new Set(collab.participants.map(p=>p.role)),new Set(['kns','ctv-kns']));
const knsCycles=ledger.cycles.filter(c=>c.track==='kns').sort((a,b)=>a.time-b.time);
assert.deepEqual(knsCycles.map(c=>c.ga),[1,2,4],'extra actual teaching in the same week advances the KNS sequence without waiting for next week');
const stemCycles=ledger.cycles.filter(c=>c.track==='stem');
assert.deepEqual(stemCycles.map(c=>c.ga),[3],'red teacher uses independent STEM sequence');

const anchored=[{id:'a',time:1,anchorGa:null},{id:'b',time:2,anchorGa:10},{id:'c',time:3,anchorGa:null}];
H.assignProgression(anchored,'kns');
assert.deepEqual(anchored.map(c=>c.ga),[9,10,11],'nearest confirmed GA anchors both directions');

const wsConflict={getCell(){return cell('black')}};
const normal=[
 {code:'P',row:1,col:4,day:2,session:'Sáng',period:2,teachingPeriod:2,locationKey:'XUAN_PHU',className:'4/1',classType:'single'},
 {code:'P',row:1,col:5,day:2,session:'Sáng',period:3,teachingPeriod:3,locationKey:'XUAN_PHU',className:'4/2',classType:'single'},
 {code:'P',row:1,col:6,day:2,session:'Sáng',period:5,teachingPeriod:5,locationKey:'DA_LE',className:'4/3',classType:'single'}
];
assert.equal(H.detectTeacherConflicts(normal,wsConflict).red.length,0,'periods 2,3 then 5 at another school are not a conflict');
const trueConflict=[...normal,{code:'P',row:2,col:7,day:2,session:'Sáng',period:4,teachingPeriod:3,locationKey:'DA_LE',className:'4/4',classType:'single'}];
assert.equal(H.detectTeacherConflicts(trueConflict,wsConflict).red.length,1,'same actual teaching period at different locations is a true conflict');
console.log('OK teaching plan progress: colors, nearest GA, collaboration, same-week extra teaching, true conflicts');
