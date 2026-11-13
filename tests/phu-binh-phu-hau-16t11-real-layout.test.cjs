'use strict';
const assert=require('node:assert/strict');
const R=require('../tkb-roster-group-period-safe-v1.js');
const P=require('../assist-p-preview-safe-v1.js');

// Fixture được chép đối chiếu từ file TKB NĂM HỌC 26-27.xlsx / tab 16T11.
// KHÔNG đưa file Excel có dữ liệu đầy đủ lên GitHub.
const sites=[
 {name:'Phú Bình',header:'AB',merge:'AB81:AC94',cols:['AD','AE','AF','AG'],day:4,session:'Chiều',period:4,classes:[
  ['1/4','HIẾU','HIẾUP'],['1/5','LINH2','LINH2P'],['1/6','CTV',''],['1/7','LIÊN','LIÊNP'],
  ['2/4','NHƯ','NHƯP'],['2/5','M.LINH','M.LINHP'],['2/6','HÀ TÂM','HÀ TÂMP'],
  ['3/4','MINHANH','MINHANHP'],['3/5','TÂM','TÂMP'],['3/6','MYANH','MYANHP'],['3/7','NHUNG','NHUNGP'],
  ['4/4','K.THI','K.THIP'],['4/5','ĐỖ MY','ĐỖ MYP'],['4/6','THẢO2','THẢO2P'],['4/7','HẰNG','HẰNGP'],
  ['5/5','CHI','CHIP'],['5/6','ĐỨC','ĐỨCP'],['5/7','MỘNG','MỘNGP'],['5/8','NAM','NAMP']]},
 {name:'Phú Hậu',header:'AQ',merge:'AQ81:AR94',cols:['AS','AT','AU','AV'],day:6,session:'Sáng',period:5,classes:[
  ['1/1','THẢO','THẢOP'],['1/2','HẠ','HẠP'],['1/3','DUNG','DUNGP'],
  ['2/1','CHI','CHIP'],['2/2','D.PHƯƠNG','D.PHƯƠNGP'],['2/3','ĐỨC','ĐỨCP'],
  ['3/1','ĐÔ','ĐÔP'],['3/2','MYANH','MYANHP'],['3/3','K.THI','K.THIP'],
  ['4/1','MINHANH','MINHANHP'],['4/2','ĐỖ MY','ĐỖ MYP'],['4/3','THẢO2','THẢO2P'],
  ['5/1','QUỲNH','QUỲNHP'],['5/2','HƯƠNG','HƯƠNGP'],['5/3','LỢI','LỢIP'],['5/4','HUỲNH','HUỲNHP']]}
];
const num=s=>[...s].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0);
const letters=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s};
const cells=new Map([['B81','PHÚ BÌNH'],['B95','HƯƠNG VINH']]);
const teacherSet=new Set();
for(const s of sites){
 cells.set(s.header+'81','CƠ SỞ '+s.name.toUpperCase()+'\nHỌC TIẾT '+s.period+' '+s.session.toUpperCase()+' THỨ '+s.day);
 for(const [cls,main,assist] of s.classes){
  const col=s.cols[(Number(cls.split('/')[1])-Number(cls.split('/')[0])+(s.name==='Phú Hậu'?0:0)+s.cols.length)%s.cols.length];
  // Resolve exact position from class list by its grade-local order, not day column.
  const siblings=s.classes.filter(x=>x[0].startsWith(cls[0]+'/'));
  const idx=siblings.findIndex(x=>x[0]===cls);
  const actualCol=s.cols[idx],r=81+(Number(cls[0])-1)*3;
  cells.set(actualCol+r,cls);
  cells.set(actualCol+(r+1),main);teacherSet.add(main);
  if(assist)cells.set(actualCol+(r+2),assist);
 }
}
const ws={
 name:'16T11',rowCount:120,model:{merges:['B81:B94','B95:B115','AB81:AC94','AQ81:AR94']},
 getCell(row,col){const addr=(typeof col==='number'?letters(col):col)+row;
   const val=cells.get(addr)||'';
   return{value:val,text:val,address:addr}}
};
const parser={
 locationAt(_ws,row){const isPhu=Number(row)<=94;
  return isPhu?{school:'PHÚ BÌNH',schoolName:'PHÚ BÌNH',schoolKey:'PHU BINH',siteRaw:'',siteDisplay:'',locationKey:'PHU BINH|',notes:[]}:
   {school:'HƯƠNG VINH',schoolName:'HƯƠNG VINH',schoolKey:'HUONG VINH',siteRaw:'TRƯỜNG CHÍNH',siteDisplay:'Trường chính',locationKey:'HUONG VINH|',notes:[]};},
 buildHeader(){return{headerRow:4}},
 classMeta(raw){const s=String(raw||'');return /^[1-5]\/[1-9]$/.test(s)?{classDisplay:s,className:s,classRaw:s,classType:'single',classCount:1}:{classType:'unknown',className:'',classRaw:''};},
 resolveTeacherCode(_ws,code){return teacherSet.has(String(code))?{code:String(code)}:null}
};
let mainCount=0,assistCount=0;
for(const s of sites){
 for(const [cls,main,assist] of s.classes){
  const siblings=s.classes.filter(x=>x[0].startsWith(cls[0]+'/'));
  const colName=s.cols[siblings.findIndex(x=>x[0]===cls)],col=num(colName);
  const r=81+(Number(cls[0])-1)*3,mainRow=r+1,assistRow=r+2;
  assert.equal(ws.getCell(mainRow,col).text,main,'source workbook main '+cls);
  const raw={row:mainRow,col,classRow:r,code:main,sourceCode:main,
   className:cls,classRaw:cls,classType:'single',day:s.day,session:s.session,period:col-s.cols.map(num)[0]+1,
   schoolName:'PHÚ BÌNH',school:'PHÚ BÌNH',locationKey:'PHU BINH|',address:colName+mainRow};
  const fixed=R.normalizeEntry(ws,raw,parser);
  assert.equal(fixed.day,s.day,cls+' main day');
  assert.equal(fixed.session,s.session,cls+' main session');
  assert.equal(fixed.period,s.period,cls+' main period shown in report');
  assert.equal(fixed.teachingPeriod,s.period,cls+' main teachingPeriod');
  assert.equal(fixed.slotPeriod,raw.period,cls+' original Excel slot kept');
  assert.equal(fixed.schoolName,'PHÚ BÌNH',cls+' main school');
  assert.equal(fixed.siteName,s.name,cls+' site distinct');
  assert.equal(fixed.siteDisplay,'Cơ sở: '+s.name,cls+' site label');
  assert.equal(fixed.specialTeachingSchedule,true);
  mainCount++;
  if(assist){
   assert.equal(ws.getCell(assistRow,col).text,assist,'source workbook P '+cls);
   const hint=R.specialScheduleHintAt(ws,assistRow,col,parser);
   assert.ok(hint,cls+' P must keep merged header');
   assert.equal(hint.day,s.day,cls+' P day');
   assert.equal(hint.session,s.session,cls+' P session');
   assert.equal(hint.period,s.period,cls+' P period');
   assert.equal(hint.location.schoolName,'PHÚ BÌNH',cls+' P school (even row 95)');
   assert.equal(hint.location.siteName,s.name,cls+' P correct site');
   assert.equal(hint.blockEndRow,94);
   const metaLoc=parser.locationAt(ws,assistRow===95?94:assistRow);
   const localP=P.strictClassForPColumn(ws,assistRow,col,main,metaLoc,parser);
   assert.equal(localP.className,cls,cls+' P class same column; row '+assistRow);
   assistCount++;
  }
 }
}
assert.equal(mainCount,35);
assert.equal(assistCount,34);
assert.equal(ws.getCell(83,num('AF')).text,'','CTV must not have fabricated CTVP');
for(const col of [num('AD'),num('AS')]){
 assert.equal(R.mergedPhuBinhSiteAt(ws,96,col,parser),null,'do not leak into next school after P spill');
}
assert.equal(R.mergedPhuBinhSiteAt(ws,94,num('AH'),parser),null,'not extend beyond four class columns');
console.log('PASS real 16T11 layout: 35 main (incl CTV), 34 P, 2 merged sites, grade-5 P spill row 95');
