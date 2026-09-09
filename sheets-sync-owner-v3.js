'use strict';
(function(){
  const VERSION='20260909.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const pad2=v=>String(Number(v)||v||'').padStart(2,'0');
  const iso=d=>d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';
  let auth=null,pending=false,installed=false;

  function current(){try{return typeof result!=='undefined'?result:null}catch{return null}}
  function workbook(){try{return typeof wb!=='undefined'?wb:null}catch{return null}}
  function worksheet(){const a=current(),book=workbook(),name=txt(a?.sheet||q('week')?.value);return book&&name?book.getWorksheet(name):null}
  function cellText(cell){
    try{
      const t=txt(cell?.text);if(t)return t;
      const v=cell?.value;if(v==null)return'';
      if(typeof v==='string'||typeof v==='number')return txt(v);
      if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));
      if(v?.result!=null)return txt(v.result);return'';
    }catch{return''}
  }
  function explicitPeriod(e){
    for(const value of[e?.groupNote,e?.classRaw,e?.className]){const m=txt(value).match(/(?:^|[-–—\s])TI[ẾE]T\s*([1-5])\s*$/i);if(m)return Number(m[1])}
    return null;
  }
  function fullClass(e){
    const raw=txt(e?.classRaw);if(raw)return raw;
    const base=txt(e?.className),note=txt(e?.groupNote);return note?`${base} - ${note}`:base;
  }
  function fullLocation(e){
    const label=txt(e?.locationLabel);if(label)return label;
    const school=txt(e?.schoolName||e?.school),site=txt(e?.siteDisplay||e?.siteName);return site?[school,site].filter(Boolean).join('\n'):school;
  }
  function normalizeEntry(e,sourceCode,address,sourcePeriodOverride){
    const sourcePeriod=Number(sourcePeriodOverride??e?.slotPeriod??e?.period)||null;
    const teachingPeriod=explicitPeriod(e)||Number(e?.teachingPeriod)||sourcePeriod||null;
    const raw=fullClass(e);
    return{
      day:Number(e?.day),session:txt(e?.session),period:teachingPeriod,teachingPeriod,
      slotPeriod:sourcePeriod,sourcePeriod,
      school:fullLocation(e),schoolName:txt(e?.schoolName||e?.school),siteName:txt(e?.siteName),siteDisplay:txt(e?.siteDisplay||e?.siteName),locationKey:txt(e?.locationKey),
      className:raw,classRaw:raw,classBase:txt(e?.className),classType:txt(e?.classType),classCount:Number(e?.classCount)||1,groupNote:txt(e?.groupNote),
      sourceCode:txt(sourceCode||e?.sourceCode||e?.code),sourceCell:txt(address||e?.address),address:txt(address||e?.address),sourceCells:[txt(address||e?.address)].filter(Boolean)
    };
  }
  function plusAssignments(ws,base,allAssignments){
    const parser=window.LBGTkbParserV2,cols=parser?.timetableColumns?.(ws)||[],header=parser?.buildHeader?.(ws),start=Math.max(1,Number(header?.headerRow||4)+1),target=`${base}+`,out=[];
    if(!cols.length)return out;
    for(const col of cols){
      const info=parser?.colInfoFor?.(ws,col);if(!info)continue;
      for(let row=start;row<=Number(ws.rowCount||0);row++){
        const cell=ws.getCell(row,col);if(cellText(cell).toUpperCase()!==target)continue;
        const sameRow=(allAssignments||[]).filter(e=>Number(e.row)===row);
        const candidate=sameRow.sort((a,b)=>Math.abs(Number(a.col)-col)-Math.abs(Number(b.col)-col))[0]||null;
        if(candidate){out.push(normalizeEntry(candidate,target,cell.address,info.period));continue}
        const loc=parser?.locationAt?.(ws,row)||{};
        out.push(normalizeEntry({...info,...loc,row,col,className:'',classRaw:'',groupNote:''},target,cell.address,info.period));
      }
    }
    return out;
  }
  function atomicEntries(a){
    const ws=worksheet(),parser=window.LBGTkbParserV2,base=txt(a?.code).toUpperCase();
    if(!ws||!parser?.scanAssignments||!base)return(a?.entries||[]).map((e,i)=>({...normalizeEntry(e,e?.sourceCode||base,e?.address),index:i+1}));
    const all=parser.scanAssignments(ws)||[],main=all.filter(e=>txt(e?.code).toUpperCase()===base).map(e=>normalizeEntry(e,base,e.address));
    const plus=plusAssignments(ws,base,all);
    return[...main,...plus].map((e,i)=>({...e,index:i+1}));
  }
  function yearConfig(){
    const yearStart=Number(q('year')?.value)||new Date().getFullYear();
    const cfg=typeof window.getSchoolYearConfig==='function'?window.getSchoolYearConfig():{};
    return{yearStart,startDate:txt(cfg?.startDate),endDate:txt(cfg?.endDate)};
  }
  function tabName(a,cfg){
    const d=a?.start instanceof Date&&!Number.isNaN(a.start.getTime())?a.start:null;
    return d?`TUẦN ${pad2(a.week)}_${d.getDate()}T${d.getMonth()+1}`:`TUẦN ${pad2(a?.week)}`;
  }
  function gaValues(a){
    const src=a?.gaValues&&typeof a.gaValues==='object'?a.gaValues:{},out={};
    for(const[k,v]of Object.entries(src)){const n=Number(v);if(typeof k==='string'&&Number.isSafeInteger(n)&&n>=0)out[k]=String(n)}return out;
  }
  function buildReport(mode){
    const a=current();if(!a?.entries?.length)throw new Error('Hãy nhấn Kiểm tra trước khi lưu Google Sheets.');
    const entries=atomicEntries(a),base=txt(a.code).toUpperCase(),main=entries.filter(e=>txt(e.sourceCode).toUpperCase()===base).length,plus=entries.filter(e=>txt(e.sourceCode).toUpperCase()===`${base}+`).length,total=main+plus,cfg=yearConfig(),start=a.start instanceof Date?new Date(a.start):null,end=start?new Date(start.getTime()+5*864e5):null,destinationSheet=tabName(a,cfg),ga=gaValues(a);
    return{
      requestId:`lbg-edge-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      week:a.week,weekNo:a.week,weekNumber:a.week,weekText:pad2(a.week),weekLabel:txt(a.sheet),sourceSheet:txt(a.sheet),sheetName:destinationSheet,destinationSheet,tabName:destinationSheet,
      schoolYear:`${cfg.yearStart}-${cfg.yearStart+1}`,schoolYearStart:cfg.yearStart,schoolYearStartDate:cfg.startDate,schoolYearEndDate:cfg.endDate,yearStart:cfg.yearStart,yearEnd:cfg.yearStart+1,
      teacherName:txt(a.teacherName),teacherCode:txt(a.code),startDate:iso(start),endDate:iso(end),mode,saveMode:mode,existingAction:mode,
      mainPeriods:main,plusPeriods:plus,total,totalPeriods:total,payPeriods:total,atomicCount:entries.length,totalText:plus?`TỔNG: ${main} tiết + ${plus} tiết = ${total} tiết`:`TỔNG: ${main} tiết`,
      gaValues:ga,lessonPlanCounts:ga,entries,schedule:entries.map(e=>({...e})),
      reportSemanticsVersion:VERSION,entriesAreAtomicAssignments:true,entriesAreTeachingEvents:false,periodSemantics:'teachingPeriod',sourceCountSemantics:'atomicTeacherCodeCells'
    };
  }
  function closeChoice(){const o=q('sheetSaveOverlayV3');if(o)o.style.display='none'}
  function ensureChoice(){
    let o=q('sheetSaveOverlayV3');if(o)return o;
    o=document.createElement('div');o.id='sheetSaveOverlayV3';o.style.cssText='display:none;position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.24);place-items:center;padding:18px';
    o.innerHTML=`<div role="dialog" style="width:min(500px,100%);background:#fff;border:1px solid #e7d5c8;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.24);padding:22px;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif"><h3 style="margin:0 0 7px;color:#5b3828">Lưu vào Google Sheets</h3><p id="sheetSavePromptV3" style="margin:0 0 18px;color:#806b61"></p><div style="display:grid;gap:10px"><button id="sheetSaveOverwriteV3" type="button" style="border:0;border-radius:12px;padding:12px;background:#0f766e;color:#fff;font-weight:800">Ghi đè tab tuần hiện có</button><button id="sheetSaveCopyV3" type="button" style="border:1px solid #cbd5e1;border-radius:12px;padding:12px;background:#fff;font-weight:800">Tạo BẢN 2 nếu tuần đã tồn tại</button><button id="sheetSaveCancelV3" type="button" style="border:0;border-radius:12px;padding:10px;background:#f1f5f9;color:#64748b;font-weight:700">Hủy</button></div></div>`;
    document.body.appendChild(o);q('sheetSaveCancelV3').onclick=closeChoice;q('sheetSaveOverwriteV3').onclick=()=>save('overwrite');q('sheetSaveCopyV3').onclick=()=>save('copy');o.addEventListener('click',e=>{if(e.target===o)closeChoice()});return o;
  }
  function choose(){
    try{const r=buildReport('overwrite'),o=ensureChoice(),p=q('sheetSavePromptV3');if(p)p.innerHTML=`${r.schoolYear} • ${r.sheetName} • ${r.teacherName}<br><b>${r.mainPeriods} chính${r.plusPeriods?` + ${r.plusPeriods} cộng`:''} = ${r.total} tiết</b> • ${r.entries.length} ô mã nguồn sẽ được gửi`;o.style.display='grid'}catch(e){alert(e.message||String(e))}
  }
  async function save(mode){
    if(pending)return;closeChoice();let report;try{report=buildReport(mode)}catch(e){alert(e.message||String(e));return}
    const b=q('saveSheets');pending=true;if(b){b.disabled=true;b.textContent=`Đang lưu ${report.total} tiết…`}
    try{
      const res=await auth.client.functions.invoke('google-sheets-owner',{body:report});if(res?.error)throw res.error;
      const data=res?.data||{};if(data?.error)throw new Error(data.error);
      if(typeof toast==='function')toast(`Đã gửi ${report.mainPeriods} chính${report.plusPeriods?` + ${report.plusPeriods} cộng`:''} = ${report.total} tiết vào Google Sheets.`);
      if(data?.url&&confirm('Đã lưu Google Sheets. Mở file ngay?'))window.open(data.url,'_blank','noopener');
    }catch(e){console.error(e);alert('Không lưu được Google Sheets: '+(e?.message||String(e)))}finally{pending=false;if(b){b.disabled=false;b.textContent='☁ Lưu vào Google Sheets'}}
  }
  function ensureButton(){
    if(!auth?.isOwner?.()){q('saveSheets')?.remove();return}
    const ex=q('export');if(!ex)return;let b=q('saveSheets');if(!b){b=document.createElement('button');b.id='saveSheets';b.type='button';b.className='btn';b.style.cssText='background:#2563eb;color:#fff;white-space:nowrap';b.textContent='☁ Lưu vào Google Sheets';ex.insertAdjacentElement('afterend',b);b.onclick=choose}
    const a=current();b.disabled=pending||!a?.entries?.length||Boolean(ex.disabled)
  }
  function install(a){auth=a||window.LBGAuth;if(!auth)return false;if(installed)return true;installed=true;ensureButton();document.addEventListener('click',e=>{if(e.target?.closest?.('#analyze'))setTimeout(ensureButton,150)},true);document.addEventListener('change',e=>{if(['week','teacher'].includes(e.target?.id))setTimeout(ensureButton,80)},true);return true}
  function boot(){const a=window.LBGAuth;if(!a){setTimeout(boot,80);return}a.onReady?.(x=>install(x));if(a.profile&&!a.profile.must_change_password)install(a)}
  window.LBGSheetsOwnerV3={version:VERSION,explicitPeriod,atomicEntries,buildReport,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
