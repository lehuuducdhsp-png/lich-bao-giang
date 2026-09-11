'use strict';
// Run with ExcelJS 4.4.0 and jsdom 26.1.0 (see validate-assist-p.yml).
const fs=require('fs'),assert=require('node:assert/strict');
const ExcelJS=require('exceljs'),{JSDOM}=require('jsdom');
const dom=new JSDOM(`<select id="year"><option>2026</option></select><select id="week"><option>14T09</option></select><select id="teacher"><option value="H.THANH">Hoài Thanh</option><option value="ĐỨC">Đức</option><option value="ONLY">Chỉ trợ</option></select><button id="export"></button><div id="caption"></div><div id="preview"></div><div id="previewCard"></div>`,{runScripts:'outside-only',url:'https://example.test',pretendToBeVisual:true});
const w=dom.window;w.HTMLElement.prototype.scrollIntoView=()=>{};w.ExcelJS=ExcelJS;w.Blob=Blob;w.saveAs=()=>{};
function load(file){w.eval(fs.readFileSync(file,'utf8')+'\n//# sourceURL='+file)}
const source=new ExcelJS.Workbook(),ws=source.addWorksheet('14T09');
ws.getCell(4,2).value='TIẾT';
for(let day=2;day<=8;day++)for(let k=0;k<10;k++){
 const c=5+(day-2)*10+k;ws.getCell(2,c).value='THỨ '+day;if(day===8)ws.getCell(2,c).value='CHỦ NHẬT';
 ws.getCell(3,c).value=k<5?'Sáng':'Chiều';ws.getCell(4,c).value=k%5+1;
}
ws.getCell(5,2).value='TRƯỜNG TIỂU HỌC VỸ DẠ';
for(let c=5;c<20;c++){ws.getCell(5,c).value='4/'+(c-4);ws.getCell(6,c).value='H.THANH'}
ws.getCell(5,20).value='4/16';ws.getCell(6,20).value='H.THANH+';
ws.mergeCells(9,50,9,51);ws.getCell(9,50).value='1/1';
ws.mergeCells(9,52,9,53);ws.getCell(9,52).value='1/3';
ws.getCell(10,50).value='H.THANHP';ws.getCell(10,52).value='H.THANHP';
ws.getCell(12,45).value='5/1';ws.getCell(13,45).value='ĐỨC';
ws.getCell(15,65).value='2/2';ws.getCell(16,65).value='ONLYP';
ws.getCell(40,2).value='TÊN GV';
for(const [r,name,code] of [[41,'Hoài Thanh','H.THANH'],[42,'Lê Hữu Đức','ĐỨC'],[43,'Chỉ trợ','ONLY']]){
 ws.getCell(r,2).value=name;ws.getCell(r,3).value={formula:`COUNTIF(E5:BV30,"${code}")`,result:0};
}
w.wb=source;w.startDate=()=>new w.Date(2026,8,14,12);w.weekNo=()=>2;
w.getSchoolYearConfig=()=>({startDate:'2026-09-07',endDate:'2027-05-31'});
load('assist-p-data-v1.js');load('tkb-parser-v2.js');load('tkb-atomic-teaching-v1.js');
const analyze=w.analyzeNow,parser=w.LBGTkbParserV2;
load('report-pay-rules-v1.js');load('report-atomic-display-v1.js');load('report-engine-v4.js');load('sheets-sync-owner-v4.js');load('report-logo-data-v1.js');load('report-export-hotfix-v3.js');
function choose(code){w.document.getElementById('teacher').value=code;w.result=analyze(ws,code,code);return w.result}
function report(){return w.LBGSheetsOwnerV4.buildReport('copy')}
async function main(){
 // Let DOMContentLoaded install the report renderer (without loading external scripts).
 await new Promise(r=>setTimeout(r,20));
 const a=choose('H.THANH');assert.equal(a.total,15);
 const original=JSON.stringify(a.entries),api=w.LBGAssistP;
 const assist=api.scanAssist(ws,'H.THANH');assert.equal(assist.length,2);
 assert.deepEqual(Array.from(assist,e=>[e.day,e.session,e.period,e.className]),[[6,'Chiều',1,'1/1'],[6,'Chiều',3,'1/3']]);
 assert.equal(parser.teachers(ws).some(t=>t.code==='ONLY'),true,'P-only teachers must be selectable');
 assert.equal(api.scanAssist(ws,'H.THANH',{allowedDays:[2,3]}).length,0);
 for(let n=0;n<20;n++)w.LBGReportEngineV4.renderPreview(a);
 assert.equal(w.analyzeNow,analyze,'P must never replace analyzeNow');assert.equal(JSON.stringify(a.entries),original,'main entries must remain unchanged');
 assert.equal(a.total,15);assert.match(w.document.getElementById('caption').textContent,/16 tiết.*2 Trợ/);
 const rows=w.document.querySelectorAll('#preview table tr');
 assert.match(rows[8].children[5].textContent,/1\/1 \(P\)/);assert.match(rows[10].children[5].textContent,/1\/3 \(P\)/);
 const payload=report();assert.equal(payload.mainPeriods,15);assert.equal(payload.plusPeriods,1);assert.equal(payload.total,16);assert.equal(payload.assistPeriods,2);assert.equal(payload.entries.length,18);
 assert.equal(payload.entries.filter(e=>e.isAssist&&e.payEligible===false&&e.assignmentType==='assist').length,2);
 assert.deepEqual(Array.from(payload.entries.filter(e=>e.isAssist),e=>[e.day,e.session,e.period,e.className]),[[6,'Chiều',1,'1/1 (P)'],[6,'Chiều',3,'1/3 (P)']]);
 // Multi-teacher workbook + real serialize/read/brand/serialize/read cycle.
 const out=new ExcelJS.Workbook();w.LBGReportEngineV4.addReportSheet(out,a,'H.THANH - Hoài Thanh');
 const b=choose('ĐỨC');assert.equal(report().assistPeriods,0);w.LBGReportEngineV4.addReportSheet(out,b,'ĐỨC - Lê Hữu Đức');
 const only=choose('ONLY');assert.equal(only.total,0);assert.equal(report().assistPeriods,1);assert.equal(report().total,0);assert.equal(report().endDate,'2026-09-20');
 w.LBGReportEngineV4.addReportSheet(out,only,'ONLY - Chỉ trợ');
 const expected=out.worksheets.map(s=>({name:s.name,grid:Array.from({length:17},(_,r)=>Array.from({length:s.columnCount},(_,c)=>s.getCell(r+1,c+1).text))}));
 const fixed=await w.LBGReportExportHotfixV3.fixWorkbookBlob(new Blob([await out.xlsx.writeBuffer()]));
 const read=new ExcelJS.Workbook();await read.xlsx.load(await fixed.arrayBuffer());
 for(const before of expected){const after=read.getWorksheet(before.name);assert(after);before.grid.forEach((row,r)=>row.forEach((text,c)=>assert.equal(after.getCell(r+4,c+1).text,text,`${before.name} row ${r+4} col ${c+1}: values/blank cells must survive branding`)))}
 const first=read.getWorksheet('H.THANH - Hoài Thanh');assert.equal(first.getCell('G15').text,'1/1 (P)');assert.equal(first.getCell('G17').text,'1/3 (P)');assert.match(first.getCell('A20').text,/15 tiết \+ 1 tiết = 16 tiết.*Trợ \(P\): 2/);
 assert.equal(first.getCell('G16').text,'');assert.equal(read.getWorksheet('ĐỨC - Lê Hữu Đức').getCell('G15').text,'');
 // Reloading and branding twice is idempotent.
 const again=await w.LBGReportExportHotfixV3.fixWorkbookBlob(fixed),againBook=new ExcelJS.Workbook();await againBook.xlsx.load(await again.arrayBuffer());assert.equal(againBook.worksheets[0].getCell('G15').text,'1/1 (P)');
 // Monthly rendering and real XLSX export use the same automatic assist count.
 choose('H.THANH');w.document.body.appendChild(Object.assign(w.document.createElement('main'),{className:'shell'}));
 load('monthly-calendar-v3.js');await new Promise(r=>setTimeout(r,20));
 w.document.getElementById('month2Select').value='9';w.document.getElementById('month2Teacher').value='H.THANH';w.document.getElementById('month2Build').click();
 assert.equal(w.document.getElementById('month2Main').textContent,'16');assert.equal(w.document.getElementById('month2Assist').textContent,'2');
 let monthBlob;w.saveAs=b=>{monthBlob=b};w.document.getElementById('month2Export').click();
 for(let n=0;n<100&&!monthBlob;n++)await new Promise(r=>setTimeout(r,10));
 assert(monthBlob,'monthly export must complete');const monthBook=new ExcelJS.Workbook();await monthBook.xlsx.load(await monthBlob.arrayBuffer());
 let monthlyText='';monthBook.worksheets[0].eachRow(r=>r.eachCell(c=>{monthlyText+=c.text+'\n'}));assert.match(monthlyText,/2 Trợ \(P\)/);assert.match(monthlyText,/16 TIẾT.*2 TIẾT TRỢ GIẢNG/);
 // Explicit teaching period on a combined class must override only its own source slot.
 const custom=source.addWorksheet('21T09');custom.model={...JSON.parse(JSON.stringify(ws.model)),name:'21T09'};
 custom.getCell(9,50).value='KHỐI 1 (3 LỚP) - TIẾT 4';
 const shifted=api.scanAssist(custom,'H.THANH');assert.equal(shifted[1].teachingPeriod,4);
 // A merged teacher-code cell represents one source, not two inherited copies.
 const merged=source.addWorksheet('28T09');merged.model={...JSON.parse(JSON.stringify(ws.model)),name:'28T09'};merged.mergeCells(10,50,10,51);
 assert.equal(api.scanAssist(merged,'H.THANH').length,2);
 choose('H.THANH');w.document.getElementById('teacher').value='ĐỨC';assert.throws(report,/Kiểm tra/,'stale report must not be sent under a new teacher');
 if(process.env.LBG_TEST_ARTIFACT_DIR){fs.mkdirSync(process.env.LBG_TEST_ARTIFACT_DIR,{recursive:true});fs.writeFileSync(process.env.LBG_TEST_ARTIFACT_DIR+'/assist-p-verified.xlsx',Buffer.from(await fixed.arrayBuffer()));fs.writeFileSync(process.env.LBG_TEST_ARTIFACT_DIR+'/assist-p-payload.json',JSON.stringify(payload,null,2));}
 console.log('PASS P integration: real parser → Web → XLSX round-trip → Sheets payload; 15+1=16, P=2; no phantom 16; multi-teacher, P-only Sunday, merged cells, repeated render, stale selection.');
}
function close(){w.dispatchEvent(new w.Event('beforeunload'));w.LBGMonthlyV3?.destroy();dom.window.close()}
main().then(close,e=>{console.error(e);close();process.exitCode=1});
