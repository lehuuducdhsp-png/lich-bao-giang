'use strict';
const assert=require('node:assert/strict');

globalThis.LBGTkbParserV2={
  timetableColumns(){return[10,11,12,13,14]},
  colInfoFor(ws,col){
    const map={10:{day:6,session:'Chiều',period:1},11:{day:6,session:'Chiều',period:2},12:{day:6,session:'Chiều',period:3},13:{day:6,session:'Chiều',period:4},14:{day:6,session:'Chiều',period:5}};
    return map[col]||null;
  }
};
const V8=require('../weekly-stats-enhancement-v8.js');

assert.equal(V8.VERSION,'20261005.1');
assert.equal(V8.exactCode(' hạ '),'HẠ');
assert.equal(V8.exactCode(' hà '),'HÀ');
assert.notEqual(V8.exactCode('HẠ'),V8.exactCode('HÀ'),'HẠ và HÀ phải luôn là hai mã khác nhau');

function cell(value,address){return{value,address}}
const rows=[
  {number:20,cells:{10:cell('LIÊN','J20'),11:cell('TÂM','K20'),12:cell('NGÀ','L20'),13:cell('HẠ','M20'),14:cell('LÀNH','N20')}},
  {number:21,cells:{10:cell('LIÊNP','J21'),11:cell('TÂMP','K21'),12:cell('NGÀP','L21'),13:cell('HẠP','M21'),14:cell('LÀNHP','N21')}},
  {number:22,cells:{14:cell('XYZ','N22')}}
];
const ws={
  eachRow(opts,fn){for(const r of rows)fn({number:r.number,getCell(col){return r.cells[col]||cell('',`C${r.number}`)}})}
};
const roles=new Map([
  ['LIÊN',{code:'LIÊN',name:'Liên',role:'KNS'}],
  ['TÂM',{code:'TÂM',name:'Tâm',role:'KNS'}],
  ['NGÀ',{code:'NGÀ',name:'Ngà',role:'KNS'}],
  ['HẠ',{code:'HẠ',name:'Thầy Hạ',role:'KNS'}],
  ['HÀ',{code:'HÀ',name:'Nguyễn Việt Hà',role:'KNS'}],
  ['LÀNH',{code:'LÀNH',name:'Lành',role:'KNS'}]
]);
const audit=V8.rawCodeAudit(ws,roles);
assert.equal(audit.unknown.some(x=>x.token==='HẠ'),false,'HẠ là mã chính hợp lệ của thầy Hạ');
assert.equal(audit.unknown.some(x=>x.token==='HẠP'),false,'HẠP là dòng P, không tạo giáo viên chính');
assert.equal(audit.unknown.some(x=>x.token==='XYZ'),true,'mã lạ phải được đưa vào cần kiểm tra');

const data={
  roster:[...roles.values()],
  scan:{source:[
    {code:'HẠ',teacherName:'Thầy Hạ',role:'KNS',day:6,session:'Chiều',period:4,school:'TRẦN QUỐC TOẢN CŨ',className:'1/4'},
    {code:'LIÊN',teacherName:'Liên',role:'KNS',day:6,session:'Chiều',period:1,school:'TRẦN QUỐC TOẢN CŨ',className:'1/1'}
  ]},
  audit
};
const session=V8.sessionData(data,6,'Chiều');
assert.equal(session.active.some(x=>x.code==='HẠ'),true,'thầy Hạ phải nằm trong danh sách Có tiết');
assert.equal(session.absent.some(x=>x.code==='HẠ'),false,'thầy Hạ không được báo Không có tiết');
assert.equal(session.absent.some(x=>x.code==='HÀ'),true,'HÀ là người khác; nếu không có ô HÀ thì vẫn phải nằm trong Không có tiết');
assert.equal(session.active.length,2);
assert.equal(session.absent.length,4);
assert.equal(session.activeByRole.KNS.some(x=>x.code==='HẠ'),true);

console.log('OK weekly stats V8: HẠ distinct from HÀ, P excluded, active/absent exact-code audit works');
