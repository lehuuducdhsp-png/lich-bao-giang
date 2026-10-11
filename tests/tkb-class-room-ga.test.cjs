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

assert.match(parserSource,/loc=locationAt\(ws,Number\.isFinite\(classRow\)&&classRow>0\?classRow:r\)/,'school/location must be resolved from the matched class row, not blindly from the teacher assignment row');
assert.match(parserSource,/classRow:cm\.classRow\|\|null/,'scan output must preserve the class source row');
const schoolFixSource=fs.readFileSync('tkb-parser-school-name-fix-v1.js','utf8');
assert.match(schoolFixSource,/anchorRow=Number\(e\?\.classRow\)\|\|Number\(e\?\.row\)/,'school-name compatibility fix must keep the same class-row anchor');

const V=require('../ga-suggestion-v7.js');
assert.equal(V.normalizeClass('1/B - P 1.5'),'1/B');
assert.deepEqual(V.gradesOf('1/B - P 1.5'),[1]);
assert.deepEqual(V.classMembers('1/B - P 1.5',1),['1/B']);
assert.deepEqual(V.classMembers('2/A - P 2/2',2),['2/A'],'P 2/2 là phòng, không được sinh member lớp 2/2');



assert.equal(P.version,'2.2.2');

// Regression THỦY PHƯƠNG – 25 DẠ LÊ:
// một số workbook ExcelJS vẫn có cell.master đúng dù ws.model.merges không đủ/không có.
// locationAt phải ưu tiên master cell thay vì dò ngược nhầm về THANH LÂM CŨ.
const schoolMaster={value:'THỦY PHƯƠNG'};
const oldSiteMaster={value:'PHÂN HIỆU - THANH LÂM CŨ'};
const newSiteMaster={value:'TRỤ SỞ CHÍNH\n- 25 DẠ LÊ'};
schoolMaster.master=schoolMaster;oldSiteMaster.master=oldSiteMaster;newSiteMaster.master=newSiteMaster;
const locationWs={
  model:{merges:[]},
  getCell(row,col){
    if(col===2&&row>=20&&row<=45)return{value:null,master:schoolMaster};
    if(col===3&&row>=20&&row<=29)return{value:null,master:oldSiteMaster};
    if(col===3&&row>=30&&row<=45)return{value:null,master:newSiteMaster};
    return{value:'',master:null};
  }
};
const daLe=P.locationAt(locationWs,30);
assert.equal(daLe.schoolName,'THỦY PHƯƠNG');
assert.equal(daLe.siteType,'Trụ sở chính');
assert.equal(daLe.siteName,'25 DẠ LÊ');
assert.equal(daLe.siteDisplay,'Trụ sở chính: 25 DẠ LÊ');
assert.equal(daLe.locationKey,'THUY PHUONG|TRU SO CHINH|25 DA LE');

const thanhLam=P.locationAt(locationWs,29);
assert.equal(thanhLam.siteType,'Phân hiệu');
assert.equal(thanhLam.siteName,'THANH LÂM CŨ');
assert.notEqual(thanhLam.locationKey,daLe.locationKey,'hai cơ sở THỦY PHƯƠNG phải tách riêng');

console.log('OK class-room GA: 1/B is class, P 1.5 is room; room never affects GA identity');
