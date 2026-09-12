'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const patch=fs.readFileSync(path.join(__dirname,'..','recovery','google-sheets','ASSIST_P_TOTAL_EXCLUDE_PATCH_20260912.gs'),'utf8');

function currentSheetCount(cells){
  return cells.reduce((sum,value)=>{
    const text=String(value||'');
    if(!text)return sum;
    return sum+1+(text.match(/&/g)||[]).length;
  },0);
}

function payCountExcludingAssist(cells){
  return cells.reduce((sum,value)=>{
    const text=String(value||'');
    if(!text)return sum;
    const pieces=1+(text.match(/&/g)||[]).length;
    const assists=(text.match(/\(P\)/g)||[]).length;
    return sum+pieces-assists;
  },0);
}

test('tái hiện lỗi cũ: 16 tiết tính lương + 2 P bị công thức cũ đếm thành 18',()=>{
  const cells=[
    '3/1','3/2','3/3','3/4','3/5','3/6','3/7','3/8',
    '4/1','4/2','4/3','4/4','4/5','4/6','4/7 & 4/8',
    '1/1 (P) & 1/3 (P)'
  ];
  assert.equal(currentSheetCount(cells),18);
  assert.equal(payCountExcludingAssist(cells),16);
});

test('patch Apps Script trừ đúng mỗi hậu tố (P) một tiết khỏi tổng',()=>{
  assert.match(patch,/SUBSTITUTE\(C9:H13;"\(P\)";""\)/);
  assert.match(patch,/SUBSTITUTE\(C15:H19;"\(P\)";""\)/);
  assert.match(patch,/\)\/3\)/);
  assert.match(patch,/COUNTA\(C9:H13\)\+COUNTA\(C15:H19\)/);
  assert.match(patch,/"TỔNG: "/);
});

test('P vẫn có thể nằm chung ô với lớp chính nhưng chỉ phần không-P được tính',()=>{
  assert.equal(currentSheetCount(['3/7 & 1/1 (P)']),2);
  assert.equal(payCountExcludingAssist(['3/7 & 1/1 (P)']),1);
});
