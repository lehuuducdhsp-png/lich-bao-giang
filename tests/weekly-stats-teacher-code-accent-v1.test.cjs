'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');

const source=fs.readFileSync('teacher-intelligence-v6.js','utf8');
const sandbox={
  console,
  window:{
    addEventListener(){},
    teachers(){return[]},
    LBGTkbParserV2:null
  },
  document:{
    getElementById(){return null},
    querySelector(){return null},
    createElement(){return{style:{},dataset:{},appendChild(){},addEventListener(){}}},
    head:{appendChild(){}}
  },
  setInterval(){return 1},
  clearInterval(){},
  setTimeout(){return 1},
  clearTimeout(){},
  Blob:function(){},
  ExcelJS:{},
  saveAs(){},
  activeId:'test'
};
sandbox.window.document=sandbox.document;
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'teacher-intelligence-v6.js'});

const api=sandbox.window.LBGTeacherIntelligenceV6;
assert.ok(api,'teacher intelligence API must be exposed');
assert.equal(api.version,'20261005.1');
assert.equal(typeof api.resolveRoleCode,'function');

const roles=new Map([
  ['HÀ',{code:'HÀ',name:'Nguyễn Việt Hà',role:'KNS'}],
  ['ĐỨC',{code:'ĐỨC',name:'Lê Hữu Đức',role:'KNS'}]
]);

let out=api.resolveRoleCode(roles,{},'HẠ');
assert.equal(out.code,'HÀ','TKB typo HẠ must map uniquely to roster code HÀ after accent folding');
assert.equal(out.sourceCode,'HẠ');
assert.equal(out.mapping,'accent-unique');

out=api.resolveRoleCode(roles,{},'HÀ');
assert.equal(out.code,'HÀ');
assert.equal(out.mapping,'exact');

assert.equal(api.resolveRoleCode(roles,{},'HẠP'),null,'assistant P row HẠP must not become a main HÀ lesson');

const ambiguous=new Map([
  ['HÀ',{code:'HÀ'}],
  ['HẠ',{code:'HẠ'}]
]);
assert.equal(api.resolveRoleCode(ambiguous,{},'HÁ'),null,'accent folding must refuse ambiguous teacher codes');

sandbox.window.LBGTkbParserV2={
  resolveTeacherCode(ws,raw){
    if(raw==='HẠ')return{code:'HÀ',sourceCode:'HẠ',mapping:'accent-unique'};
    return null;
  }
};
out=api.resolveRoleCode(roles,{},'HẠ');
assert.equal(out.code,'HÀ');
assert.equal(out.mapping,'accent-unique');

assert.match(source,/const resolved=resolveRoleCode\(roles,ws,sourceCode\),code=/,'weekly scan must canonicalize the timetable code before checking the roster');
assert.match(source,/sourceCode,resolution:/,'weekly scan must retain raw code for audit');
assert.match(source,/candidates\.length===1/,'accent fallback must only accept a unique candidate');

console.log('OK weekly stats accent-safe teacher code: HẠ -> HÀ, HẠP excluded, ambiguity protected');
