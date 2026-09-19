'use strict';
const assert=require('node:assert/strict');
const R=require('../tkb-roster-group-period-safe-v1.js');
const G=require('../grouped-plus-report-safe-v1.js');

assert.equal(R.VERSION,'20260919.1');
assert.equal(G.VERSION,'20260919.1');

function colName(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
const cells=new Map([
  ['65,10','KHỐI 4 (4 LỚP) - TIẾT 4'],
  ['66,10','M.LINH'],['66,11','M.LINH'],['66,12','YẾN'],['66,13','YẾN'],['66,14','DƯƠNG+'],
  ['67,14','DƯƠNGP']
]);
const ws={
  name:'21T9',rowCount:75,model:{merges:['J65:N65']},
  getCell(row,col){const text=cells.get(`${row},${col}`)||'';return{text,value:text,address:`${colName(col)}${row}`}}
};
const classMeta=value=>{
  const m=String(value||'').match(/KHỐI\s*(\d+)\s*\(\s*(\d+)\s*LỚP\s*\)\s*-\s*TIẾT\s*([1-5])/i);
  return m?{classRaw:String(value),classType:'combined',classCount:Number(m[2]),classDisplay:`KHỐI ${m[1]} (${m[2]} LỚP)`,groupNote:`TIẾT ${m[3]}`}:{classRaw:String(value||''),classType:'unknown',classCount:1,classDisplay:String(value||''),groupNote:''};
};
const parser={
  classMeta,
  buildHeader(){return{headerRow:4}},
  timetableColumns(){return[10,11,12,13,14]},
  colInfoFor(sheet,col){return{day:2,session:'Chiều',period:col-9,col}},
  resolveTeacherCode(sheet,raw){const code=String(raw||'').toUpperCase();return new Set(['M.LINH','YẾN','DƯƠNG']).has(code)?{code,mapping:'exact'}:null},
  teacherSummary(){return{byCode:new Map([['DƯƠNG',{name:'Hồ Hải Dương',code:'DƯƠNG'}]])}},
  locationAt(){return{schoolName:'TRẦN QUỐC TOẢN',siteDisplay:'Địa điểm: PHÚ HÒA CŨ',locationLabel:'TRẦN QUỐC TOẢN\nĐịa điểm: PHÚ HÒA CŨ',locationKey:'TRAN QUOC TOAN|PHU HOA CU',notes:[]}}
};

const plus=R.scanPlusGroupedAssignments(ws,'DƯƠNG',parser);
assert.equal(plus.length,1);
assert.equal(plus[0].address,'N66');
assert.equal(plus[0].sourceCode,'DƯƠNG+');
assert.equal(plus[0].className,'KHỐI 4 (4 LỚP)');
assert.equal(plus[0].groupNote,'TIẾT 4');
assert.equal(plus[0].period,5,'vị trí nguồn vẫn là cột Tiết 5');
assert.equal(plus[0].teachingPeriod,4,'tiết thực dạy của nhóm phải là Tiết 4');
assert.equal(plus[0].payUnits,0,'plus pseudo-entry không được cộng vào tổng chính');

const report={sheet:'21T9',code:'DƯƠNG',teacherName:'Hồ Hải Dương',total:4,atomicTotal:4,payTotal:4,entries:[
  {address:'R187',day:3,session:'Chiều',teachingPeriod:4,className:'1/2'}
]};
G.mergeReportPlus(report,plus);
assert.equal(report.total,4,'TỔNG chính phải giữ 4');
assert.equal(report.entries.length,2);
assert.equal(report.entries.find(e=>e.address==='N66')?.isPlus,true);

const normalizeClass=v=>String(v||'').toUpperCase().replace(/\s+/g,' ').trim();
const v7={normalizeClass,roleTrack(){return{track:'kns',role:'KNS',label:'KNS'}}};
const event={
  id:'group',sheet:'21T9',day:2,session:'Chiều',period:4,locationKey:'TRAN QUOC TOAN|PHU HOA CU',
  classId:normalizeClass('KHỐI 4 (4 LỚP) - TIẾT 4'),track:'kns',ga:1,
  addresses:['J66','K66','L66','M66'],atoms:[],participants:[{code:'M.LINH'}]
};
const history={events:[event],byAddress:new Map(event.addresses.map(a=>[`21T9!${a}`,event]))};
const historyParser={scanPlusGroupedAssignments(){return plus}};
G.attachPlusToHistory(history,[ws],historyParser,v7,{roleResolver(){return'KNS'}});
assert.equal(history.byAddress.get('21T9!N66'),event,'DƯƠNG+ must point to the same GA event as the grouped class');
assert.ok(event.addresses.includes('N66'));
assert.ok(event.participants.some(p=>p.code==='DƯƠNG'),'GA event should show DƯƠNG as a grouped + participant');
assert.equal(event.ga,1,'attaching plus participant must not advance or change the group GA');

console.log('OK grouped plus report: DƯƠNG+ inherits KHỐI 4 Tiết 4 for report/GA while main total stays unchanged');
