const test=require('node:test');
const assert=require('node:assert/strict');
const api=require('../assist-p-sheets-label-safe-v1.js');

test('entry trợ giảng giữ (P) ở mọi trường class mà Sheets có thể dùng',()=>{
  const input={className:'1/1',classRaw:'1/1',classBase:'1/1',groupNote:'',isAssist:true,assignmentType:'assist',payEligible:false};
  const out=api.normalizeAssistEntryForSheets(input);
  for(const key of['className','classRaw','classBase','classDisplay','displayClass','classLabel','classText'])assert.equal(out[key],'1/1 (P)');
  assert.equal(out.groupNote,'');
  assert.equal(out.assistMarker,'P');
  assert.equal(out.payEligible,false);
});

test('payload chỉ đổi entry trợ giảng, không đổi tổng tính lương',()=>{
  const main={className:'3/7',classRaw:'3/7',classBase:'3/7',isAssist:false};
  const assist={className:'1/3',classRaw:'1/3 (P)',classBase:'1/3',isAssist:true,assignmentType:'assist',payEligible:false};
  const input={total:16,totalPeriods:16,payPeriods:16,entries:[main,assist],schedule:[main,assist]};
  const out=api.normalizePayloadForSheets(input);
  assert.equal(out.total,16);
  assert.equal(out.totalPeriods,16);
  assert.equal(out.payPeriods,16);
  assert.equal(out.entries[0].className,'3/7');
  assert.equal(out.entries[1].classBase,'1/3 (P)');
  assert.equal(out.schedule[1].className,'1/3 (P)');
});

test('không nhân đôi hậu tố P',()=>{
  assert.equal(api.withP('1/1 (P)'),'1/1 (P)');
});
