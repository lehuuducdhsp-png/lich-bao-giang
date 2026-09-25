'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');

const document={
  getElementById(){return null},
  addEventListener(){},
  querySelector(){return null}
};
const window={document};
const sandbox={
  window,document,console,
  setTimeout(){return 0},
  clearTimeout(){},
  CustomEvent:function CustomEvent(type,init){this.type=type;this.detail=init?.detail}
};
window.window=window;
window.document=document;
window.setTimeout=sandbox.setTimeout;
window.clearTimeout=sandbox.clearTimeout;
window.CustomEvent=sandbox.CustomEvent;

const parserSource=fs.readFileSync('tkb-parser-v2.js','utf8');
vm.runInNewContext(parserSource,sandbox,{filename:'tkb-parser-v2.js'});
const P=window.LBGTkbParserV2;
assert.ok(P,'Parser V2 phải khởi tạo được');
assert.equal(P.version,'2.2.0');

let m=P.classMeta('1/B');
assert.equal(m.classType,'single');
assert.equal(m.classRaw,'1/B');
assert.equal(m.classDisplay,'1/B');
assert.equal(m.roomRaw,'');

m=P.classMeta('1/B - P 1.5');
assert.equal(m.classType,'single');
assert.equal(m.classRaw,'1/B','phần trước dấu - là lớp');
assert.equal(m.classDisplay,'1/B');
assert.equal(m.roomRaw,'P 1.5','phần P phía sau phải giữ riêng là phòng');

m=P.classMeta('2/A - P 2/2');
assert.equal(m.classType,'single');
assert.equal(m.classRaw,'2/A');
assert.equal(m.roomRaw,'P 2/2','phòng có dấu / không được biến thành lớp');

m=P.classMeta('5/10 - PHÒNG 4.2');
assert.equal(m.classType,'single');
assert.equal(m.classRaw,'5/10');
assert.equal(m.roomRaw,'PHÒNG 4.2');

m=P.classMeta('P 1.5');
assert.equal(m.classType,'unknown','ô chỉ chứa phòng tuyệt đối không được nhận là lớp');
assert.equal(P.roomText('P 1.5'),'P 1.5');

const V=require('../ga-suggestion-v7.js');
assert.equal(V.normalizeClass('1/B - P 1.5'),'1/B');
assert.deepEqual(V.gradesOf('1/B - P 1.5'),[1]);
assert.deepEqual(V.classMembers('1/B - P 1.5',1),['1/B']);
assert.deepEqual(V.classMembers('2/A - P 2/2',2),['2/A'],'P 2/2 là phòng, không được sinh member lớp 2/2');

console.log('OK class-room GA: 1/B is class, P 1.5 is room; room never affects GA identity');
