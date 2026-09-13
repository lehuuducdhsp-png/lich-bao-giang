'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGAssistPExcelExportParityV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260914.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const assistantCode=code=>`${txt(code).toUpperCase()}P`;
  const assistLabel=count=>`${Math.max(0,Number(count)||0)} Trợ (P)`;

  function classWithP(e){
    try{
      const formatted=root.LBGAssistPPreviewSafe?.formatClassText?.(e);
      if(txt(formatted))return txt(formatted);
    }catch{}
    const base=txt(e?.className||e?.classRaw)||'Lớp không xác định';
    const note=txt(e?.groupNote);
    const core=note&&!base.toUpperCase().includes(note.toUpperCase())?`${base} - ${note}`:base;
    return /\(P\)\s*$/i.test(core)?core:`${core} (P)`;
  }

  function detectReportLayoutRows(rows){
    let headerRow=0,footerRow=0;
    const list=Array.isArray(rows)?rows:[];
    for(let i=0;i<list.length;i++){
      const row=Array.isArray(list[i])?list[i]:[],a=fold(row[0]),b=fold(row[1]);
      if(!headerRow&&a==='BUOI'&&b==='TIET')headerRow=i+1;
      if(!footerRow&&/^TONG\s*:/.test(a))footerRow=i+1;
    }
    if(!headerRow)return null;
    return{
      headerRow,
      morningHeadRow:headerRow+1,
      morningFirstPeriodRow:headerRow+2,
      afternoonHeadRow:headerRow+7,
      afternoonFirstPeriodRow:headerRow+8,
      footerRow:footerRow||headerRow+13
    };
  }

  function cellText(cell){
    try{
      const t=txt(cell?.text);if(t)return t;
      const v=cell?.value;if(v==null)return'';
      if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return txt(v);
      if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));
      if(v?.result!=null)return txt(v.result);
      if(typeof v?.text==='string')return txt(v.text);
    }catch{}
    return'';
  }

  function detectWorksheetLayout(ws){
    if(!ws?.getCell)return null;
    const max=Math.min(Math.max(Number(ws.rowCount)||0,25),80),rows=[];
    for(let r=1;r<=max;r++)rows.push([cellText(ws.getCell(r,1)),cellText(ws.getCell(r,2))]);
    return detectReportLayoutRows(rows);
  }

  function richTextOf(cell){
    const value=cell?.value;
    if(value&&typeof value==='object'&&Array.isArray(value.richText))return value.richText.map(x=>({text:String(x?.text??''),font:{...(x?.font||{})}}));
    const text=cellText(cell);return text?[{text,font:{name:'Times New Roman',size:12,color:{argb:'FF000000'}}}]:[];
  }

  function appendAssistText(cell,label){
    if(!cell||!label)return;
    const existing=cellText(cell);if(existing.includes(label))return;
    const rich=richTextOf(cell);
    rich.push({text:(rich.length?' & ':'')+label,font:{name:'Times New Roman',size:12,bold:true,color:{argb:'FF9A5B36'}}});
    cell.value={richText:rich};
    cell.alignment={...(cell.alignment||{}),horizontal:'center',vertical:'middle',wrapText:true,shrinkToFit:false};
  }

  function locationText(e){return[txt(e?.schoolName||e?.school),txt(e?.siteDisplay||e?.siteName)].filter(Boolean).join('\n')}
  function appendLocation(cell,e){
    const loc=locationText(e);if(!cell||!loc)return;
    const existing=cellText(cell),school=txt(e?.schoolName||e?.school);
    if(school&&fold(existing).includes(fold(school)))return;
    cell.value=(existing?existing+'\n/\n':'')+loc+'\n(GA )';
    cell.alignment={...(cell.alignment||{}),horizontal:'center',vertical:'middle',wrapText:true,shrinkToFit:false};
  }

  function targetRow(layout,session,period){
    const p=Number(period);if(!layout||p<1||p>5)return 0;
    return txt(session)==='Sáng'?layout.morningHeadRow+p:txt(session)==='Chiều'?layout.afternoonHeadRow+p:0;
  }

  function patchAssistSheet(ws,a,assist,opts={}){
    const layout=detectWorksheetLayout(ws);if(!layout)return{patched:0,reason:'layout-not-found'};
    const days=(opts.days||[]).map(Number),periodOf=typeof opts.reportPeriod==='function'?opts.reportPeriod:e=>Number(e?.teachingPeriod??e?.period)||0;
    let patched=0;
    for(const e of assist||[]){
      const di=days.indexOf(Number(e?.day)),p=Number(periodOf(e));if(di<0||p<1||p>5)continue;
      const col=3+di,headRow=txt(e?.session)==='Sáng'?layout.morningHeadRow:txt(e?.session)==='Chiều'?layout.afternoonHeadRow:0,row=targetRow(layout,e?.session,p);
      if(!headRow||!row)continue;
      appendAssistText(ws.getCell(row,col),classWithP(e));
      appendLocation(ws.getCell(headRow,col),e);
      ws.getRow(row).height=Math.max(Number(ws.getRow(row).height)||0,38);
      ws.getRow(headRow).height=Math.max(Number(ws.getRow(headRow).height)||0,96);
      patched++;
    }
    if((assist||[]).length){
      const footer=ws.getCell(layout.footerRow,1),base=cellText(footer),label=assistLabel((assist||[]).length);
      if(!base.includes(label))footer.value=`${base}${base?'\n':''}${label}`;
      footer.alignment={...(footer.alignment||{}),horizontal:'center',vertical:'middle',wrapText:true,shrinkToFit:false};
      ws.getRow(layout.footerRow).height=Math.max(Number(ws.getRow(layout.footerRow).height)||0,52);
    }
    return{patched,layout};
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,assistantCode,assistLabel,classWithP,detectReportLayoutRows,targetRow};
  }

  const q=id=>root.document?.getElementById(id);
  const book=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const currentWs=()=>{const b=book(),name=txt(q('week')?.value);return b&&name?b.getWorksheet(name):null};
  const engine=()=>root.LBGReportEngineV4||null;
  const previewApi=()=>root.LBGAssistPPreviewSafe||null;
  const rules=()=>root.LBGReportPayRulesV1||null;
  const scan=(ws,code)=>previewApi()?.scanAssist?.(ws,code)||[];
  const reportPeriod=e=>Number(rules()?.reportPeriod?.(e)??e?.teachingPeriod??e?.period)||0;
  const safeFile=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'GIAO_VIEN';
  let selectedCodes=[],exportBusy=false;

  function teacherList(ws){try{return typeof root.teachers==='function'?(root.teachers(ws)||[]):[]}catch{return[]}}
  function selectedTeachers(ws){
    const map=new Map(teacherList(ws).map(t=>[txt(t?.code).toUpperCase(),{code:txt(t?.code),name:txt(t?.name||t?.teacherName||t?.code)}]));
    const checked=[...root.document.querySelectorAll('#multiTeacherList input[type="checkbox"]:checked')].map(x=>txt(x.value).toUpperCase()).filter(Boolean);
    const source=selectedCodes.length?selectedCodes:(checked.length?checked:[txt(q('teacher')?.value).toUpperCase()].filter(Boolean));
    const seen=new Set(),out=[];
    for(const raw of source){const code=txt(raw).toUpperCase();if(!code||seen.has(code))continue;seen.add(code);out.push(map.get(code)||{code,name:code})}
    return out;
  }
  function hasAssistForExport(){
    const ws=currentWs();if(!ws)return false;
    return selectedTeachers(ws).some(t=>scan(ws,t.code).length>0);
  }
  function selectedReportData(){
    const ws=currentWs(),eng=engine();if(!ws||!eng)throw new Error('Hãy chọn tuần trước khi xuất.');
    const list=selectedTeachers(ws);if(!list.length)throw new Error('Hãy chọn ít nhất một giáo viên.');
    return list.map(t=>{
      const a=typeof analyzeNow==='function'?analyzeNow(ws,t.code,t.name):root.analyzeNow?.(ws,t.code,t.name),assist=scan(ws,t.code);
      const total=Number(eng.reportTotals?.(a)?.total)||0;
      return{a,assist,total};
    }).filter(x=>x.a&&(x.total>0||x.assist.length>0));
  }
  function loadScript(url,name){return new Promise((resolve,reject)=>{if(root[name])return resolve(root[name]);const s=root.document.createElement('script');s.src=url;s.onload=()=>resolve(root[name]);s.onerror=()=>reject(new Error('Không tải được thư viện ZIP.'));root.document.head.appendChild(s)})}

  async function exportExcelParity(){
    if(exportBusy)return;const button=q('export');if(!button)return;
    const old=button.textContent;exportBusy=true;button.disabled=true;button.textContent='Đang tạo Excel giống bản web…';
    try{
      if(!root.ExcelJS||!root.saveAs)throw new Error('Thư viện xuất Excel chưa sẵn sàng.');
      const data=selectedReportData();if(!data.length)throw new Error('Không có tiết để xuất.');
      const eng=engine(),mode=root.document.querySelector('input[name="multiExportMode"]:checked')?.value||'workbook';
      const add=(bookOut,item,name)=>{
        const outWs=eng.addReportSheet(bookOut,item.a,name),days=eng.daysForReport?.(item.a)||[2,3,4,5,6,7];
        const patched=patchAssistSheet(outWs,item.a,item.assist,{days,reportPeriod});
        if(item.assist.length&&!patched.patched)console.warn('Excel P: không đặt được dòng trợ giảng vào bố cục xuất.',item.a?.teacherName,patched);
        return outWs;
      };
      if(data.length===1){
        const out=new root.ExcelJS.Workbook();add(out,data[0],'TUẦN '+(data[0].a.week||''));
        root.saveAs(new Blob([await out.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LICH_BAO_GIANG_${safeFile(data[0].a.teacherName)}_${safeFile(data[0].a.sheet)}.xlsx`);
      }else if(mode==='zip'){
        const JSZipCtor=root.JSZip||await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','JSZip'),zip=new JSZipCtor();
        for(const item of data){const out=new root.ExcelJS.Workbook();add(out,item,'TUẦN '+(item.a.week||''));zip.file(`LICH_BAO_GIANG_${safeFile(item.a.teacherName)}_${safeFile(item.a.sheet)}.xlsx`,await out.xlsx.writeBuffer())}
        root.saveAs(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),`LICH_BAO_GIANG_${safeFile(data[0].a.sheet)}_${data.length}_GIAO_VIEN.zip`);
      }else{
        const out=new root.ExcelJS.Workbook();data.forEach(item=>add(out,item,`${item.a.code} - ${item.a.teacherName}`));
        root.saveAs(new Blob([await out.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LICH_BAO_GIANG_${safeFile(data[0].a.sheet)}_${data.length}_GIAO_VIEN.xlsx`);
      }
      root.toast?.(`Đã xuất Excel khớp bản web cho ${data.length} giáo viên${data.some(x=>x.assist.length)?' (có Trợ P)':''}.`);
    }catch(error){console.error(error);root.alert?.('Không xuất được Excel: '+(error?.message||String(error)))}
    finally{exportBusy=false;button.disabled=false;button.textContent=old||'⇩ Xuất Excel'}
  }

  function onWindowClick(event){
    const button=event.target?.closest?.('button');if(button?.id!=='export'||!hasAssistForExport())return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();exportExcelParity();
  }
  function install(){
    root.document.addEventListener('lbg-multi-selection-change',event=>{selectedCodes=Array.isArray(event.detail?.codes)?event.detail.codes.map(txt).filter(Boolean):[]});
    root.document.addEventListener('change',event=>{if(event.target?.id==='week')selectedCodes=[]});
    root.addEventListener('click',onWindowClick,true);
    return true;
  }
  return{VERSION,assistantCode,assistLabel,classWithP,detectReportLayoutRows,targetRow,patchAssistSheet,install};
});
