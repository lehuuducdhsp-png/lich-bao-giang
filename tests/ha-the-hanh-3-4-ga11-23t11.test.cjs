'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('report-engine-v4.js','utf8');
const storage=new Map(),callbacks=new Map();
const localStorage={
 getItem(key){return storage.has(key)?storage.get(key):null},
 setItem(key,value){storage.set(key,String(value))},
 removeItem(key){storage.delete(key)}
};
const document={
 readyState:'loading',
 addEventListener(name,fn){callbacks.set(name,fn)},
 getElementById(){return null},
 createElement(){return{setAttribute(){},textContent:'',id:'',style:{}}},
 head:{appendChild(){}},body:{}
};
const window={addEventListener(){},LBG_PRODUCTION:true};
const context={window,document,localStorage,console,Date,MutationObserver:class{observe(){}disconnect(){}},setTimeout(){},requestAnimationFrame(){}};
vm.runInNewContext(code,context,{filename:'report-engine-v4.js'});
assert.equal(typeof callbacks.get('DOMContentLoaded'),'function');
callbacks.get('DOMContentLoaded')();
const engine=window.LBGReportEngineV4;
assert.ok(engine?.gaDisplayValue&&engine?.addReportSheet,'báo giảng phải sẵn sàng');
const locKey='HA THE HANH|TU HA 1 CU';
const loc={key:locKey,schoolName:'HÀ THẾ HẠNH',siteDisplay:'Phân hiệu: Tứ Hạ 1 cũ',legacySchool:'HÀ THẾ HẠNH'};
const common='4|Sáng|'+locKey,legacy='4|Sáng|HÀ THẾ HẠNH',cls='@CLASS|4|Sáng|'+locKey+'|3/4';
const entry={day:4,session:'Sáng',period:5,schoolName:loc.schoolName,school:'HÀ THẾ HẠNH',
 siteDisplay:loc.siteDisplay,locationKey:locKey,className:'3/4 (GA 12)',classRaw:'3/4',
 classType:'single',code:'M.LINH',address:'AZ51',role:'KNS'};
const orig={sheet:'23T11',code:'M.LINH',teacherName:'Ngô Thị Mỹ Linh',week:12,
 entries:[entry],total:1,gaValues:{[common]:'12',[legacy]:'12',[cls]:'12','5|Chiều|PHU BINH':'12'}};
assert.equal(engine.gaDisplayValue(orig,4,'Sáng',loc),'11','ô GA Hà Thế Hạnh phải về 11');
assert.equal(orig.gaValues[common],'11');
assert.equal(orig.gaValues[legacy],'11');
assert.equal(orig.gaValues[cls],'11','GA riêng lớp 3/4 cũng phải về 11');
assert.equal(orig.entries[0].className,'3/4','không được giữ chú thích GA12 sai');
assert.equal(orig.gaValues['5|Chiều|PHU BINH'],'12','không sửa trường khác');
const diskKey='lbgGaManualV2:active:23T11:M.LINH',backupKey='lbgGaConfirmedCorrectionBackupV1:'+diskKey+':HA_THE_HANH_3_4_23T11';
assert.equal(JSON.parse(storage.get(diskKey))[common],'11','lưu đúng GA để xuất/lưu Google Sheets');
assert.equal(JSON.parse(storage.get(backupKey)).previous[common],'12','giữ bản gốc trước khi thay đổi');
const savedBackup=storage.get(backupKey);
assert.equal(engine.gaDisplayValue(orig,4,'Sáng',loc),'11');
assert.equal(storage.get(backupKey),savedBackup,'lặp lại không ghi đè bản sao lưu');
const makeCase=(changes={})=>({
 ...orig,...changes,
 entries:[{...entry,className:'3/4'}],
 gaValues:{[common]:'12',[legacy]:'12',[cls]:'12'}
});
assert.equal(engine.gaDisplayValue(makeCase({sheet:'16T11'}),4,'Sáng',loc),'12','tuần 16T11 không bị đổi');
assert.equal(engine.gaDisplayValue(makeCase({code:'THAO',teacherName:'Thảo'}),4,'Sáng',loc),'12','giáo viên khác không bị đổi');
assert.equal(engine.gaDisplayValue(makeCase({sheet:'23T11'}),5,'Sáng',loc),'','thứ Năm không tự ép GA11');
const siteOther={...loc,key:'HA THE HANH|TU HA 2 CU',siteDisplay:'Phân hiệu: Tứ Hạ 2 cũ'};
assert.equal(engine.gaDisplayValue(makeCase(),4,'Sáng',siteOther),'','điểm trường khác không bị đổi');
const schoolOther={...loc,key:'PHU BINH|TU HA 1 CU',schoolName:'PHÚ BÌNH'};
assert.equal(engine.gaDisplayValue(makeCase(),4,'Sáng',schoolOther),'','trường khác không bị đổi');
// Excel render calls the same canonical GA value used by on-screen report.
const cells=new Map(),rows=new Map();
const key=(r,c)=>typeof r==='string'?r:r+'|'+c;
const ws={
 mergeCells(){},getCell(r,c){const k=key(r,c);if(!cells.has(k))cells.set(k,{value:null});return cells.get(k)},
 getRow(r){if(!rows.has(r))rows.set(r,{height:0,values:[]});return rows.get(r)}
};
const workbook={getWorksheet(){return null},addWorksheet(){return ws}};
engine.addReportSheet(workbook,orig,'TUAN 12');
assert.match(String(ws.getCell(5,5).value),/HÀ THẾ HẠNH[\s\S]*GA 11/,'Excel sáng thứ Tư phải ghi GA11');
assert.doesNotMatch(String(ws.getCell(5,5).value),/GA 12/,'Excel không được xuất GA12');
console.log('PASS: 23T11 HÀ THẾ HẠNH 3/4 GA11 ở preview, Excel, payload; giữ bản GA12 cũ và không ảnh hưởng lớp khác.');
