'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('index-core.html','utf8');
const cloud=fs.readFileSync('cloud-sync-v1.js','utf8');
const dashboard=fs.readFileSync('ga-progress-dashboard-v1.js','utf8');
const cross=fs.readFileSync('ga-suggestion-cross-version-v1.js','utf8');
const warmup=fs.readFileSync('startup-warmup-v2.js','utf8');
assert.match(core,/async function listVersionMeta\(\)/);
assert.match(core,/async function getVersionRecord\(id\)/);
assert.match(core,/window\.LBGGetVersionRecord=getVersionRecord/);
assert.doesNotMatch(core,/versions=\(await all\(\)\)/,'không lấy mọi file Excel khi khởi động');
assert.match(cloud,/existing=typeof getVersionRecord/);
assert.match(dashboard,/root\.LBGGetVersionRecord\?\.\(item\.id\)/);
assert.match(cross,/root\.LBGGetVersionRecord\?\.\(v\.id\)/);
const block=(warmup.match(/const critical=\[([\s\S]*?)\];/)||[])[1]||'';
assert.equal((block.match(/\.js\?v=/g)||[]).length,2);
const match=core.match(/<script>\s*(const \$=[\s\S]*?)<\/script>/);
assert.ok(match,'inline TKB core must exist');
new vm.Script(match[1],{filename:'index-core-inline.js'});
async function smoke(){
 const records=[
  {id:'old',name:'TKB cu.xlsx',created:'2026-11-01T00:00:00Z',size:'91 KB',buffer:new ArrayBuffer(7)},
  {id:'new',name:'TKB moi.xlsx',created:'2026-11-27T00:00:00Z',size:'92 KB',buffer:new ArrayBuffer(13)},
  {id:'backup',name:'TKB du phong.xlsx',created:'2026-11-12T00:00:00Z',size:'93 KB',buffer:new ArrayBuffer(9)}
 ];
 const stats={cursor:0,get:[],getAll:0,parsed:0};
 const db={close(){},transaction(){return{objectStore(){return{
  getAll(){stats.getAll++;throw Error('getAll on startup')},
  get(id){stats.get.push(id);const req={};queueMicrotask(()=>{req.result=records.find(x=>x.id===id)||null;req.onsuccess?.()});return req},
  openCursor(){const req={};let i=0;function step(){req.result=i<records.length?{
   get value(){stats.cursor++;return records[i]},
   continue(){i++;queueMicrotask(step)}
  }:null;req.onsuccess?.()}queueMicrotask(step);return req}
 }}}}};
 const indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess?.());return req}};
 const elements=new Map();
 function el(id){
  if(!elements.has(id))elements.set(id,{id,textContent:'',innerHTML:'',value:'',options:[],disabled:false,hidden:false,
   style:{},dataset:{},classList:{add(){},remove(){}},addEventListener(){}});
  return elements.get(id);
 }
 const document={getElementById:el,createElement:id=>({...el(id),appendChild(){}})};
 class Book{constructor(){this.worksheets=[{name:'23T11'}];this.xlsx={load:async()=>{stats.parsed++}}}}
 const excel={Workbook:Book},localStorage={lbgActive:'new',lbgYear:'2026',removeItem(k){delete this[k]}};
 const window={ExcelJS:excel};
 const sandbox=vm.createContext({document,window,indexedDB,ExcelJS:excel,localStorage,Date,Math,
  setTimeout,clearTimeout,console,alert(){throw Error('unexpected alert')},confirm(){return false}});
 vm.runInContext(match[1],sandbox,{filename:'index-core-inline.js'});
 for(let i=0;i<30&&stats.parsed===0;i++)await new Promise(r=>setTimeout(r,25));
 if(!stats.get.length)console.log('DEBUG_LAZY_LOAD',JSON.stringify({status:el('status').textContent,versions:vm.runInContext('versions.map(v=>v.id)',sandbox),active:vm.runInContext('activeId',sandbox),cursor:stats.cursor,parsed:stats.parsed}));
 assert.equal(stats.getAll,0,'startup must avoid getAll');
 assert.equal(stats.cursor,3,'cursor gets metadata');
 assert.deepEqual(stats.get,['new'],'only current version loaded');
 assert.equal(stats.parsed,1,'decompresses one workbook');
 assert.equal(vm.runInContext('versions.length',sandbox),3);
 assert.equal(vm.runInContext('versions.every(v=>!Object.prototype.hasOwnProperty.call(v,"buffer"))',sandbox),true);
 assert.equal(vm.runInContext('wb.worksheets[0].name',sandbox),'23T11');
 assert.equal(localStorage.lbgActive,'new');
 assert.match(el('status').textContent,/Đã tải lịch/);
 assert.match(el('week').innerHTML,/23T11/);
 assert.equal((await window.LBGGetVersionRecord('old')).id,'old','old version must remain accessible');
 assert.equal(records.length,3,'no deletes');
}
smoke().then(()=>console.log('PASS 3 TKB metadata, 1 workbook parse, no data loss, cloud & GA lazy reads'))
 .catch(e=>{console.error(e);process.exitCode=1});
