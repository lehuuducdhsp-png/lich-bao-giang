const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('sheets-modern-sync-v1.js','utf8');
const context={console,setTimeout,clearTimeout,window:{LBGAuth:null,LBGReportEngineV4:null},document:{readyState:'complete',addEventListener:()=>{},getElementById:()=>null},result:null};context.global=context;vm.createContext(context);vm.runInContext(code,context);
const api=context.window.LBGSheetsModernSyncV1;assert(api,'missing API');
const entries=[
 {day:2,session:'Sáng',period:1,schoolName:'THỦY PHƯƠNG',locationKey:'TP|',className:'4/1 + 4/2 + 4/3 + 4/4',classRaw:'4/1 + 4/2 + 4/3 + 4/4 - TIẾT 4',groupNote:'TIẾT 4',sourceCell:'E176',address:'E176'},
 {day:2,session:'Sáng',period:2,schoolName:'THỦY PHƯƠNG',locationKey:'TP|',className:'4/1 + 4/2 + 4/3 + 4/4',classRaw:'4/1 + 4/2 + 4/3 + 4/4 - TIẾT 4',groupNote:'TIẾT 4',sourceCell:'F176',address:'F176'},
 {day:3,session:'Chiều',period:2,schoolName:'VỸ DẠ',locationKey:'VD|',classRaw:'2/5',sourceCell:'BA44',address:'BA44'}
];
const out=api.normalizeEntries(entries);
assert.equal(out.length,2,'explicit - TIẾT 4 duplicates must collapse to one teaching event');
assert.equal(out[0].period,4);assert.equal(out[0].teachingPeriod,4);assert.equal(out[0].slotPeriod,1);
assert.deepEqual(Array.from(out[0].sourceCells),['E176','F176']);
assert.equal(out[0].sourceCell,'','grouped teaching event must not expose a legacy source cell that can override period');
assert.equal(out[0].address,'','grouped teaching event must not expose a legacy address that can override period');
assert.equal(out[1].period,2);assert.equal(out[1].sourceCell,'BA44');
console.log('OK sheets modern sync');
