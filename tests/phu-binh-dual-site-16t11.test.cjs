'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const R=require('../tkb-roster-group-period-safe-v1.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/phu-binh-dual-site-20261113.json'),'utf8'));
const letters=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
function ws(name){
 const o=fixture[name];return{name,rowCount:name==='16T11'?286:283,columnCount:85,
   model:{merges:o.merges},getCell(row,col){const address=letters(col)+row,value=o.cells[address]||'';return{address,text:value,value}}};
}
const browser={},doc={getElementById:()=>null,addEventListener:()=>{},querySelector:()=>null};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../tkb-parser-v2.js'),'utf8'),{window:browser,document:doc,setTimeout:()=>0,console});
const p=browser.LBGTkbParserV2;
assert.ok(p?.locationAt&&p?.parseSite&&p?.classMeta,'use actual TKB parser');
const live=ws('16T11'),old=ws('09T11');
const cases=[
 {name:'Phú Bình',c1:30,c2:33,key:p.locationAt(old,89).locationKey,day:4,session:'Chiều',period:4,main:19,assist:18},
 {name:'Phú Hậu',c1:45,c2:48,key:p.locationAt(old,84).locationKey,day:6,session:'Sáng',period:5,main:16,assist:16}
];
let total=0;
for(const spec of cases){
 let mains=0,assists=0;const classes=new Set();
 for(let row=81;row<=93;row+=3)for(let col=spec.c1;col<=spec.c2;col++){
   const cls=live.getCell(row,col).text;if(!/^\d\/[1-9]\d*$/.test(cls))continue;
   const code=live.getCell(row+1,col).text,assistant=live.getCell(row+2,col).text;
   assert.ok(code,'missing main teacher '+live.getCell(row+1,col).address);
   const loc=p.locationAt(live,row);
   const result=R.normalizeEntry(live,{day:2,session:'Sáng',period:1,row:row+1,col,classRow:row,
     className:cls,classRaw:cls,classType:'single',schoolName:loc.schoolName,school:loc.schoolName,
     siteRaw:loc.siteRaw,siteDisplay:loc.siteDisplay,locationKey:loc.locationKey,sourceCode:code,code,
     address:live.getCell(row+1,col).address},p);
   assert.equal(result.schoolName,'PHÚ BÌNH',cls+' school');
   assert.equal(result.locationKey,spec.key,cls+' GA historical site key');
   assert.equal(result.day,spec.day,cls+' day');
   assert.equal(result.session,spec.session,cls+' session');
   assert.equal(result.teachingPeriod,spec.period,cls+' teaching period');
   assert.equal(result.slotDay,2,'keep original Excel slot day');
   assert.equal(result.slotPeriod,1,'keep original Excel slot period');
   assert.ok(result.siteRaw.includes(spec.name.toUpperCase()),'wrong campus: '+cls);
   mains++;classes.add(cls);
   if(assistant){
     assert.equal(assistant,code+'P',cls+' assistant must pair with its own class');
     const hint=R.phuBinhDualSiteAt(live,row+2,col,p,assistant);
     assert.ok(hint,'missing P site '+live.getCell(row+2,col).address);
     assert.equal(hint.locationKey,result.locationKey,'P campus');
     assert.equal(hint.day,result.day,'P day');
     assert.equal(hint.session,result.session,'P session');
     assert.equal(hint.period,result.teachingPeriod,'P teaching period');
     if(row+2===95)assert.equal(hint.trailingAssist,true,'row-95 P must remain Phu Binh not Huong Vinh');
     assists++;
   }
 }
 assert.equal(mains,spec.main,spec.name+' main count from XLSX');
 assert.equal(assists,spec.assist,spec.name+' assistant count from XLSX');
 assert.equal(classes.size,mains,spec.name+' distinct class count');
 total+=mains+assists;
}
assert.equal(total,69);
assert.equal(live.getCell(82,32).text,'CTV','1/6 Phu Binh has CTV (without P)');
assert.equal(live.getCell(83,32).text,'','do not fabricate P for CTV');
assert.equal(R.phuBinhDualSiteAt(live,95,30,p,'INVALIDP'),null,'wrong P code cannot cross school boundary');
assert.equal(R.phuBinhDualSiteAt(live,95,30,p,''),null,'next school main cannot be pulled backward');
assert.equal(R.phuBinhDualSiteAt(old,89,30,p,''),null,'keep previous weeks C-column site logic');
assert.equal(R.phuBinhDualSiteAt(live,80,30,p,''),null,'do not borrow previous school');
console.log('PASS XLSX 16T11: Phu Binh 19 main/18 P, Phu Hau 16 main/16 P, historical GA site keys and trailing P all preserved');
