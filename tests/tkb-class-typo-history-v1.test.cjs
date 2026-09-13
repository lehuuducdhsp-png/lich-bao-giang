'use strict';
const assert=require('node:assert/strict');
const Fix=require('../tkb-class-typo-fix-v1.js');
const V7=require('../ga-suggestion-v7.js');
const Cross=require('../ga-suggestion-cross-version-v1.js');

const oldWeek={name:'07T09',start:new Date(2026,8,7)};
const currentWeek={name:'14T09',start:new Date(2026,8,14)};
const oldBook={worksheets:[oldWeek]};
const currentBook={worksheets:[currentWeek],getWorksheet(name){return this.worksheets.find(ws=>ws.name===name)||null}};

const sourceByWeek={
  '07T09':[{day:2,session:'Sáng',period:1,teachingPeriod:1,locationKey:'VY DA|',locationLabel:'VỸ DẠ',schoolName:'VỸ DẠ',classRaw:'/31',className:'/31',classType:'unknown',code:'DUC',teacherName:'Lê Hữu Đức',address:'F31'}],
  '14T09':[{day:2,session:'Sáng',period:1,teachingPeriod:1,locationKey:'VY DA|',locationLabel:'VỸ DẠ',schoolName:'VỸ DẠ',classRaw:'3/1',className:'3/1',classType:'single',code:'DUC',teacherName:'Lê Hữu Đức',address:'F31'}]
};
const parser={scanAssignments(ws){return(sourceByWeek[ws.name]||[]).map(Fix.normalizeEntry)}};
const opts={
  parser,
  startDateFor:ws=>ws.start,
  weekLike:()=>true,
  roleResolver:()=> 'KNS'
};

const history=Cross.buildHistoryAcrossSources(
  V7,
  [
    {id:'old',created:'2026-09-08T00:00:00Z',book:oldBook},
    {id:'active',created:'2026-09-14T00:00:00Z',book:currentBook}
  ],
  currentBook,
  '14T09',
  opts
);

const prior=history.events.find(e=>e.sheet==='07T09');
const current=history.events.find(e=>e.sheet==='14T09');
assert.ok(prior,'phải đọc được tuần trước');
assert.ok(current,'phải đọc được tuần hiện tại');
assert.equal(prior.classDisplay,'3/1','/31 tuần trước phải được chuẩn hóa thành 3/1');
assert.equal(prior.ga,1,'lần dạy đầu của 3/1 là GA 1');
assert.equal(current.classDisplay,'3/1');
assert.equal(current.ga,2,'tuần hiện tại phải nối đúng lịch sử 3/1 và tăng lên GA 2');
assert.equal(current.gaSource,'previous');
assert.equal(current.previousEvents[0]?.sheet,'07T09');

console.log('OK class typo history: archived /31 is treated as 3/1 and GA continues');
