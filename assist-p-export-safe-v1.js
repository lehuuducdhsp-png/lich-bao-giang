'use strict';
(function(){
  const VERSION='20260912.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const assistantCode=code=>`${txt(code).toUpperCase()}P`;
  const assistLabel=count=>`${Math.max(0,Number(count)||0)} Trợ (P)`;
  const classWithP=e=>{
    const base=txt(e?.className||e?.classRaw)||'Lớp chưa xác định';
    const note=txt(e?.groupNote);
    const core=note&&!base.toUpperCase().includes(note.toUpperCase())?`${base} - ${note}`:base;
    return /\(P\)\s*$/i.test(core)?core:`${core} (P)`;
  };
  function augmentSheetsPayload(base,assistEntries){
    const assist=[...(assistEntries||[])];
    const entries=[...(base?.entries||[]),...assist];
    const total=Number(base?.total)||0;
    return{
      ...(base||{}),
      assistPeriods:assist.length,
      assistCount:assist.length,
      assistText:assistLabel(assist.length),
      totalWithAssist:total+assist.length,
      totalPeriods:total,
      payPeriods:total,
      atomicCount:entries.length,
      payAtomicCount:(base?.entries||[]).length,
      entries,
      schedule:entries.map(e=>({...e})),
      totalText:`${txt(base?.totalText)}${assist.length?` • ${assistLabel(assist.length)}`:''}`.trim(),
      assistSemantics:'suffix-P-is-assist-not-pay-period',
      sourceCountSemantics:'atomicTeacherCodeCellsIncludingAssistP'
    };
  }

  if(typeof module!=='undefined'&&module.exports){
    module.exports={VERSION,assistantCode,assistLabel,classWithP,augmentSheetsPayload};
    return;
  }

  const q=id=>document.getElementById(id);
  const book=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const currentWs=()=>{const b=book(),name=txt(q('week')?.value);return b&&name?b.getWorksheet(name):null};
  const previewApi=()=>window.LBGAssistPPreviewSafe||null;
  const engine=()=>window.LBGReportEngineV4||null;
  const rules=()=>window.LBGReportPayRulesV1||null;
  const sheetsOwner=()=>window.LBGSheetsOwnerV3||null;
  const scan=(ws,code)=>previewApi()?.scanAssist?.(ws,code)||[];
  const reportPeriod=e=>Number(rules()?.reportPeriod?.(e)??e?.teachingPeriod??e?.period)||0;
  const safeFile=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'GIAO_VIEN';
  let exportBusy=false,sheetBusy=false;

  function locationText(e){
    return[txt(e?.schoolName||e?.school),txt(e?.siteDisplay||e?.siteName)].filter(Boolean).join('\n');
  }
  function normalizeAssistForSheets(e,baseCode){
    const period=reportPeriod(e),label=classWithP(e),source=assistantCode(baseCode);
    return{
      day:Number(e?.day),session:txt(e?.session),period,teachingPeriod:period,
      slotPeriod:Number(e?.period)||period,sourcePeriod:Number(e?.period)||period,
      school:locationText(e),schoolName:txt(e?.schoolName||e?.school),siteName:txt(e?.siteName),siteDisplay:txt(e?.siteDisplay||e?.siteName),locationKey:txt(e?.locationKey),
      className:label,classRaw:label,classBase:txt(e?.className||e?.classRaw),classType:txt(e?.classType),classCount:Number(e?.classCount)||1,groupNote:txt(e?.groupNote),
      sourceCode:source,sourceCell:txt(e?.address),address:txt(e?.address),sourceCells:[txt(e?.address)].filter(Boolean),
      assignmentType:'assist',isAssist:true,payEligible:false
    };
  }
  function buildSheetsReport(mode){
    const owner=sheetsOwner();if(!owner?.buildReport)throw new Error('Cầu nối Google Sheets chưa sẵn sàng.');
    const base=owner.buildReport(mode),ws=currentWs(),assist=scan(ws,base.teacherCode).map(e=>normalizeAssistForSheets(e,base.teacherCode));
    return augmentSheetsPayload(base,assist);
  }

  function closeSheetDialog(){q('lbgAssistPSheetOverlay')?.remove()}
  function openSheetDialog(){
    let report;try{report=buildSheetsReport('overwrite')}catch(error){alert(error.message||String(error));return}
    if(!report.assistCount)return;
    closeSheetDialog();
    const overlay=document.createElement('div');overlay.id='lbgAssistPSheetOverlay';overlay.style.cssText='position:fixed;inset:0;z-index:200000;background:rgba(15,23,42,.30);display:grid;place-items:center;padding:18px';
    overlay.innerHTML=`<div role="dialog" style="width:min(520px,100%);background:#fff;border:1px solid #fed7aa;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.24);padding:22px;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif"><h3 style="margin:0 0 8px;color:#5b3828">Lưu Lịch Báo giảng vào Google Sheets</h3><p style="margin:0 0 18px;color:#806b61">${report.schoolYear} • ${report.sheetName} • ${report.teacherName}<br><b>${report.mainPeriods} chính${report.plusPeriods?` + ${report.plusPeriods} cộng`:''} = ${report.total} tiết</b><br><b style="color:#9a5b36">${assistLabel(report.assistCount)}</b> — tách riêng, không tính lương.</p><div style="display:grid;gap:10px"><button data-mode="overwrite" style="border:0;border-radius:12px;padding:12px;background:#0f766e;color:#fff;font-weight:800">Ghi đè tab tuần hiện có</button><button data-mode="copy" style="border:1px solid #cbd5e1;border-radius:12px;padding:12px;background:#fff;font-weight:800">Tạo BẢN 2 nếu tuần đã tồn tại</button><button data-cancel style="border:0;border-radius:12px;padding:10px;background:#f1f5f9;color:#64748b;font-weight:700">Hủy</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',event=>{
      if(event.target===overlay||event.target.closest('[data-cancel]')){closeSheetDialog();return}
      const mode=event.target.closest('[data-mode]')?.dataset?.mode;if(mode)saveSheets(mode);
    });
  }
  async function saveSheets(mode){
    if(sheetBusy)return;let report;try{report=buildSheetsReport(mode)}catch(error){alert(error.message||String(error));return}
    const owner=sheetsOwner();if(!owner?.invokeOwner){alert('Cầu nối Google Sheets chưa sẵn sàng.');return}
    sheetBusy=true;closeSheetDialog();const button=q('saveSheets'),old=button?.textContent;if(button){button.disabled=true;button.textContent=`Đang lưu ${report.total} chính + ${report.assistCount} trợ…`}
    try{
      const data=await owner.invokeOwner(report);
      if(typeof toast==='function')toast(`Đã gửi ${report.total} tiết tính lương • ${assistLabel(report.assistCount)} vào Google Sheets.`);
      if(data?.url&&confirm('Đã lưu Google Sheets có Trợ (P). Mở file ngay?'))window.open(data.url,'_blank','noopener');
    }catch(error){console.error(error);alert('Không lưu được Google Sheets: '+(error?.message||String(error)))}
    finally{sheetBusy=false;if(button){button.disabled=false;button.textContent=old||'☁ Lưu vào Google Sheets'}}
  }

  function teacherList(ws){try{return typeof window.teachers==='function'?(window.teachers(ws)||[]):[]}catch{return[]}}
  function selectedTeachers(ws){
    const map=new Map(teacherList(ws).map(t=>[txt(t?.code).toUpperCase(),{code:txt(t?.code),name:txt(t?.name||t?.teacherName||t?.code)}]));
    const checked=[...document.querySelectorAll('#multiTeacherList input[type="checkbox"]:checked')].map(x=>txt(x.value).toUpperCase()).filter(Boolean);
    const codes=checked.length?checked:[txt(q('teacher')?.value).toUpperCase()].filter(Boolean);
    return codes.map(code=>map.get(code)||{code,name:code});
  }
  function selectedReportData(){
    const ws=currentWs(),eng=engine();if(!ws||!eng)throw new Error('Hãy chọn tuần trước khi xuất.');
    const list=selectedTeachers(ws);if(!list.length)throw new Error('Hãy chọn ít nhất một giáo viên.');
    return list.map(t=>{
      const a=analyzeNow(ws,t.code,t.name),assist=scan(ws,t.code);
      const total=Number(eng.reportTotals?.(a)?.total)||0;
      return{a,assist,total};
    }).filter(x=>x.total>0||x.assist.length>0);
  }
  function richTextOf(cell){
    const value=cell?.value;
    if(value&&typeof value==='object'&&Array.isArray(value.richText))return value.richText.map(x=>({text:String(x?.text??''),font:{...(x?.font||{})}}));
    const text=txt(cell?.text||value);return text?[{text,font:{name:'Times New Roman',size:12,color:{argb:'FF000000'}}}]:[];
  }
  function appendAssistText(cell,label){
    if(!cell||!label)return;
    const existing=txt(cell.text);if(existing.includes(label))return;
    const rich=richTextOf(cell);rich.push({text:(rich.length?' & ':'')+label,font:{name:'Times New Roman',size:12,bold:true,color:{argb:'FF9A5B36'}}});cell.value={richText:rich};
  }
  function appendLocation(cell,e){
    const loc=locationText(e);if(!loc)return;const existing=txt(cell?.text||cell?.value);
    const school=txt(e?.schoolName||e?.school);if(school&&existing.toUpperCase().includes(school.toUpperCase()))return;
    cell.value=(existing?existing+'\n/\n':'')+loc+'\n(GA )';
    cell.alignment={...(cell.alignment||{}),horizontal:'center',vertical:'middle',wrapText:true,shrinkToFit:false};
  }
  function patchAssistSheet(ws,a,assist){
    const eng=engine(),days=eng?.daysForReport?.(a)||[2,3,4,5,6,7];
    for(const e of assist){
      const di=days.map(Number).indexOf(Number(e.day)),p=reportPeriod(e);if(di<0||p<1||p>5)continue;
      const col=3+di,headRow=txt(e.session)==='Sáng'?5:11,row=headRow+p;
      appendAssistText(ws.getCell(row,col),classWithP(e));appendLocation(ws.getCell(headRow,col),e);
      ws.getRow(row).height=Math.max(Number(ws.getRow(row).height)||0,38);ws.getRow(headRow).height=Math.max(Number(ws.getRow(headRow).height)||0,96);
    }
    const footer=ws.getCell('A17'),base=txt(footer.text||footer.value);footer.value=`${base}${base?'\n':''}${assistLabel(assist.length)}`;footer.alignment={...(footer.alignment||{}),horizontal:'center',vertical:'middle',wrapText:true,shrinkToFit:false};ws.getRow(17).height=Math.max(Number(ws.getRow(17).height)||0,48);
  }
  function loadScript(url,name){return new Promise((resolve,reject)=>{if(window[name])return resolve(window[name]);const s=document.createElement('script');s.src=url;s.onload=()=>resolve(window[name]);s.onerror=()=>reject(new Error('Không tải được thư viện ZIP.'));document.head.appendChild(s)})}
  async function exportExcelWithAssist(){
    if(exportBusy)return;const button=q('export');if(!button)return;const old=button.textContent;exportBusy=true;button.disabled=true;button.textContent='Đang tạo Excel có P…';
    try{
      if(!window.ExcelJS||!window.saveAs)throw new Error('Thư viện xuất Excel chưa sẵn sàng.');
      const data=selectedReportData();if(!data.length)throw new Error('Không có tiết để xuất.');
      const eng=engine(),mode=document.querySelector('input[name="multiExportMode"]:checked')?.value||'workbook';
      const add=(bookOut,item,name)=>{const ws=eng.addReportSheet(bookOut,item.a,name);patchAssistSheet(ws,item.a,item.assist);return ws};
      if(data.length===1){
        const out=new ExcelJS.Workbook();add(out,data[0],'TUẦN '+(data[0].a.week||''));
        saveAs(new Blob([await out.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LICH_BAO_GIANG_${safeFile(data[0].a.teacherName)}_${safeFile(data[0].a.sheet)}.xlsx`);
      }else if(mode==='zip'){
        const JSZipCtor=window.JSZip||await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','JSZip'),zip=new JSZipCtor();
        for(const item of data){const out=new ExcelJS.Workbook();add(out,item,'TUẦN '+(item.a.week||''));zip.file(`LICH_BAO_GIANG_${safeFile(item.a.teacherName)}_${safeFile(item.a.sheet)}.xlsx`,await out.xlsx.writeBuffer())}
        saveAs(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),`LICH_BAO_GIANG_${safeFile(data[0].a.sheet)}_${data.length}_GIAO_VIEN.zip`);
      }else{
        const out=new ExcelJS.Workbook();data.forEach(item=>add(out,item,`${item.a.code} - ${item.a.teacherName}`));
        saveAs(new Blob([await out.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LICH_BAO_GIANG_${safeFile(data[0].a.sheet)}_${data.length}_GIAO_VIEN.xlsx`);
      }
      if(typeof toast==='function')toast(`Đã xuất Excel có Trợ (P) cho ${data.length} giáo viên.`);
    }catch(error){console.error(error);alert('Không xuất được Excel có P: '+(error?.message||String(error)))}
    finally{exportBusy=false;button.disabled=false;button.textContent=old||'⇩ Xuất Excel'}
  }

  function hasAssistForCurrent(){const ws=currentWs(),code=txt(q('teacher')?.value);return Boolean(ws&&code&&scan(ws,code).length)}
  function hasAssistForExport(){try{return selectedReportData().some(x=>x.assist.length>0)}catch{return false}}
  function onWindowClick(event){
    const button=event.target?.closest?.('button');if(!button)return;
    if(button.id==='saveSheets'&&hasAssistForCurrent()){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openSheetDialog();return;
    }
    if(button.id==='export'&&hasAssistForExport()){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();exportExcelWithAssist();
    }
  }
  function updateBanner(){
    const box=q('lbgAssistPTestBanner');if(!box)return;
    box.innerHTML='<b>🧪 PR TEST — TRỢ GIẢNG (P), GIAI ĐOẠN XUẤT FILE</b><br>Web + Bảng kê tháng giữ nguyên. Nếu giáo viên có P, Excel Lịch Báo giảng và Google Sheets sẽ nhận thêm lớp <b>(P)</b>, đồng thời P vẫn tách khỏi tổng tiết chính/tính lương.';
  }
  function install(){window.addEventListener('click',onWindowClick,true);setTimeout(updateBanner,150);setTimeout(updateBanner,600);window.LBGAssistPExportSafe={version:VERSION,assistantCode,assistLabel,classWithP,augmentSheetsPayload,buildSheetsReport,patchAssistSheet}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();