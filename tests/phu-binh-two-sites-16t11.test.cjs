'use strict';
const assert=require('node:assert/strict');
const R=require('../tkb-roster-group-period-safe-v1.js');
assert.equal(R.VERSION,'20261113.2');

// Trích nguyên cấu trúc/nhãn lớp từ TKB 16T11 (không đưa file Excel thật lên GitHub).
// PHÚ BÌNH là MỘT trường, nhãn cơ sở nằm ngang AB81:AC94 và AQ81:AR94.
const cells=new Map(),put=(r,c,v)=>cells.set(r+','+c,String(v));
put(81,28,'CƠ SỞ PHÚ BÌNH\nHỌC TIẾT 4 CHIỀU THỨ 4');
put(81,43,'CƠ SỞ PHÚ HẬU\nHỌC TIẾT 5 SÁNG THỨ 6');
const sites=[
{label:'PHÚ BÌNH CŨ',prefix:'BINH',columns:[30,31,32,33],groups:[['1/4','1/5','1/6','1/7'],['2/4','2/5','2/6'],['3/4','3/5','3/6','3/7'],['4/4','4/5','4/6','4/7'],['5/5','5/6','5/7','5/8']],day:4,session:'Chiều',period:4,key:'CO SO 2|PHU BINH CU'},
{label:'PHÚ HẬU CŨ',prefix:'HAU',columns:[45,46,47,48],groups:[['1/1','1/2','1/3'],['2/1','2/2','2/3'],['3/1','3/2','3/3'],['4/1','4/2','4/3'],['5/1','5/2','5/3','5/4']],day:6,session:'Sáng',period:5,key:'CO SO 1|PHU HAU CU'}
];
for(const s of sites)for(let i=0;i<s.groups.length;i++)for(let k=0;k<s.groups[i].length;k++){
 const r=81+i*3,c=s.columns[k],code=s.prefix+'_'+i+'_'+k;
 put(r,c,s.groups[i][k]);put(r+1,c,s.prefix==='BINH'&&i===0&&k===2?'CTV':code);
 if(!(s.prefix==='BINH'&&i===0&&k===2))put(r+2,c,code+'P');
}
const ws={rowCount:97,model:{merges:['B81:B94','B95:B112','AB81:AC94','AQ81:AR94']},getCell(r,c){const text=cells.get(r+','+c)||'';return{text,value:text,address:'C'+c+'R'+r}}};
const parser={
 locationAt:(w,r)=>r<=94?{schoolName:'PHÚ BÌNH',schoolKey:'PHU BINH',locationKey:'PHU BINH|'}:{schoolName:'HƯƠNG VINH',locationKey:'HUONG VINH|'},
 parseSite:raw=>{const m=raw.match(/^CƠ SỞ (\d) - (.+)$/),siteKey='CO SO '+m[1]+'|'+m[2].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 return{siteRaw:raw,siteType:'Cơ sở '+m[1],siteName:m[2],siteDisplay:'Cơ sở '+m[1]+': '+m[2],siteKey}}
};
const mains=[];let nP=0;
for(const s of sites)for(let i=0;i<s.groups.length;i++)for(let k=0;k<s.groups[i].length;k++){
 const classRow=81+i*3,row=classRow+1,col=s.columns[k],name=s.groups[i][k],code=cells.get(row+','+col);
 const e=R.normalizeEntry(ws,{row,col,classRow,className:name,classRaw:name,classType:'single',code,day:2,session:'Sáng',period:1,schoolName:'PHÚ BÌNH',locationKey:'PHU BINH|'},parser);
 mains.push(e);
 assert.equal(e.schoolName,'PHÚ BÌNH');assert.equal(e.siteName,s.label);
 assert.equal(e.locationKey,'PHU BINH|'+s.key);assert.equal(e.day,s.day);assert.equal(e.session,s.session);assert.equal(e.teachingPeriod,s.period);
 assert.equal(e.period,1,'giữ tọa độ tiết nguồn');
 if(cells.has((row+1)+','+col)){
  nP++;const hint=R.specialScheduleHintAt(ws,row+1,col,parser);
  assert.equal(hint?.siteName,s.label);assert.equal(hint?.day,s.day);assert.equal(hint?.period,s.period);
  if(row+1===95)assert.equal(hint?.spillFromLastRow,true);
 }
}
assert.equal(mains.length,35);assert.equal(nP,34);
assert.equal(mains.filter(x=>x.siteName==='PHÚ BÌNH CŨ').length,19);
assert.equal(mains.filter(x=>x.siteName==='PHÚ HẬU CŨ').length,16);
put(95,30,'SAIP');assert.equal(R.specialScheduleHintAt(ws,95,30,parser),null,'P không trùng GV thì không kế thừa');
put(95,30,'BINH_4_0P');assert.equal(R.specialScheduleHintAt(ws,96,30,parser),null,'không tràn qua trường tiếp theo');
const old={rowCount:92,model:{merges:['B81:B91','C81:C87','C88:C91']},getCell(r,c){const text=c===3&&r===81?'CƠ SỞ 1 - PHÚ HẬU CŨ':c===3&&r===88?'CỞ SỞ 2 - PHÚ BÌNH CŨ':'';return{text,value:text}}};
assert.equal(R.phuBinhHorizontalSiteAt(old,85,30,parser),null,'tuần cũ dạng dọc giữ nguyên');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const window={},document={readyState:'complete',addEventListener(){},getElementById(){return null}};
window.LBGTkbParserV2={...parser,buildHeader:()=>({headerRow:4}),timetableColumns:()=>[30,31,32,33,45,46,47,48],
 colInfoFor:()=>({day:2,session:'Sáng',period:1}),scanAssignments:()=>mains,
 resolveTeacherCode:(w,code)=>code?{code}:null,
 classMeta:value=>/^([1-5])\/\d+$/.test(String(value))?{classType:'single',classRaw:String(value),classDisplay:String(value),classCount:1,groupNote:''}:{classType:'unknown',classRaw:String(value)},
 specialScheduleHintAt:(w,r,c)=>R.specialScheduleHintAt(w,r,c,parser),
 rosterTeachingPeriodAt:(w,r,c)=>R.specialScheduleHintAt(w,r,c,parser)?.period||null};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assist-p-preview-safe-v1.js'),'utf8'),{window,document,console,setTimeout});
for(const [code,cls,site,day,session,period] of [
 ['BINH_4_0','5/5','Cơ sở 2: PHÚ BÌNH CŨ',4,'Chiều',4],
 ['HAU_4_0','5/1','Cơ sở 1: PHÚ HẬU CŨ',6,'Sáng',5]]){
 const p=window.LBGAssistPPreviewSafe.scanAssist(ws,code);
 assert.equal(p.length,1);assert.equal(p[0].row,95);assert.equal(p[0].schoolName,'PHÚ BÌNH');
 assert.equal(p[0].className,cls);assert.equal(p[0].siteDisplay,site);
 assert.equal(p[0].day,day);assert.equal(p[0].session,session);assert.equal(p[0].teachingPeriod,period);
 assert.equal(p[0].payEligible,false);assert.equal(p[0].assistClassSource,'phu-binh-last-row-paired-main');
}
console.log('PASS: 16T11 Phú Bình 2 cơ sở, 35 chính, 34 P, hàng 95 P không nhầm Hương Vinh.');