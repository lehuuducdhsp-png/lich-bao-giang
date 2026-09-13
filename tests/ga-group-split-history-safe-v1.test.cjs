'use strict';
const assert=require('node:assert/strict');
const V7=require('../ga-suggestion-v7.js');
const Safe=require('../ga-group-split-history-safe-v1.js');

assert.equal(Safe.wholeGradeFromText('KHỐI 1 (4 LỚP) - TIẾT 4'),1);
assert.equal(Safe.wholeGradeFromText('LỚP 1 (4 LỚP)'),1);
assert.equal(Safe.wholeGradeFromText('1/1 + 1/2'),null,'gộp vài lớp cụ thể không được hiểu là cả khối');

const loc='THUY DUONG|TRUONG CHINH';
const dates={
  '7T9':new Date(2026,8,7,12),
  '14T09':new Date(2026,8,14,12),
  '21T09':new Date(2026,8,21,12)
};
const startDateFor=ws=>dates[ws.name]||null;
const roleResolver=()=> 'KNS';

function build(scans,names,selected){
  const worksheets=names.map(name=>({name}));
  const parser={scanAssignments:ws=>scans.get(ws.name)||[]};
  const wrapped=Safe.wrapBuildHistory(V7.buildHistory);
  return wrapped({worksheets},selected,{parser,roleResolver,startDateFor,weekLike:()=>true});
}

// Ca người dùng: tuần 7T9 học gộp cả KHỐI 1 = GA1; tuần 14T09 tách 1/1..1/4.
// Từng lớp đã thuộc lần học gộp nên phải tiếp tục GA2, không quay lại GA1.
const groupThenSplit=new Map([
  ['7T9',[
    {code:'THANH',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'KHỐI 1 (4 LỚP) - TIẾT 4',classRaw:'KHỐI 1 (4 LỚP) - TIẾT 4',address:'G10'}
  ]],
  ['14T09',[
    {code:'THANH',day:3,session:'Sáng',period:1,teachingPeriod:1,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/1',classRaw:'1/1',address:'G20'},
    {code:'THANH',day:3,session:'Sáng',period:2,teachingPeriod:2,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/2',classRaw:'1/2',address:'G21'},
    {code:'THANH',day:3,session:'Sáng',period:3,teachingPeriod:3,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/3',classRaw:'1/3',address:'G22'},
    {code:'THANH',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/4',classRaw:'1/4',address:'G23'}
  ]]
]);
let history=build(groupThenSplit,['7T9','14T09'],'14T09');
let current=history.events.filter(e=>e.sheet==='14T09');
assert.deepEqual(current.map(e=>[e.classDisplay,e.ga,e.gaSource]),[
  ['1/1',2,'previous'],['1/2',2,'previous'],['1/3',2,'previous'],['1/4',2,'previous']
]);
assert.ok(current.every(e=>e.__lbgInheritedFromWholeGrade),'lớp tách phải biết mốc trước đến từ cả khối');

// Chiều ngược lại: các lớp học riêng GA1, sau đó gộp cả khối => GA2.
// Nếu tuần kế tiếp lại tách, cả 4 lớp phải đi tiếp GA4 (chuỗi KNS: 1,2,4...).
const splitGroupSplit=new Map([
  ['7T9',[
    {code:'THANH',day:3,session:'Sáng',period:1,teachingPeriod:1,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/1',classRaw:'1/1',address:'A1'},
    {code:'THANH',day:3,session:'Sáng',period:2,teachingPeriod:2,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/2',classRaw:'1/2',address:'A2'},
    {code:'THANH',day:3,session:'Sáng',period:3,teachingPeriod:3,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/3',classRaw:'1/3',address:'A3'},
    {code:'THANH',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/4',classRaw:'1/4',address:'A4'}
  ]],
  ['14T09',[
    {code:'THANH',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'KHỐI 1 (4 LỚP) - TIẾT 4',classRaw:'KHỐI 1 (4 LỚP) - TIẾT 4',address:'B4'}
  ]],
  ['21T09',[
    {code:'THANH',day:3,session:'Sáng',period:1,teachingPeriod:1,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/1',classRaw:'1/1',address:'C1'},
    {code:'THANH',day:3,session:'Sáng',period:2,teachingPeriod:2,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/2',classRaw:'1/2',address:'C2'},
    {code:'THANH',day:3,session:'Sáng',period:3,teachingPeriod:3,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/3',classRaw:'1/3',address:'C3'},
    {code:'THANH',day:3,session:'Sáng',period:4,teachingPeriod:4,locationKey:loc,schoolName:'THỦY DƯƠNG',className:'1/4',classRaw:'1/4',address:'C4'}
  ]]
]);
history=build(splitGroupSplit,['7T9','14T09','21T09'],'21T09');
const grouped=history.events.find(e=>e.sheet==='14T09');
assert.equal(grouped.ga,2,'gộp cả khối sau các lớp GA1 phải thành GA2');
current=history.events.filter(e=>e.sheet==='21T09');
assert.ok(current.every(e=>e.ga===4),'sau lần gộp GA2, tách lại phải đi tiếp GA4 cho từng lớp');

console.log('OK GA group/split history: KHỐI 1 = toàn bộ lớp 1; gộp→tách và tách→gộp đều kế thừa tiến trình.');
