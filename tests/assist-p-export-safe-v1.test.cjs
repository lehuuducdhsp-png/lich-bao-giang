'use strict';
const assert=require('node:assert/strict');
const mod=require('../assist-p-export-safe-v1.js');

assert.equal(mod.assistantCode('h.thanh'),'H.THANHP');
assert.equal(mod.assistLabel(2),'2 Trợ (P)');
assert.equal(mod.classWithP({className:'1/1'}),'1/1 (P)');
assert.equal(mod.classWithP({className:'1/3',groupNote:'TIẾT 3'}),'1/3 - TIẾT 3 (P)');

const base={
  mainPeriods:15,plusPeriods:1,total:16,totalPeriods:16,payPeriods:16,totalText:'TỔNG: 15 tiết + 1 tiết = 16 tiết',
  entries:[{sourceCode:'H.THANH',className:'3/7'}]
};
const assist=[
  {sourceCode:'H.THANHP',className:'1/1 (P)',isAssist:true,payEligible:false},
  {sourceCode:'H.THANHP',className:'1/3 (P)',isAssist:true,payEligible:false}
];
const out=mod.augmentSheetsPayload(base,assist);
assert.equal(out.total,16,'P không được làm tăng total');
assert.equal(out.totalPeriods,16,'P không được làm tăng totalPeriods');
assert.equal(out.payPeriods,16,'P không được làm tăng payPeriods');
assert.equal(out.assistPeriods,2);
assert.equal(out.assistCount,2);
assert.equal(out.totalWithAssist,18);
assert.equal(out.entries.length,3);
assert.equal(out.schedule.length,3);
assert.equal(out.payAtomicCount,1);
assert.match(out.totalText,/2 Trợ \(P\)/);
assert.equal(out.assistSemantics,'suffix-P-is-assist-not-pay-period');

console.log('assist-p-export-safe-v1: OK');
