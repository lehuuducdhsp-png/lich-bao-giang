const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('sheets-sync-owner-v2.js','utf8');
const noop=()=>{};
const context={
  console,setTimeout,clearTimeout,MutationObserver:function(){this.observe=noop;this.disconnect=noop;},
  window:{
    LBG_SUPABASE_CONFIG:{enabled:true},
    LBGAuth:{onReady:noop,onLogout:noop}
  },
  document:{getElementById:()=>null,createElement:()=>({style:{},addEventListener:noop}),body:{appendChild:noop}},
  result:null
};
context.global=context;vm.createContext(context);vm.runInContext(code,context);
const api=context.window.LBGSHeetsOwnerTest;assert(api,'missing owner bridge test API');
const entries=[
 {day:2,session:'Sáng',period:1,schoolName:'THỦY PHƯƠNG',locationKey:'TP|',className:'4/1+4/2+4/3+4/4',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',groupNote:'TIẾT 4',address:'E176'},
 {day:2,session:'Sáng',period:2,schoolName:'THỦY PHƯƠNG',locationKey:'TP|',className:'4/1+4/2+4/3+4/4',classRaw:'4/1+4/2+4/3+4/4 - TIẾT 4',groupNote:'TIẾT 4',address:'F176'},
 {day:3,session:'Sáng',period:4,schoolName:'THỦY DƯƠNG',locationKey:'TD|',className:'KHỐI 3 (4 LỚP)',classRaw:'KHỐI 3 (4 LỚP) - TIẾT 4',groupNote:'TIẾT 4',address:'R183'},
 {day:3,session:'Sáng',period:5,schoolName:'THỦY DƯƠNG',locationKey:'TD|',className:'KHỐI 3 (4 LỚP)',classRaw:'KHỐI 3 (4 LỚP) - TIẾT 4',groupNote:'TIẾT 4',address:'S183'}
];
const out=api.teachingEvents(entries);
assert.equal(out.length,2,'two duplicate source pairs should become two teaching events');
assert.equal(out[0].period,4);assert.equal(out[1].period,4);
assert.deepEqual(Array.from(out[0].sourceCells),['E176','F176']);
assert.deepEqual(Array.from(out[1].sourceCells),['R183','S183']);
assert.equal(out[0].address,'');assert.equal(out[1].address,'');
console.log('OK Sheets owner teaching events');
