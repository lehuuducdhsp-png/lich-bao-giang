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
  assert.equal(out.countInTotal,false);
  assert.equal(out.countInPay,false);
});

test('Google Sheets vẫn nhận P để hiển thị nhưng tổng chỉ tính tiết chính/cộng',()=>{
  const main={className:'3/7',classRaw:'3/7',classBase:'3/7',isAssist:false};
  const assist1={className:'1/1',classRaw:'1/1 (P)',classBase:'1/1',isAssist:true,assignmentType:'assist',payEligible:false};
  const assist2={className:'1/3',classRaw:'1/3 (P)',classBase:'1/3',isAssist:true,assignmentType:'assist',payEligible:false};
  const input={
    mainPeriods:15,plusPeriods:1,total:16,totalPeriods:16,payPeriods:16,totalWithAssist:18,
    atomicCount:3,payAtomicCount:1,assistPeriods:2,assistCount:2,
    totalText:'TỔNG: 15 tiết + 1 tiết = 16 tiết • 2 Trợ (P)',
    entries:[main,assist1,assist2],schedule:[main,assist1,assist2]
  };
  const out=api.normalizePayloadForSheets(input);
  assert.equal(out.total,16);
  assert.equal(out.totalPeriods,16);
  assert.equal(out.payPeriods,16);
  assert.equal(out.atomicCount,1,'atomicCount dùng cho tổng/tính lương không được cộng P');
  assert.equal(out.payAtomicCount,1);
  assert.equal(out.assistPeriods,2);
  assert.equal(out.assistCount,2);
  assert.equal(out.assistText,'2 Trợ (P)');
  assert.equal(out.totalText,'TỔNG: 15 tiết + 1 tiết = 16 tiết');
  assert.equal(Object.prototype.hasOwnProperty.call(out,'totalWithAssist'),false,'không gửi trường tổng có cộng P');
  assert.equal(out.entries.length,3,'vẫn gửi đủ entry P để Google Sheets hiển thị');
  assert.equal(out.entries[1].className,'1/1 (P)');
  assert.equal(out.entries[2].classBase,'1/3 (P)');
  assert.equal(out.excludeAssistFromTotal,true);
});

test('không nhân đôi hậu tố P',()=>{
  assert.equal(api.withP('1/1 (P)'),'1/1 (P)');
});

test('xóa riêng phần Trợ P khỏi totalText, không làm đổi tổng chính',()=>{
  assert.equal(api.stripAssistFromTotalText('TỔNG: 15 tiết + 1 tiết = 16 tiết • 2 Trợ (P)'),'TỔNG: 15 tiết + 1 tiết = 16 tiết');
});
