'use strict';
const assert=require('node:assert/strict');
const R=require('../tkb-roster-group-period-safe-v1.js');
const cells=new Map([
 ['AX40','TẤT CẢ HỌC TIẾT 4, CHIỀU THỨ 6'],['AZ39','HỌC TIẾT 4'],
 ['AZ41','1/2'],['AZ42','DUNG'],['BA41','1/1'],['BA42','YẾN'],
 ['AZ43','1/4'],['AZ44','DUNG2'],['BA43','1/3'],['BA44','QUỲNH'],
 ['AZ55','2/8'],['AZ56','CTV'],['B41','VỸ\n DẠ']
]);
const colName=c=>{let s='';while(c){c--;s=String.fromCharCode(65+c%26)+s;c=Math.floor(c/26)}return s};
const ws={name:'16T11',getCell(r,c){const address=colName(c)+r,v=cells.get(address)||'';return{address,value:v,text:v}}};
const parser={
 locationAt(_ws,r){return{schoolName:r>=41&&r<=56?'VỸ':'KHÁC'}},
 colInfoFor(_ws,col){const p={51:2,52:3,53:4,54:5};return p[col]?{day:6,session:'Chiều',period:p[col]}:null},
 specialScheduleHintAt(w,r,c){return R.specialScheduleHintAt(w,r,c,parser)},
 timetableColumns(){return[52,53]}
};
global.window={LBGTkbParserV2:parser};
const T=require('../teacher-intelligence-v6.js');
for(const [r,c,p] of [[42,52,3],[42,53,4],[44,52,3],[44,53,4],[56,52,3]]){
 const v=T.scheduleAt(ws,r,c);
 assert.equal(v.day,6);assert.equal(v.session,'Chiều');
 assert.equal(v.period,4,'Vỹ Dạ chiều thứ Sáu phải vào tiết 4');
 assert.equal(v.slotPeriod,p,'giữ tiết ô gốc để truy vết');
}
assert.equal(T.scheduleAt({...ws,name:'09T11'},42,52).period,3,'tuần khác không bị ép tiết 4');
const noNote={...ws,getCell(r,c){const x=ws.getCell(r,c);return r===40&&c===50?{...x,value:'',text:''}:x}};
assert.equal(T.scheduleAt(noNote,42,52).period,3,'thiếu ghi chú không tự gán tiết');
window.LBGTeacherIntelligenceV6=T;
const V8=require('../weekly-stats-enhancement-v8.js');
const auditWs={...ws,eachRow(_opts,callback){callback({number:42,getCell(col){return ws.getCell(42,col)}})}};
const roles=new Map([['DUNG',{code:'DUNG',role:'KNS'}],['YẾN',{code:'YẾN',role:'KNS'}]]);
const audit=V8.rawCodeAudit(auditWs,roles);
assert.equal(audit.rawRows.find(x=>x.token==='DUNG')?.period,4,'kiểm toán dùng tiết thực tế');
assert.equal(audit.rawRows.find(x=>x.token==='YẾN')?.period,4);
assert.equal(audit.unknown.length,0);
console.log('PASS: thống kê Vỹ Dạ tiết 4, giữ ô nguồn, không sửa lịch tuần khác');
