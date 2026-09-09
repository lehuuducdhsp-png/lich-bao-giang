const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('sheets-sync-owner-v3.js','utf8');
const assignments=[];
function add(address,row,col,period,classRaw,groupNote='',session='Sáng'){
  assignments.push({code:'ĐỨC',sourceCode:'ĐỨC',address,row,col,period,day:2,session,schoolName:'THỦY PHƯƠNG',school:'THỦY PHƯƠNG',locationKey:'TP|',className:classRaw.replace(/\s*-\s*TIẾT\s*\d+\s*$/i,''),classRaw,groupNote});
}
add('E176',176,5,1,'4/1 + 4/2 + 4/3 + 4/4 - TIẾT 4','TIẾT 4');
add('F176',176,6,2,'4/1 + 4/2 + 4/3 + 4/4 - TIẾT 4','TIẾT 4');
add('J172',172,10,3,'4/6','', 'Chiều');
for(let i=0;i<12;i++)add(`X${i+20}`,20+i,24,((i%5)+1),`LỚP ${i+1}`);
assert.equal(assignments.length,15);
const cells=new Map([['172|11',{text:'ĐỨC+',address:'K172'}]]);
const ws={rowCount:200,getCell:(r,c)=>cells.get(`${r}|${c}`)||{text:'',address:`C${r}`}};
const parser={
  scanAssignments:()=>assignments,
  timetableColumns:()=>[11],
  buildHeader:()=>({headerRow:4}),
  colInfoFor:()=>({day:2,session:'Chiều',period:3}),
  locationAt:()=>({schoolName:'THỦY PHƯƠNG',school:'THỦY PHƯƠNG',locationKey:'TP|'})
};
const elements={week:{value:'7T9'},year:{value:'2026'}};
const context={console,setTimeout,clearTimeout,setInterval,clearInterval,fetch:async()=>({ok:true,status:200,json:async()=>({ok:true})}),window:{LBGTkbParserV2:parser,getSchoolYearConfig:()=>({startDate:'2026-09-07',endDate:'2027-05-31'})},document:{readyState:'loading',addEventListener:()=>{},getElementById:id=>elements[id]||null},wb:{getWorksheet:()=>ws},result:{sheet:'7T9',code:'ĐỨC',teacherName:'Lê Hữu Đức',entries:[{}],week:1,start:new Date(2026,8,7,12),gaValues:{}}};
context.global=context;vm.createContext(context);vm.runInContext(code,context);
const api=context.window.LBGSheetsOwnerV3;assert(api,'missing V3 API');
const body=api.buildReport('copy');
assert.equal(body.mainPeriods,15,'must preserve all 15 black-code source cells');
assert.equal(body.plusPeriods,1,'must detect one ĐỨC+ source cell');
assert.equal(body.total,16,'pay/report total must be 16');
assert.equal(body.entries.length,16,'payload must contain all 16 atomic source units');
const combined=body.entries.filter(x=>/4\/1/.test(x.classRaw));
assert.equal(combined.length,2,'two atomic cells for combined class must remain two pay units');
assert.deepEqual(combined.map(x=>x.period),[4,4],'both source slots must point to actual teaching period 4');
assert.equal(body.entries.filter(x=>x.sourceCode==='ĐỨC+').length,1);
assert.match(code,/functions\/v1\/google-sheets-owner/,'V3 must call Edge directly');
assert.doesNotMatch(code,/functions\.invoke\(/,'V3 must bypass legacy invoke wrappers');
console.log('OK Sheets owner V3: 15 main + 1 plus = 16 atomic units, TIẾT 4 preserved');
