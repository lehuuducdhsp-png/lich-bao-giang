'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const storage=new Map(),listeners=new Map();
const localStorage={
 getItem(key){return storage.has(key)?storage.get(key):null},
 setItem(key,val){storage.set(key,String(val))}
};
const doc={
 readyState:'loading',
 addEventListener(event,cb){listeners.set(event,cb)},
 getElementById(){return null},
 createElement(){return{setAttribute(){},style:{}}},
 head:{appendChild(){}},body:{}
};
const window={addEventListener(){},LBG_PRODUCTION:true};
vm.runInNewContext(fs.readFileSync('report-engine-v4.js','utf8'),
 {window,document:doc,localStorage,console,Date,MutationObserver:class{observe(){}disconnect(){}},setTimeout(){},requestAnimationFrame(){}},
 {filename:'report-engine-v4.js'});
listeners.get('DOMContentLoaded')();
const engine=window.LBGReportEngineV4;
assert.ok(engine?.gaDisplayValue&&engine?.addReportSheet);
const school='PHÚ TÂN',key='PHU TAN|';
const phuTan={key,schoolName:school,legacySchool:school,siteDisplay:''};
const thuyDuong={key:'THUY DUONG|40 VO DUY NINH',schoolName:'THỦY DƯƠNG',legacySchool:'THỦY DƯƠNG',siteDisplay:'Trường chính: 40 Võ Duy Ninh'};
const phuHau={key:'PHU BINH|PHU HAU',schoolName:'PHÚ BÌNH',legacySchool:'PHÚ BÌNH',siteDisplay:'Cơ sở: Phú Hậu'};
const gaKey=(d,s,loc)=>d+'|'+s+'|'+loc.key;
const cls='@CLASS|6|Chiều|PHU TAN||4/6';
const records={
 [gaKey(6,'Chiều',phuTan)]:'12',
 ['6|Chiều|PHÚ TÂN']:'12',
 [cls]:'12',
 [gaKey(5,'Chiều',thuyDuong)]:'12',
 [gaKey(4,'Sáng',phuTan)]:'11',
 [gaKey(6,'Sáng',phuHau)]:'11'
};
const entry=(schoolName,day,session,period,className,code,siteDisplay='',locationKey)=>({
 schoolName,school:schoolName,day,session,period,teachingPeriod:period,
 classRaw:className,className,classType:'single',code,siteDisplay,locationKey,
 role:'KNS',address:schoolName==='PHÚ TÂN'?'BA157':'AQ185'
});
const ePhuTan=entry('PHÚ TÂN',6,'Chiều',4,'4/6','ĐỨC','',key);
const eThuyDuong=entry('THỦY DƯƠNG',5,'Chiều',4,'5/3','ĐỨC',thuyDuong.siteDisplay,thuyDuong.key);
const ePhuTanMorning=entry('PHÚ TÂN',4,'Sáng',5,'1/3','ĐỨC','',key);
const ePhuHau=entry('PHÚ BÌNH',6,'Sáng',5,'4/1','ĐỨC',phuHau.siteDisplay,phuHau.key);
const original={sheet:'23T11',week:12,code:'ĐỨC',teacherName:'Lê Hữu Đức',total:4,
 entries:[ePhuTan,eThuyDuong,ePhuTanMorning,ePhuHau],gaValues:{...records}};
assert.equal(engine.gaDisplayValue(original,6,'Chiều',phuTan),'11','Phú Tân 4/6 phải học GA11');
assert.equal(original.gaValues[gaKey(6,'Chiều',phuTan)],'11');
assert.equal(original.gaValues['6|Chiều|PHÚ TÂN'],'11');
assert.equal(original.gaValues[cls],'11');
assert.equal(original.gaValues[gaKey(5,'Chiều',thuyDuong)],'12','không được sửa GA12 Thủy Dương');
assert.equal(original.gaValues[gaKey(4,'Sáng',phuTan)],'11');
assert.equal(original.gaValues[gaKey(6,'Sáng',phuHau)],'11');
const diskKey='lbgGaManualV2:active:23T11:ĐỨC';
const backupKey='lbgGaConfirmedCorrectionBackupV1:'+diskKey+':PHU_TAN_4_6_23T11';
assert.equal(JSON.parse(storage.get(diskKey))[gaKey(6,'Chiều',phuTan)],'11','GA lưu phải đồng bộ bản xem');
assert.equal(JSON.parse(storage.get(backupKey)).previous[gaKey(6,'Chiều',phuTan)],'12','sao lưu giá trị GA12 trước khi sửa');
const backup=storage.get(backupKey);
assert.equal(engine.gaDisplayValue(original,6,'Chiều',phuTan),'11');
assert.equal(storage.get(backupKey),backup,'không ghi đè bản sao lưu');
function cloned(overrides={},entries=[ePhuTan,eThuyDuong,ePhuTanMorning,ePhuHau]){
 return {...original,...overrides,entries,gaValues:{...records}};
}
assert.equal(engine.gaDisplayValue(cloned({sheet:'16T11'}),6,'Chiều',phuTan),'12','tuần khác không bị sửa');
assert.equal(engine.gaDisplayValue(cloned({code:'NHUNG',teacherName:'Nhung'}),6,'Chiều',phuTan),'12','GV khác không bị sửa');
assert.equal(engine.gaDisplayValue(cloned({},[{...ePhuTan,classRaw:'4/5',className:'4/5'}]),6,'Chiều',phuTan),'12','lớp 4/5 không bị sửa');
assert.equal(engine.gaDisplayValue(cloned({},[{...ePhuTan,period:3,teachingPeriod:3}]),6,'Chiều',phuTan),'12','tiết khác không bị sửa');
assert.equal(engine.gaDisplayValue(cloned(),5,'Chiều',thuyDuong),'12','GA12 Thủy Dương giữ nguyên');
const noMatch=cloned({},[eThuyDuong,ePhuTanMorning,ePhuHau]);
assert.equal(engine.gaDisplayValue(noMatch,6,'Chiều',phuTan),'12','không tự nhận lớp 4/6 khi TKB không có');
const cellMap=new Map(),rowMap=new Map();
const cellKey=(r,c)=>typeof r==='string'?r:r+'|'+c;
const ws={
 mergeCells(){},getCell(r,c){const k=cellKey(r,c);if(!cellMap.has(k))cellMap.set(k,{value:null});return cellMap.get(k)},
 getRow(r){if(!rowMap.has(r))rowMap.set(r,{height:0,values:[]});return rowMap.get(r)}
};
const workbook={getWorksheet(){return null},addWorksheet(){return ws}};
engine.addReportSheet(workbook,original,'TUẦN 12');
assert.match(String(ws.getCell(11,7).value),/PHÚ TÂN[\s\S]*GA 11/,'Excel chiều thứ Sáu phải GA11');
assert.doesNotMatch(String(ws.getCell(11,7).value),/GA 12/);
assert.match(String(ws.getCell(11,6).value),/THỦY DƯƠNG[\s\S]*GA 12/,'Excel chiều thứ Năm Thủy Dương giữ GA12');
console.log('PASS Phú Tân 4/6 23T11: GA11 ở preview/Excel/lưu GA; GA12 Thủy Dương giữ nguyên, lưu backup và không đổi tuần/lớp khác.');
