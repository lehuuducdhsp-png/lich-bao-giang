'use strict';
const assert=require('node:assert/strict');
const Safe=require('../sheets-ga-save-safe-v1.js');

const locationKey='THUY DUONG|TRUONG CHINH: 40 VO DUY NINH THUY DUONG CU';
const display='THỦY DƯƠNG\nTrường chính: 40 Võ Duy Ninh – THỦY DƯƠNG CŨ';

const current={
  gaValues:{[`2|Sáng|${locationKey}`]:'1'},
  entries:[{
    address:'D10',day:2,session:'Sáng',locationKey,locationLabel:display,
    schoolName:'THỦY DƯƠNG',siteDisplay:'Trường chính: 40 Võ Duy Ninh – THỦY DƯƠNG CŨ',
    className:'1/1',classRaw:'1/1'
  }]
};
const payload={
  gaValues:{[`2|Sáng|${locationKey}`]:'1'},lessonPlanCounts:{},
  entries:[{
    sourceCell:'D10',address:'D10',day:2,session:'Sáng',locationKey,
    school:display,schoolName:'THỦY DƯƠNG',siteDisplay:'Trường chính: 40 Võ Duy Ninh – THỦY DƯƠNG CŨ',
    className:'1/1',classRaw:'1/1'
  }],
  schedule:[]
};
const out=Safe.normalizePayload(payload,current);
assert.equal(out.gaValues[`2|Sáng|${display}`],'1','Phải tạo alias GA đúng chuỗi trường/điểm dạy gửi sang Sheets');
assert.equal(out.lessonPlanCounts[`2|Sáng|${display}`],'1','lessonPlanCounts phải đồng bộ cùng GA');
assert.equal(out.gaValues[`2|Sáng|${locationKey}`],'1','Không được mất khóa GA chuẩn');

const mixedCurrent={
  gaValues:{
    [`5|Chiều|${locationKey}`]:'1',
    [`@CLASS|5|Chiều|${locationKey}|2/1`]:'1',
    [`@CLASS|5|Chiều|${locationKey}|2/4`]:'1',
    [`@CLASS|5|Chiều|${locationKey}|2/2`]:'2'
  },
  entries:[
    {address:'E20',day:5,session:'Chiều',locationKey,locationLabel:display,schoolName:'THỦY DƯƠNG',className:'2/1',classRaw:'2/1'},
    {address:'E21',day:5,session:'Chiều',locationKey,locationLabel:display,schoolName:'THỦY DƯƠNG',className:'2/4',classRaw:'2/4'},
    {address:'E22',day:5,session:'Chiều',locationKey,locationLabel:display,schoolName:'THỦY DƯƠNG',className:'2/2 (GA 2)',classRaw:'2/2'}
  ]
};
const mixedPayload={
  gaValues:{...mixedCurrent.gaValues},
  entries:mixedCurrent.entries.map(e=>({sourceCell:e.address,address:e.address,day:e.day,session:e.session,locationKey,school:display,schoolName:'THỦY DƯƠNG',className:e.classRaw,classRaw:e.classRaw})),
  schedule:mixedCurrent.entries.map(e=>({sourceCell:e.address,address:e.address,day:e.day,session:e.session,locationKey,school:display,schoolName:'THỦY DƯƠNG',className:e.classRaw,classRaw:e.classRaw}))
};
const mixed=Safe.normalizePayload(mixedPayload,mixedCurrent);
assert.equal(mixed.gaValues[`5|Chiều|${display}`],'1','GA đa số phải sang Sheets làm GA đầu buổi/điểm dạy');
assert.equal(mixed.entries[2].className,'2/2 (GA 2)','Lớp có GA khác phải giữ chú thích GA riêng khi sang Sheets');
assert.equal(mixed.entries[0].className,'2/1','Lớp theo GA đa số không được thêm chú thích thừa');
assert.equal(mixed.schedule[2].className,'2/2 (GA 2)','schedule phải đồng nhất với entries');

const tieCurrent={
  gaValues:{
    [`@CLASS|3|Sáng|${locationKey}|3/1`]:'4',
    [`@CLASS|3|Sáng|${locationKey}|3/2`]:'5'
  },
  entries:[
    {address:'F10',day:3,session:'Sáng',locationKey,locationLabel:display,schoolName:'THỦY DƯƠNG',className:'3/1 (GA 4)',classRaw:'3/1'},
    {address:'F11',day:3,session:'Sáng',locationKey,locationLabel:display,schoolName:'THỦY DƯƠNG',className:'3/2 (GA 5)',classRaw:'3/2'}
  ]
};
const tiePayload={gaValues:{...tieCurrent.gaValues},entries:tieCurrent.entries.map(e=>({sourceCell:e.address,address:e.address,day:e.day,session:e.session,locationKey,school:display,className:e.classRaw,classRaw:e.classRaw}))};
const tie=Safe.normalizePayload(tiePayload,tieCurrent);
assert.equal(tie.gaValues[`3|Sáng|${display}`],undefined,'Hòa GA thì không được bịa một GA đại diện cho đầu buổi');
assert.equal(tie.entries[0].className,'3/1 (GA 4)');
assert.equal(tie.entries[1].className,'3/2 (GA 5)');

console.log('OK Sheets GA save: aliases, per-class exception labels, and tie safety preserved');
