'use strict';
const assert=require('node:assert/strict');

global.window={};
global.document={
  readyState:'loading',
  getElementById(){return null;},
  addEventListener(){},
  head:{appendChild(){}},
  createElement(){return{style:{},appendChild(){},remove(){}};}
};
global.MutationObserver=class{observe(){} disconnect(){}};
global.setInterval=()=>0;

require('../kns-lesson-detail-v2.js');
const api=global.window.LBGKnsLessonDetailV2;
assert.ok(api,'helper API must be exposed');
assert.equal(api.version,'20260908.1');
assert.deepEqual(api.gradesOf('KHỐI 4 (4 LỚP) - TIẾT 4'),[4]);
assert.deepEqual(api.gradesOf('4/1 + 4/2 + 5/1'),[4,5]);
assert.equal(api.lookupLesson(4,12).title,'Giá trị của gia đình');
assert.equal(api.lookupLesson(4,12).sourcePeriod,13);
assert.equal(api.lookupLesson(4,12).overridden,true);
assert.equal(api.lookupLesson(5,12).title,'Kĩ năng tạo cảm hứng trong học tập');
assert.equal(api.lookupLesson(5,12).sourcePeriod,13);
assert.equal(api.lookupLesson(4,13).kind,'moved');
assert.equal(api.lookupLesson(4,13).movedTo,12);
assert.equal(api.lookupLesson(1,12).title,'Thể hiện lễ phép trong gia đình');
assert.equal(api.lookupLesson(4,16).kind,'out');
const a={gaValues:{'2|Sáng|TRUONG A|DIEM 1':'12'}};
const e={day:2,session:'Sáng',locationKey:'TRUONG A|DIEM 1',school:'Trường A'};
assert.equal(api.gaValue(a,e),12);
console.log('kns-lesson-detail-v2 tests: ok');
