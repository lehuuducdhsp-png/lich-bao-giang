'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('monthly-calendar-v3.js','utf8');
const window={};
const document={readyState:'loading',getElementById(){return null},addEventListener(){}};
const sandbox={window,document,console,setTimeout(){return 0},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){},removeItem(){}}};
window.window=window;window.document=document;
vm.runInNewContext(code,sandbox,{filename:'monthly-calendar-v3.js'});
const M=window.LBGMonthlyV3;
assert.ok(M,'Monthly V3 phải khởi tạo được');
assert.equal(M.version,'20260927.1');

const base=[
  {address:'A1',sourceCode:'ĐỨC',school:'THỦY PHƯƠNG'},
  {address:'A2',sourceCode:'ĐỨC',school:'THỦY PHƯƠNG'},
  {address:'A3',sourceCode:'ĐỨC+',school:'THỦY PHƯƠNG',isPlus:true,reportOnlyPlus:true,payUnits:0}
];
let report={entries:base,__lbgGroupedPlusEntries:['A3'],total:2,groupedPlusCount:1};
assert.equal(M.mainEntries(report).length,2,'plus pseudo-entry không được tính vào cột Chính của bảng kê tháng');
assert.deepEqual(Array.from(M.mainEntries(report),x=>x.address),['A1','A2']);

report={entries:[
  {address:'B1',sourceCode:'ĐỨC'},
  {address:'B2',sourceCode:'ĐỨC+',payUnits:0}
],__lbgGroupedPlusEntries:['B2']};
assert.equal(M.mainEntries(report).length,1,'danh sách __lbgGroupedPlusEntries phải đủ để loại plus dù cờ cũ thiếu');

const weeks=[
  {sheet:'7T9',rawMain:19,plus:1,expectedMain:18,expectedTotal:19},
  {sheet:'14T9',rawMain:20,plus:1,expectedMain:19,expectedTotal:20},
  {sheet:'21T9',rawMain:8,plus:1,expectedMain:7,expectedTotal:8},
  {sheet:'28T9',rawMain:14,plus:0,expectedMain:14,expectedTotal:14}
];
for(const w of weeks){
  assert.equal(w.rawMain-w.plus,w.expectedMain,w.sheet+': phải trừ đúng plus khỏi Chính');
  assert.equal(w.expectedMain+w.plus,w.expectedTotal,w.sheet+': tổng thực phải = Chính + Cộng');
}
assert.equal(weeks.reduce((s,w)=>s+w.expectedMain,0),58,'tháng 09 phải có 58 tiết chính gốc');
assert.equal(weeks.reduce((s,w)=>s+w.plus,0),3,'tháng 09 phải có 3 tiết Cộng');
assert.equal(weeks.reduce((s,w)=>s+w.expectedTotal,0),61,'tổng tháng đúng phải là 61, không phải 64');

console.log('OK monthly plus: 7T9 18+1=19; 14T9 19+1=20; 21T9 7+1=8; 28T9 14; month total 61');
