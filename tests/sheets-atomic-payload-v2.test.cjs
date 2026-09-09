const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('sheets-atomic-payload-v2.js','utf8');
const assignments=[];
const add=(address,row,col,period,classRaw,groupNote='')=>assignments.push({code:'ĐỨC',sourceCode:'ĐỨC',address,row,col,period,day:2,session:'Sáng',schoolName:'THỦY PHƯƠNG',locationKey:'TP|',className:classRaw.replace(/\s*-\s*TIẾT\s*\d+\s*$/i,''),classRaw,groupNote});
add('L172',172,12,2,'KHỐI 3 (3 LỚP) - TIẾT 4','TIẾT 4');
add('E176',176,5,1,'4/1 + 4/2 + 4/3 + 4/4 - TIẾT 4','TIẾT 4');
add('F176',176,6,2,'4/1 + 4/2 + 4/3 + 4/4 - TIẾT 4','TIẾT 4');
for(let i=0;i<12;i++)add(`X${i+1}`,200+i,20+i,((i%5)+1),`LỚP ${i+1}`);
assert.equal(assignments.length,15);
const ws={rowCount:240,getCell:(row,col)=>({text:row===172&&col===11?'ĐỨC+':'',value:row===172&&col===11?'ĐỨC+':'',address:row===172&&col===11?'K172':`C${row}_${col}`})};
const parser={
  scanAssignments:(sheet,only)=>only==='ĐỨC'?assignments:assignments,
  timetableColumns:()=>[5,6,11,12],
  buildHeader:()=>({headerRow:4}),
  colInfoFor:(sheet,col)=>({day:2,session:'Sáng',period:col===11?1:col===12?2:col===5?1:2})
};
const client={functions:{invoke:(name,options)=>Promise.resolve({name,body:options.body})}};
const context={console,setTimeout,clearTimeout,setInterval,clearInterval,window:{LBGAuth:{client,onReady:()=>{}},LBGTkbParserV2:parser},document:{readyState:'complete',addEventListener:()=>{},getElementById:()=>({value:'7T9'})},wb:{getWorksheet:()=>ws}};
context.global=context;vm.createContext(context);vm.runInContext(code,context);
const api=context.window.LBGSheetsAtomicPayloadV2;assert(api,'missing API');
const body=api.normalizeBody({teacherCode:'ĐỨC',sourceSheet:'7T9',entries:[]});
assert.equal(body.entries.length,16);
assert.equal(body.mainPeriods,15);
assert.equal(body.plusPeriods,1);
assert.equal(body.total,16);
const pair=body.entries.filter(x=>x.sourceCells.includes('E176')||x.sourceCells.includes('F176'));
assert.equal(pair.length,2);assert(pair.every(x=>x.period===4));assert(pair.every(x=>x.sourceCell===''));
const plus=body.entries.find(x=>x.sourceCode==='ĐỨC+');assert(plus);assert.equal(plus.sourceCells[0],'K172');assert.equal(plus.period,4);assert.equal(plus.sourceCell,'');
console.log('OK sheets atomic payload: 15 main + 1 plus = 16, duplicate source slots target TIẾT 4');
