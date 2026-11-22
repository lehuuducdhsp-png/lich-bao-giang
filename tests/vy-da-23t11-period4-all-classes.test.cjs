'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const R=require('../tkb-roster-group-period-safe-v1.js');
const P=require('../assist-p-preview-safe-v1.js');
assert.equal(R.VERSION,'20261122.3');assert.equal(P.VERSION,'20261116.1');
// Đối chiếu trực tiếp TKB NĂM HỌC 26-27(2).xlsx, sheet 23T11; lớp trong ảnh đều tiết 4.
const tue=[];
const fri=[
 [['1/2','DUNG','DUNGP'],['1/1','YẾN','YẾNP']],
 [['1/4','HẠ','HẠP'],['1/3','CTV','']],
 [['1/5','THƯ','THƯP'],['1/6','DƯƠNG','DƯƠNGP']],
 [['2/1','D.PHƯƠNG','D.PHƯƠNGP'],['1/7','M.LINH','M.LINHP']],
 [['2/3','DIỆP','DIỆPP'],['2/2','THẢO','THẢOP']],
 [['2/5','TÂM','TÂMP'],['2/4','LỢI','LỢIP']],
 [['2/7','CTV',''],['2/6','THANH','THANHP']],
 [['2/8','CTV',''],null]
];
const cells=new Map([['AX40','TẤT CẢ HỌC TIẾT 4, CHIỀU THỨ 6'],
 ['AZ39','HỌC TIẾT 4'],['W4','4'],['B41','VỸ\n DẠ']]);
for(let i=0;i<tue.length;i++){const [cls,m,p]=tue[i],r=42+i*2;cells.set('W'+r,cls);cells.set('W'+(r+1),m);if(p)cells.set('X'+(r+1),p)}
for(let i=0;i<fri.length;i++)for(let j=0;j<2;j++){
 const v=fri[i][j];if(!v)continue;const r=41+i*2,mc=j===0?'AZ':'BA',pc=j===0?'AY':'BB';
 cells.set(mc+r,v[0]);cells.set(mc+(r+1),v[1]);if(v[2])cells.set((i===7&&j===0?'BA':pc)+(r+1),v[2])
}
const col=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s};
const ws={name:'23T11',rowCount:220,model:{merges:['B41:B59','AX40:AX54','AZ39:BA40']},
 getCell(r,c){const a=col(c)+r,v=cells.get(a)||'';return{value:v,text:v,address:a}}};
const parser={
 locationAt(_w,r){return r>=41&&r<=59?{schoolName:'VỸ',school:'VỸ',locationKey:'VY|'}:
  {schoolName:'TRẦN QUỐC TOẢN',locationKey:'TRAN QUOC TOAN|'}},
 buildHeader(){return{headerRow:4}},
 classMeta(v){return /^[1-5]\/\d+$/.test(v)?
  {classDisplay:v,className:v,classRaw:v,classType:'single',classCount:1}:
  {className:'',classRaw:'',classType:'unknown'}}
};
const mains=[];
function main(r,c,code,cls,day,rawPeriod){
 const e=R.normalizeEntry(ws,{row:r,col:c,classRow:r-1,classType:'single',className:cls,classRaw:cls,
  code,address:col(c)+r,school:'VỸ DẠ',schoolName:'VỸ DẠ',locationKey:'VY DA|',
  day,session:'Chiều',period:rawPeriod},parser);
 mains.push(e);return e
}
for(let i=0;i<tue.length;i++){
 const e=main(43+i*2,23,tue[i][1],tue[i][0],3,4);
 assert.equal(e.period,4);assert.equal(e.locationKey,'VY DA|');
}
for(let i=0;i<fri.length;i++)for(let j=0;j<2;j++){
 const rec=fri[i][j];if(!rec)continue;
 const e=main(42+i*2,j===0?52:53,rec[1],rec[0],6,j===0?3:4);
 assert.equal(e.day,6);assert.equal(e.session,'Chiều');assert.equal(e.period,4);
 assert.equal(e.teachingPeriod,4);assert.equal(e.slotPeriod,j===0?3:4);
 assert.equal(e.locationKey,'VY DA|','Keep existing KNS/STEM GA history site');
}
assert.equal(mains.length,15,'23T11: 15 Friday main; Tuesday W is OFF');
for(const cls of ['1/2','1/4','1/5','2/1','2/3','2/5','2/7','2/8'])assert.ok(mains.some(e=>e.className===cls&&e.period===4),'Ảnh lớp '+cls+' phải học tiết 4');
const info={23:{day:3,session:'Chiều',period:4},24:{day:3,session:'Chiều',period:5},
 51:{day:6,session:'Chiều',period:2},52:{day:6,session:'Chiều',period:3},
 53:{day:6,session:'Chiều',period:4},54:{day:6,session:'Chiều',period:5}};
const codes=new Set(mains.map(e=>e.code));
const p={...parser,
 timetableColumns(){return Object.keys(info).map(Number)},
 colInfoFor(_w,c){return info[c]||null},
 scanAssignments(_w,code){return code?mains.filter(e=>e.code===code):mains},
 specialScheduleHintAt(_w,r,c){return R.specialScheduleHintAt(ws,r,c,parser)},
 rosterTeachingPeriodAt(_w,r,c){return R.specialScheduleHintAt(ws,r,c,parser)?.period||null},
 vyDaAssistMainColAt(_w,r,c){return R.vyDaAssistMainColAt(ws,r,c,parser)},
 resolveTeacherCode(_w,code){return codes.has(code)?{code}:null}
};
function reader(file,expose){
 let src=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 assert.match(src,/\}\)\(\);\s*$/);
 src=src.replace(/\}\)\(\);\s*$/,'window.'+expose+'=scanAssist;})();');
 const env={window:{LBGTkbParserV2:p},document:{readyState:'loading',addEventListener(){}},
  console,setInterval(){return 0},clearInterval(){},setTimeout(){return 0},module:undefined};
 vm.runInNewContext(src,env,{filename:file});return env.window[expose]
}
const expected=[...tue.map((v,i)=>({cls:v[0],code:v[1],assist:v[2],row:43+i*2,day:3})),
 ...fri.flatMap((g,i)=>g.filter(Boolean).map(v=>({cls:v[0],code:v[1],assist:v[2],row:42+i*2,day:6})))].filter(x=>x.assist);
assert.equal(expected.length,12,'12 P chiều thứ Sáu, không tự tạo CTVP');
for(const read of [reader('assist-p-preview-safe-v1.js','preview'),reader('assist-p-trial-v1.js','official')]){
 const seen=new Set();
 for(const code of new Set(expected.map(x=>x.code))){
  const found=read(ws,code),gold=expected.filter(x=>x.code===code);
  assert.equal(found.length,gold.length,code+' P count');
  for(const e of gold){
   const entry=found.find(x=>x.row===e.row);
   assert.ok(entry,code+' missing row '+e.row);
   assert.equal(entry.className,e.cls,code+' P wrong class');
   assert.equal(Number(entry.day),e.day);
   assert.equal(entry.session,'Chiều');assert.equal(Number(entry.period),4);
   assert.equal(entry.schoolName,'VỸ DẠ');assert.equal(entry.locationKey,'VY DA|');
   seen.add(entry.address);
  }
 }
 assert.equal(seen.size,12);assert.equal(read(ws,'CTV').length,0);
}
assert.equal(R.vyDaFridayAt(ws,60,52,parser),null);
const weekWithoutNote={...ws,name:'09T11',getCell(r,c){const x=ws.getCell(r,c);return r===40&&c===50?{...x,value:'',text:''}:x}};
assert.equal(R.vyDaFridayAt(weekWithoutNote,42,52,parser),null);
assert.equal(R.vyDaAssistMainColAt(ws,44,27,parser),null);
assert.equal(R.vyDaFridayAt(ws,42,52,parser)?.period,4);
assert.equal(R.vyDaAssistMainColAt(ws,56,53,parser),null,'23T11: 2/8 học CTV, không tự tạo P');
// Real Excel update also shifts Phú Bình/Phú Hậu blocks down a row (82:95),
// so P at row 96 belongs to Phú Bình even when B96 starts Hương Vinh.
const pcells=new Map([['B82','PHÚ BÌNH'],['B96','HƯƠNG VINH'],
 ['AB82','CƠ SỞ PHÚ BÌNH\nHỌC TIẾT 4 CHIỀU THỨ 4'],['AQ82','CƠ SỞ PHÚ HẬU\nHỌC TIẾT 5 SÁNG THỨ 6'],
 ['AD96','CHIP'],['AS96','QUỲNHP']]);
const pws={name:'16T11',rowCount:120,model:{merges:['B82:B95','B96:B116','AB82:AC95','AQ82:AR95']},
 getCell(r,c){const a=col(c)+r,v=pcells.get(a)||'';return{text:v,value:v,address:a}}};
const pparser={locationAt(_w,r){return r<=95?{schoolName:'PHÚ BÌNH',locationKey:'PHU BINH|'}:
 {schoolName:'HƯƠNG VINH',locationKey:'HUONG VINH|'}}};
const b=R.specialScheduleHintAt(pws,96,30,pparser),h=R.specialScheduleHintAt(pws,96,45,pparser);
assert.equal(b?.location?.locationKey,'PHU BINH|CO SO 2|PHU BINH CU');
assert.equal(h?.location?.locationKey,'PHU BINH|CO SO 1|PHU HAU CU');
assert.equal(b?.period,4);assert.equal(h?.period,5);
assert.equal(R.specialScheduleHintAt(pws,97,30,pparser),null);
console.log('PASS VỸ DẠ 23T11 (2): 15 main, 12 P, 3 CTV, Tue/Fri true period 4, official+preview readers, Phú Bình row-96 P protected');
