'use strict';
(function(){
  const VERSION='20260911.1';
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
  function normalizeEntry(e,sourceCode,address,sourcePeriodOverride,type='main'){
    const sourcePeriod=Number(sourcePeriodOverride??e?.slotPeriod??e?.period)||null;
    const teachingPeriod=explicitPeriod(e)||Number(e?.teachingPeriod)||sourcePeriod||null;
    const original=fullClass(e),assist=type==='assist';
    const shown=assist&&original&&!/\(P\)\s*$/i.test(original)?`${original} (P)`:original;
    return{
      day:Number(e?.day),session:txt(e?.session),period:teachingPeriod,teachingPeriod,
      slotPeriod:sourcePeriod,sourcePeriod,
      school:fullLocation(e),schoolName:txt(e?.schoolName||e?.school),siteName:txt(e?.siteName),siteDisplay:txt(e?.siteDisplay||e?.siteName),locationKey:txt(e?.locationKey),
      className:shown,classRaw:shown,classBase:txt(e?.className)||original,classType:txt(e?.classType),classCount:Number(e?.classCount)||1,groupNote:txt(e?.groupNote),
      sourceCode:txt(sourceCode||e?.sourceCode||e?.code),sourceCell:txt(address||e?.address),address:txt(address||e?.address),sourceCells:[txt(address||e?.address)].filter(Boolean),
      assignmentType:type,isAssist:assist,payEligible:!assist
    };
  }
  function classAt(ws,row,col,base){
    const parser=window.LBGTkbParserV2;if(!parser)return{className:'',classRaw:'',groupNote:''};
    const floor=Math.max(Number(parser.buildHeader?.(ws)?.headerRow||4)+1,row-8),stop=new Set([base,base+'P',base+'+']);let fallback='';
    for(let r=row-1;r>=floor;r--){
      let value='';
      try{value=cellText(ws.getCell(r,col)).replace(/\s+/g,' ').trim()}catch{}
      if(!value)continue;const upper=value.toUpperCase();
      if(stop.has(upper)||parser.resolveTeacherCode?.(ws,upper)){if(fallback)break;continue}
      if(/^(SÁNG|CHIỀU|TIẾT|THỨ|TÊN GV|TÊN GIÁO VIÊN|BUỔI|TRƯỜNG|PHÂN HIỆU|ĐIỂM TRƯỜNG|CƠ SỞ)$/i.test(value)||/^(GHI\s*CHÚ|CÓ\s*DI\s*CHUYỂN|DI\s*CHUYỂN\b)/i.test(value))continue;
      const meta=parser.classMeta?.(value);if(meta&&meta.classType!=='unknown')return{className:meta.classDisplay,classRaw:meta.classRaw,classType:meta.classType,classCount:meta.classCount,groupNote:meta.groupNote};
      if(!fallback&&value.length<=100)fallback=value;
    }
    const meta=parser.classMeta?.(fallback);return meta?{className:meta.classDisplay,classRaw:meta.classRaw,classType:meta.classType,classCount:meta.classCount,groupNote:meta.groupNote}:{className:fallback,classRaw:fallback,groupNote:''};
  }
  function plusAssignments(ws,base,allAssignments){
    const parser=window.LBGTkbParserV2,cols=parser?.timetableColumns?.(ws)||[],header=parser?.buildHeader?.(ws),start=Math.max(1,Number(header?.headerRow||4)+1),target=`${base}+`,out=[];
    if(!cols.length)return out;
    for(const col of cols){
      const info=parser?.colInfoFor?.(ws,col);if(!info)continue;
      for(let row=start;row<=Number(ws.rowCount||0);row++){
        const cell=ws.getCell(row,col);if(cellText(cell).toUpperCase()!==target)continue;
        const sameRow=(allAssignments||[]).filter(e=>Number(e.row)===row);
        const candidate=[...sameRow].sort((a,b)=>Math.abs(Number(a.col)-col)-Math.abs(Number(b.col)-col))[0]||null;
        if(candidate){out.push(normalizeEntry(candidate,target,cell.address,info.period,'plus'));continue}
        const loc=parser?.locationAt?.(ws,row)||{},cm=classAt(ws,row,col,base);
        out.push(normalizeEntry({...info,...loc,...cm,row,col},target,cell.address,info.period,'plus'));
      }
    }
    return out;
  }
  function assistAssignments(ws,base){
    const api=window.LBGAssistP;
    if(typeof api?.scanAssist==='function'){
      try{return(api.scanAssist(ws,base)||[]).map(e=>normalizeEntry(e,`${base}P`,e.address,e.period,'assist'))}catch(error){console.warn('Google Sheets: scanAssist P thất bại, dùng bộ quét dự phòng.',error)}
    }
    const parser=window.LBGTkbParserV2,cols=parser?.timetableColumns?.(ws)||[],start=Math.max(1,Number(parser?.buildHeader?.(ws)?.headerRow||4)+1),target=`${base}P`,out=[];
    for(const col of cols){
      const info=parser?.colInfoFor?.(ws,col);if(!info)continue;
      for(let row=start;row<=Number(ws.rowCount||0);row++){
        const cell=ws.getCell(row,col);if(cellText(cell).toUpperCase()!==target)continue;
        const loc=parser?.locationAt?.(ws,row)||{},cm=classAt(ws,row,col,base);
        out.push(normalizeEntry({...info,...loc,...cm,row,col},target,cell.address,info.period,'assist'));
      }
    }
    return out;
  }
  function atomicEntries(a){
    const ws=worksheet(),parser=window.LBGTkbParserV2,base=txt(a?.code).toUpperCase();
    if(!ws||!parser?.scanAssignments||!base)return(a?.entries||[]).map((e,i)=>({...normalizeEntry(e,e?.sourceCode||base,e?.address,undefined,'main'),index:i+1}));
    const all=parser.scanAssignments(ws)||[];
    const main=all.filter(e=>txt(e?.code).toUpperCase()===base).map(e=>normalizeEntry(e,base,e.address,undefined,'main'));
    const plus=plusAssignments(ws,base,all),assist=assistAssignments(ws,base);
    const entries=[...main,...plus,...assist];
    entries.sort((x,y)=>Number(x.day)-Number(y.day)||((txt(x.session)==='Sáng'?0:1)-(txt(y.session)==='Sáng'?0:1))||Number(x.teachingPeriod)-Number(y.teachingPeriod)||txt(x.sourceCell).localeCompare(txt(y.sourceCell)));
    return entries.map((e,i)=>({...e,index:i+1}));
  }
  function yearConfig(){
    const yearStart=Number(q('year')?.value)||new Date().getFullYear();
    const cfg=typeof window.getSchoolYearConfig==='function'?window.getSchoolYearConfig():{};
    return{yearStart,startDate:txt(cfg?.startDate),endDate:txt(cfg?.endDate)};
  }
  function tabName(a){
    const d=a?.start instanceof Date&&!Number.isNaN(a.start.getTime())?a.start:null;
    return d?`TUẦN ${pad2(a.week)}_${d.getDate()}T${d.getMonth()+1}`:`TUẦN ${pad2(a?.week)}`;
  }
  function gaValues(a){
    const src=a?.gaValues&&typeof a.gaValues==='object'?a.gaValues:{},out={};
    for(const[k,v]of Object.entries(src)){const n=Number(v);if(typeof k==='string'&&Number.isSafeInteger(n)&&n>=0)out[k]=String(n)}return out;
  }
  function payText(main,plus,total){return plus?`${main} chính + ${plus} cộng = ${total} tiết`:`${main} chính = ${total} tiết`}
  function buildReport(mode){
    const a=current();if(!a?.entries?.length)throw new Error('Hãy nhấn Kiểm tra trước khi lưu Google Sheets.');
    const entries=atomicEntries(a),base=txt(a.code).toUpperCase();
    const main=entries.filter(e=>txt(e.sourceCode).toUpperCase()===base).length;
    const plus=entries.filter(e=>txt(e.sourceCode).toUpperCase()===`${base}+`).length;
    const assist=entries.filter(e=>e.isAssist||txt(e.sourceCode).toUpperCase()===`${base}P`).length;
    const total=main+plus,cfg=yearConfig(),start=a.start instanceof Date?new Date(a.start):null,end=start?new Date(start.getTime()+5*864e5):null,destinationSheet=tabName(a),ga=gaValues(a);
    const totalText=(plus?`TỔNG: ${main} tiết + ${plus} tiết = ${total} tiết`:`TỔNG: ${main} tiết`)+(assist?` • ${assist} Trợ (P)`:``);
    return{
      requestId:`lbg-edge-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      week:a.week,weekNo:a.week,weekNumber:a.week,weekText:pad2(a.week),weekLabel:txt(a.sheet),sourceSheet:txt(a.sheet),sheetName:destinationSheet,destinationSheet,tabName:destinationSheet,
      schoolYear:`${cfg.yearStart}-${cfg.yearStart+1}`,schoolYearStart:cfg.yearStart,schoolYearStartDate:cfg.startDate,schoolYearEndDate:cfg.endDate,yearStart:cfg.yearStart,yearEnd:cfg.yearStart+1,
      teacherName:txt(a.teacherName),teacherCode:txt(a.code),startDate:iso(start),endDate:iso(end),mode,saveMode:mode,existingAction:mode,
      mainPeriods:main,plusPeriods:plus,assistPeriods:assist,assistCount:assist,total,totalPeriods:total,payPeriods:total,totalWithAssist:total+assist,
      atomicCount:entries.length,payAtomicCount:main+plus,totalText,assistText:`${assist} Trợ (P)`,
      gaValues:ga,lessonPlanCounts:ga,entries,schedule:entries.map(e=>({...e})),
      reportSemanticsVersion:VERSION,entriesAreAtomicAssignments:true,entriesAreTeachingEvents:false,periodSemantics:'teachingPeriod',sourceCountSemantics:'atomicTeacherCodeCellsIncludingPlusAndAssistP',assistSemantics:'suffix-P-is-assist-not-pay-period'
    };
  }
  async function invokeOwner(report){
    const cfg=window.LBG_SUPABASE_CONFIG,token=txt(auth?.session?.access_token);
    if(!cfg?.url||!cfg?.publishableKey)throw new Error('Thiếu cấu hình kết nối Google Sheets.');
    if(!token)throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    const res=await fetch(`${String(cfg.url).replace(/\/$/,'')}/functions/v1/google-sheets-owner`,{
      method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(report)
    });
    let data={};try{data=await res.json()}catch{throw new Error(`Máy chủ Google Sheets phản hồi không hợp lệ (HTTP ${res.status}).`)}
    if(!res.ok||data?.error)throw new Error(data?.error||`Google Sheets phản hồi HTTP ${res.status}.`);return data;
  }
  function closeChoice(){const o=q('sheetSaveOverlayV4');if(o)o.style.display='none'}
  function ensureChoice(){
    let o=q('sheetSaveOverlayV4');if(o)return o;
    o=document.createElement('div');o.id='sheetSaveOverlayV4';o.style.cssText='display:none;position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.24);place-items:center;padding:18px';
    o.innerHTML=`<div role="dialog" style="width:min(520px,100%);background:#fff;border:1px solid #e7d5c8;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.24);padding:22px;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif"><h3 style="margin:0 0 7px;color:#5b3828">Lưu vào Google Sheets</h3><p id="sheetSavePromptV4" style="margin:0 0 18px;color:#806b61"></p><div style="display:grid;gap:10px"><button id="sheetSaveOverwriteV4" type="button" style="border:0;border-radius:12px;padding:12px;background:#0f766e;color:#fff;font-weight:800">Ghi đè tab tuần hiện có</button><button id="sheetSaveCopyV4" type="button" style="border:1px solid #cbd5e1;border-radius:12px;padding:12px;background:#fff;font-weight:800">Tạo BẢN 2 nếu tuần đã tồn tại</button><button id="sheetSaveCancelV4" type="button" style="border:0;border-radius:12px;padding:10px;background:#f1f5f9;color:#64748b;font-weight:700">Hủy</button></div></div>`;
    document.body.appendChild(o);q('sheetSaveCancelV4').onclick=closeChoice;q('sheetSaveOverwriteV4').onclick=()=>save('overwrite');q('sheetSaveCopyV4').onclick=()=>save('copy');o.addEventListener('click',e=>{if(e.target===o)closeChoice()});return o;
  }
  function choose(){
    try{const r=buildReport('overwrite'),o=ensureChoice(),p=q('sheetSavePromptV4');if(p)p.innerHTML=`${r.schoolYear} • ${r.sheetName} • ${r.teacherName}<br><b>${payText(r.mainPeriods,r.plusPeriods,r.total)}</b>${r.assistPeriods?`<br><b style="color:#9a5b36">${r.assistPeriods} Trợ (P)</b>`:''}<br>${r.atomicCount} ô mã nguồn sẽ được gửi`;o.style.display='grid'}catch(e){alert(e.message||String(e))}
  }
  async function save(mode){
    if(pending)return;closeChoice();let report;try{report=buildReport(mode)}catch(e){alert(e.message||String(e));return}
    const b=q('saveSheets');pending=true;if(b){b.disabled=true;b.textContent=`Đang lưu ${report.total} chính${report.assistPeriods?` + ${report.assistPeriods} trợ`:''}…`}
    try{
      const data=await invokeOwner(report);
      if(typeof toast==='function')toast(`Đã gửi ${payText(report.mainPeriods,report.plusPeriods,report.total)}${report.assistPeriods?` • ${report.assistPeriods} Trợ (P)`:''} vào Google Sheets.`);
      if(data?.url&&confirm('Đã lưu Google Sheets. Mở file ngay?'))window.open(data.url,'_blank','noopener');
    }catch(e){console.error(e);alert('Không lưu được Google Sheets: '+(e?.message||String(e)))}finally{pending=false;if(b){b.disabled=false;b.textContent='☁ Lưu vào Google Sheets'}}
  }
  function ensureButton(){
    if(!auth?.isOwner?.()){q('saveSheets')?.remove();return}
    const ex=q('export');if(!ex)return;let b=q('saveSheets');if(!b){b=document.createElement('button');b.id='saveSheets';b.type='button';b.className='btn';b.style.cssText='background:#2563eb;color:#fff;white-space:nowrap';b.textContent='☁ Lưu vào Google Sheets';ex.insertAdjacentElement('afterend',b);b.onclick=choose}
    const a=current();b.disabled=pending||!a?.entries?.length||Boolean(ex.disabled)
  }
  function install(a){auth=a||window.LBGAuth;if(!auth)return false;if(installed)return true;installed=true;q('sheetSaveOverlayV3')?.remove();ensureButton();const b=q('saveSheets');if(b)b.onclick=choose;document.addEventListener('click',e=>{if(e.target?.closest?.('#analyze'))setTimeout(ensureButton,150)},true);document.addEventListener('change',e=>{if(['week','teacher'].includes(e.target?.id))setTimeout(ensureButton,80)},true);return true}
  function boot(){const a=window.LBGAuth;if(!a){setTimeout(boot,80);return}a.onReady?.(x=>install(x));if(a.profile&&!a.profile.must_change_password)install(a)}
  window.LBGSheetsOwnerV4={version:VERSION,explicitPeriod,atomicEntries,assistAssignments,buildReport,invokeOwner,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
