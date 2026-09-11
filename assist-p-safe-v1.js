'use strict';
(function(){
  const VERSION='20260911.safe1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const pad=n=>String(Number(n)||0).padStart(2,'0');
  const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);x.setHours(12,0,0,0);return x};
  const mergeCache=new WeakMap();
  let baseAnalyze=null;
  let wrappedAnalyze=null;
  let exportBusy=false;
  let sheetBusy=false;

  function book(){try{return typeof wb!=='undefined'?wb:null}catch{return null}}
  function currentResult(){try{return typeof result!=='undefined'?result:null}catch{return null}}
  function currentWs(){const b=book(),name=txt(q('week')?.value);return b&&name?b.getWorksheet(name):null}
  function parser(){return window.LBGTkbParserV2||null}
  function engine(){return window.LBGReportEngineV4||null}
  function rules(){return window.LBGReportPayRulesV1||null}

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
  function lettersCol(s){let n=0;for(const ch of String(s||''))n=n*26+ch.charCodeAt(0)-64;return n}
  function mergeRanges(ws){
    if(mergeCache.has(ws))return mergeCache.get(ws);
    const out=[];
    for(const range of ws?.model?.merges||[]){
      const m=String(range).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if(m)out.push({c1:lettersCol(m[1]),r1:Number(m[2]),c2:lettersCol(m[3]),r2:Number(m[4])});
    }
    mergeCache.set(ws,out);return out;
  }
  function masterText(ws,row,col){
    for(const m of mergeRanges(ws))if(row>=m.r1&&row<=m.r2&&col>=m.c1&&col<=m.c2)return cellText(ws.getCell(m.r1,m.c1));
    return cellText(ws.getCell(row,col));
  }
  function explicitPeriod(meta,slot){
    const m=txt(meta?.groupNote||meta?.classRaw).match(/\bTI[ẾE]T\s*([1-5])\b/i);
    return m?Number(m[1]):Number(slot)||null;
  }
  function classAt(ws,row,col,base){
    const p=parser();if(!p)return{classRaw:'',classDisplay:'',classType:'unknown',classCount:1,groupNote:''};
    const header=Math.max(1,Number(p.buildHeader?.(ws)?.headerRow||4)+1);
    const floor=Math.max(header,row-10),target=txt(base).toUpperCase(),stop=new Set([target,target+'P',target+'+']);
    let fallback='';
    for(let r=row-1;r>=floor;r--){
      const value=txt(masterText(ws,r,col)).replace(/\s+/g,' ').trim();if(!value)continue;
      const upper=value.toUpperCase();
      if(stop.has(upper)||p.resolveTeacherCode?.(ws,upper)){if(fallback)break;continue}
      if(/^(SÁNG|CHIỀU|TIẾT|THỨ|TÊN GV|TÊN GIÁO VIÊN|BUỔI|TRƯỜNG|PHÂN HIỆU|ĐIỂM TRƯỜNG|CƠ SỞ)$/i.test(value))continue;
      if(/^(GHI\s*CHÚ|CÓ\s*DI\s*CHUYỂN|DI\s*CHUYỂN\b)/i.test(value))continue;
      const meta=p.classMeta?.(value);
      if(meta&&meta.classType!=='unknown')return meta;
      if(!fallback&&value.length<=100)fallback=value;
    }
    return p.classMeta?.(fallback)||{classRaw:fallback,classDisplay:fallback,classType:'unknown',classCount:1,groupNote:''};
  }
  function scanAssist(ws,teacherCode,options={}){
    const p=parser(),base=txt(teacherCode).toUpperCase();if(!ws||!p||!base)return[];
    const target=`${base}P`,allowed=new Set((options.allowedDays||[]).map(Number).filter(Number.isFinite));
    const out=[],start=Math.max(1,Number(p.buildHeader?.(ws)?.headerRow||4)+1);
    for(const col of p.timetableColumns?.(ws)||[]){
      const info=p.colInfoFor?.(ws,col);if(!info)continue;
      if(allowed.size&&!allowed.has(Number(info.day)))continue;
      for(let row=start;row<=Number(ws.rowCount||0);row++){
        const cell=ws.getCell(row,col);if(cellText(cell).toUpperCase()!==target)continue;
        const loc=p.locationAt?.(ws,row)||{},meta=classAt(ws,row,col,base),slot=Number(info.period)||null;
        const teachingPeriod=explicitPeriod(meta,slot);
        out.push({
          ...info,period:slot,slotPeriod:slot,teachingPeriod,
          school:txt(loc.schoolName),schoolName:txt(loc.schoolName),schoolNote:txt(loc.schoolNote),
          siteRaw:txt(loc.siteRaw),siteType:txt(loc.siteType),siteName:txt(loc.siteName),siteDisplay:txt(loc.siteDisplay),
          locationLabel:txt(loc.locationLabel),locationKey:txt(loc.locationKey),locationNotes:[...(loc.notes||loc.locationNotes||[])],
          className:txt(meta.classDisplay||meta.classRaw),classRaw:txt(meta.classRaw||meta.classDisplay),classType:txt(meta.classType)||'unknown',classCount:Number(meta.classCount)||1,groupNote:txt(meta.groupNote),
          sourceCode:target,code:base,address:cell.address,row,col,isAssist:true,assignmentType:'assist',payEligible:false
        });
      }
    }
    out.sort((a,b)=>Number(a.day)-Number(b.day)||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||Number(a.teachingPeriod||a.period)-Number(b.teachingPeriod||b.period)||Number(a.row)-Number(b.row)||Number(a.col)-Number(b.col));
    return out;
  }
  function displayAssist(e){
    const base=txt(e?.className||e?.classRaw)||'Lớp chưa xác định',note=txt(e?.groupNote);
    return{...e,className:note?base:`${base} (P)`,classRaw:note?txt(e?.classRaw||base):`${txt(e?.classRaw||base)} (P)`,groupNote:note?`${note} (P)`:''};
  }
  function reportView(a){
    if(!a)return a;
    const assist=(a.assistEntries||[]).map(displayAssist);
    return{...a,entries:[...(a.entries||[]),...assist],assistEntries:assist,assistCount:assist.length};
  }
  function augmentResult(a,ws,code){
    if(!a||!ws||!code)return a;
    const assist=scanAssist(ws,code);
    a.assistEntries=assist;a.assistCount=assist.length;a.assistSourceCode=`${txt(code).toUpperCase()}P`;
    a.__lbgAssistSafe=VERSION;return a;
  }
  function ensureAnalyzeWrapped(){
    const fn=window.analyzeNow;if(typeof fn!=='function')return false;
    if(fn.__lbgAssistSafeWrapper===VERSION)return true;
    if(fn.__lbgAssistSafeWrapper&&fn.__lbgAssistSafeBase)baseAnalyze=fn.__lbgAssistSafeBase;else baseAnalyze=fn;
    wrappedAnalyze=function(ws,code,name){return augmentResult(baseAnalyze(ws,code,name),ws,code)};
    wrappedAnalyze.__lbgAssistSafeWrapper=VERSION;wrappedAnalyze.__lbgAssistSafeBase=baseAnalyze;
    window.analyzeNow=wrappedAnalyze;return true;
  }

  function css(){
    if(q('lbgAssistSafeCss'))return;
    const s=document.createElement('style');s.id='lbgAssistSafeCss';s.textContent=`
      #lbgAssistSafeBanner{margin:16px 0 0;padding:12px 15px;border:2px solid #f4a261;border-radius:15px;background:#fff7ed;color:#7c3f19}
      #lbgAssistSafeBanner b{font-weight:900}.lbg-assist-safe-chip{display:inline-flex;margin-left:7px;padding:3px 8px;border-radius:999px;background:#f4a261;color:#4b342b;font-size:10px;font-weight:900}
      #lbgAssistSafeInfo{margin-top:10px;padding:10px 12px;border:1px solid #fed7aa;border-radius:12px;background:#fffaf5;color:#7c3f19;font-size:12px}
      #lbgAssistSafeInfo strong{font-size:14px}.lbg-assist-safe-list{margin:7px 0 0;padding-left:20px}.lbg-assist-safe-auto{display:block;margin-top:3px;color:#9a5b36;font-size:10px;font-weight:800}.mt-assist[data-lbg-assist-safe-auto]{background:#fff7ed!important;color:#7c3f19!important;font-weight:900!important}
    `;document.head.appendChild(s);
  }
  function banner(){
    if(q('lbgAssistSafeBanner'))return;
    const box=document.createElement('section');box.id='lbgAssistSafeBanner';
    box.innerHTML=`<b>🧪 BẢN THỬ AN TOÀN — TRỢ GIẢNG (P)</b><span class="lbg-assist-safe-chip">PR #36 • KHÔNG PHẢI TRANG CHÍNH</span><div style="margin-top:5px;font-size:12px">Mã giáo viên bình thường = tiết chính. Mã có thêm <b>P</b> ở cuối = trợ giảng. P chỉ hiển thị riêng và <b>không cộng vào tiết chính/tính lương</b>.</div>`;
    const hero=document.querySelector('main.shell .hero');hero?hero.insertAdjacentElement('afterend',box):document.querySelector('main.shell')?.prepend(box);
  }
  function assistInfo(a){
    q('lbgAssistSafeInfo')?.remove();if(!a?.assistCount)return;
    const box=document.createElement('div');box.id='lbgAssistSafeInfo';
    const items=(a.assistEntries||[]).map(e=>`<li>${Number(e.day)===8?'Chủ nhật':'Thứ '+e.day} • ${e.session} • tiết ${rules()?.reportPeriod?.(e)||e.teachingPeriod||e.period} • ${txt(e.schoolName)||'Chưa xác định trường'} • ${txt(e.className)||'Chưa xác định lớp'} <b>(P)</b></li>`).join('');
    box.innerHTML=`<strong>Trợ giảng (P): ${a.assistCount} tiết</strong> — không cộng vào tổng tiết chính.<ul class="lbg-assist-safe-list">${items}</ul>`;
    q('summary')?.insertAdjacentElement('afterend',box);
  }
  function renderAssistPreview(){
    const a=currentResult(),eng=engine();if(!a||!eng?.renderPreview)return;
    if(!a.__lbgAssistSafe){const ws=currentWs(),code=txt(q('teacher')?.value);if(ws&&code)augmentResult(a,ws,code)}
    eng.renderPreview(reportView(a));
    const cap=q('caption');if(cap&&a.assistCount){const chip=document.createElement('span');chip.className='lbg-assist-safe-chip';chip.textContent=`${a.assistCount} trợ (P)`;cap.appendChild(document.createTextNode(' '));cap.appendChild(chip)}
    assistInfo(a);
  }

  function mondayOf(date){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
  function monthYear(month){const y=Number(q('year')?.value)||new Date().getFullYear();return Number(month)>=8?y:y+1}
  function monthSegments(year,month){
    const first=new Date(year,month-1,1,12),last=new Date(year,month,0,12),out=[];
    for(let start=mondayOf(first);start<=last;start=addDays(start,7)){
      const dates=[];for(let i=0;i<7;i++){const d=addDays(start,i);if(d.getFullYear()===year&&d.getMonth()+1===month)dates.push(d)}
      if(dates.length)out.push({key:dateKey(start),dates});
    }
    return out;
  }
  function weekSheet(key){
    const b=book();if(!b)return null;const found=[];
    for(const ws of b.worksheets){let d=null;try{d=typeof startDate==='function'?startDate(ws.name):null}catch{}if(d instanceof Date&&!Number.isNaN(d.getTime())&&dateKey(d)===key)found.push(ws)}
    return found[found.length-1]||null;
  }
  function syncMonthlyAssist(){
    const preview=q('month2Preview'),code=txt(q('month2Teacher')?.value),month=Number(q('month2Select')?.value);if(!preview||!code||month<1||month>12)return;
    const segs=new Map(monthSegments(monthYear(month),month).map(x=>[x.key,x]));
    preview.querySelectorAll('.mt-assist').forEach(input=>{
      const seg=segs.get(input.dataset.week);if(!seg)return;
      const ws=weekSheet(seg.key),allowedDays=seg.dates.map(d=>d.getDay()===0?8:d.getDay()+1),count=ws?scanAssist(ws,code,{allowedDays}).length:0;
      input.readOnly=true;input.value=count?String(count):'';input.dataset.lbgAssistSafeAuto=String(count);input.title=`Tự động đọc từ mã ${code}P`;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      const label=input.closest('label');if(label&&!label.querySelector('.lbg-assist-safe-auto')){const small=document.createElement('small');small.className='lbg-assist-safe-auto';small.textContent=`Tự động từ mã ${code}P`;label.appendChild(small)}
    });
  }

  const safeFile=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'GIAO_VIEN';
  function selectedReports(){
    const ws=currentWs();if(!ws)return[];
    const teacherMap=new Map((window.teachers?.(ws)||[]).map(t=>[txt(t.code).toUpperCase(),{code:txt(t.code),name:txt(t.name||t.teacherName||t.code)}]));
    const checked=[...document.querySelectorAll('#multiTeacherList input[type="checkbox"]:checked')].map(x=>txt(x.value).toUpperCase()).filter(Boolean);
    const codes=checked.length?checked:[txt(q('teacher')?.value).toUpperCase()].filter(Boolean);
    return codes.map(code=>{const t=teacherMap.get(code)||{code,name:code};return window.analyzeNow(ws,t.code,t.name)}).filter(a=>a&&((Number(engine()?.reportTotals?.(a)?.total)||0)>0||(a.assistCount||0)>0));
  }
  function addAssistFooter(ws,a){
    if(!ws||!a?.assistCount)return;
    const old=cellText(ws.getCell('A17'));ws.getCell('A17').value=`${old}\nTrợ (P): ${a.assistCount}`;ws.getRow(17).height=Math.max(Number(ws.getRow(17).height)||0,48);
  }
  async function loadZip(){
    if(window.JSZip)return window.JSZip;
    return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=()=>resolve(window.JSZip);s.onerror=()=>reject(new Error('Không tải được thư viện ZIP.'));document.head.appendChild(s)});
  }
  async function exportWeeklyWithAssist(){
    if(exportBusy)return;const button=q('export'),old=button?.textContent;exportBusy=true;if(button){button.disabled=true;button.textContent='Đang tạo file thử P…'}
    try{
      if(!window.ExcelJS||!window.saveAs)throw new Error('Thư viện xuất Excel chưa sẵn sàng.');
      const eng=engine();if(!eng?.addReportSheet)throw new Error('Bộ xuất báo giảng chưa sẵn sàng.');
      const reports=selectedReports();if(!reports.length)throw new Error('Không có dữ liệu để xuất.');
      const mode=document.querySelector('input[name="multiExportMode"]:checked')?.value||'workbook';
      if(reports.length===1){
        const out=new ExcelJS.Workbook(),a=reports[0],ws=eng.addReportSheet(out,reportView(a),'TUẦN '+(a.week||''));addAssistFooter(ws,a);
        saveAs(new Blob([await out.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LICH_BAO_GIANG_${safeFile(a.teacherName)}_${safeFile(a.sheet)}.xlsx`);
      }else if(mode==='zip'){
        const JSZip=await loadZip(),zip=new JSZip();
        for(const a of reports){const out=new ExcelJS.Workbook(),ws=eng.addReportSheet(out,reportView(a),'TUẦN '+(a.week||''));addAssistFooter(ws,a);zip.file(`LICH_BAO_GIANG_${safeFile(a.teacherName)}_${safeFile(a.sheet)}.xlsx`,await out.xlsx.writeBuffer())}
        saveAs(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),`LICH_BAO_GIANG_${safeFile(reports[0].sheet)}_${reports.length}_GIAO_VIEN.zip`);
      }else{
        const out=new ExcelJS.Workbook();for(const a of reports){const ws=eng.addReportSheet(out,reportView(a),`${a.code} - ${a.teacherName}`);addAssistFooter(ws,a)}
        saveAs(new Blob([await out.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LICH_BAO_GIANG_${safeFile(reports[0].sheet)}_${reports.length}_GIAO_VIEN.xlsx`);
      }
      if(typeof toast==='function')toast('Đã xuất bản thử có Trợ giảng (P).');
    }finally{exportBusy=false;if(button){button.disabled=false;button.textContent=old||'⇩ Xuất Excel'}}
  }

  function assistPayloadEntry(e,baseCode){
    const d=displayAssist(e),period=Number(rules()?.reportPeriod?.(d)||d.teachingPeriod||d.period)||null;
    const rawClass=txt(d.groupNote)?`${txt(d.className)} - ${txt(d.groupNote)}`:txt(d.className);
    const school=txt(d.locationLabel)||(txt(d.siteDisplay)?`${txt(d.schoolName)}\n${txt(d.siteDisplay)}`:txt(d.schoolName));
    return{
      day:Number(d.day),session:txt(d.session),period,teachingPeriod:period,slotPeriod:Number(d.slotPeriod||d.period)||null,sourcePeriod:Number(d.slotPeriod||d.period)||null,
      school,schoolName:txt(d.schoolName),siteName:txt(d.siteName),siteDisplay:txt(d.siteDisplay),locationKey:txt(d.locationKey),
      className:rawClass,classRaw:rawClass,classBase:txt(e.className),classType:txt(e.classType),classCount:Number(e.classCount)||1,groupNote:txt(d.groupNote),
      sourceCode:`${txt(baseCode).toUpperCase()}P`,sourceCell:txt(d.address),address:txt(d.address),sourceCells:[txt(d.address)].filter(Boolean),
      assignmentType:'assist',isAssist:true,payEligible:false
    };
  }
  function sheetsReport(mode){
    const api=window.LBGSheetsOwnerV3;if(!api?.buildReport)throw new Error('Cầu nối Google Sheets V3 chưa sẵn sàng.');
    const base=api.buildReport(mode),ws=currentWs(),code=txt(base.teacherCode||q('teacher')?.value).toUpperCase();
    const assist=scanAssist(ws,code),extra=assist.map(e=>assistPayloadEntry(e,code));
    base.entries=[...(base.entries||[]),...extra];base.schedule=base.entries.map(e=>({...e}));
    base.assistPeriods=extra.length;base.assistCount=extra.length;base.atomicCount=base.entries.length;base.payAtomicCount=Number(base.mainPeriods||0)+Number(base.plusPeriods||0);
    base.totalWithAssist=Number(base.total||0)+extra.length;base.assistText=`${extra.length} Trợ (P)`;
    base.reportSemanticsVersion=`${txt(base.reportSemanticsVersion)||'v3'}+assist-safe-${VERSION}`;
    base.sourceCountSemantics='atomicTeacherCodeCellsIncludingPlusAndAssistP';base.assistSemantics='suffix-P-is-assist-not-pay-period';
    return base;
  }
  function closeSheetDialog(){q('lbgAssistSafeSheetOverlay')?.remove()}
  function openSheetDialog(){
    let r;try{r=sheetsReport('overwrite')}catch(error){alert(error?.message||String(error));return}
    const o=document.createElement('div');o.id='lbgAssistSafeSheetOverlay';o.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(15,23,42,.28);display:grid;place-items:center;padding:18px';
    o.innerHTML=`<div role="dialog" style="width:min(520px,100%);background:#fff;border:1px solid #e7d5c8;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.24);padding:22px;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif"><h3 style="margin:0 0 7px;color:#5b3828">Lưu Google Sheets — bản thử P</h3><p style="margin:0 0 18px;color:#806b61">${r.schoolYear} • ${r.sheetName} • ${r.teacherName}<br><b>${r.mainPeriods} chính${r.plusPeriods?` + ${r.plusPeriods} cộng`:''} = ${r.total} tiết</b><br><b style="color:#9a5b36">${r.assistPeriods} Trợ (P)</b> — không cộng vào tổng chính.</p><div style="display:grid;gap:10px"><button data-mode="overwrite" type="button" style="border:0;border-radius:12px;padding:12px;background:#0f766e;color:#fff;font-weight:800">Ghi đè tab tuần hiện có</button><button data-mode="copy" type="button" style="border:1px solid #cbd5e1;border-radius:12px;padding:12px;background:#fff;font-weight:800">Tạo BẢN 2 nếu tuần đã tồn tại</button><button data-mode="cancel" type="button" style="border:0;border-radius:12px;padding:10px;background:#f1f5f9;color:#64748b;font-weight:700">Hủy</button></div></div>`;
    o.addEventListener('click',e=>{const mode=e.target?.dataset?.mode;if(mode==='cancel'||e.target===o){closeSheetDialog();return}if(mode==='overwrite'||mode==='copy'){closeSheetDialog();saveSheetsWithAssist(mode)}});document.body.appendChild(o);
  }
  async function saveSheetsWithAssist(mode){
    if(sheetBusy)return;const button=q('saveSheets');sheetBusy=true;if(button){button.disabled=true;button.textContent='Đang lưu bản thử P…'}
    try{
      const api=window.LBGSheetsOwnerV3;if(!api?.invokeOwner)throw new Error('Cầu nối Google Sheets chưa sẵn sàng.');
      const report=sheetsReport(mode),data=await api.invokeOwner(report);
      if(typeof toast==='function')toast(`Đã gửi ${report.total} tiết chính • ${report.assistPeriods} Trợ (P) lên Google Sheets.`);
      if(data?.url&&confirm('Đã lưu Google Sheets. Mở file ngay?'))window.open(data.url,'_blank','noopener');
    }catch(error){console.error('Assist P safe Sheets:',error);alert('Không lưu được Google Sheets: '+(error?.message||String(error)))}finally{sheetBusy=false;if(button){button.disabled=false;button.textContent='☁ Lưu vào Google Sheets'}}
  }

  function onWindowClick(event){
    const button=event.target?.closest?.('button');if(!button)return;
    if(button.id==='analyze'){
      ensureAnalyzeWrapped();setTimeout(renderAssistPreview,90);setTimeout(renderAssistPreview,260);return;
    }
    if(button.id==='month2Build'){
      setTimeout(syncMonthlyAssist,100);setTimeout(syncMonthlyAssist,300);return;
    }
    if(button.id==='export'){
      ensureAnalyzeWrapped();
      const a=currentResult();if(!a||!(a.assistCount||scanAssist(currentWs(),txt(q('teacher')?.value)).length))return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();exportWeeklyWithAssist().catch(error=>{console.error(error);alert('Không xuất được Excel bản thử P: '+(error?.message||String(error)));});return;
    }
    if(button.id==='saveSheets'){
      const a=currentResult();if(!a||!(a.assistCount||scanAssist(currentWs(),txt(q('teacher')?.value)).length))return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openSheetDialog();
    }
  }
  function onChange(event){
    if(['week','teacher'].includes(event.target?.id)){q('lbgAssistSafeInfo')?.remove();setTimeout(ensureAnalyzeWrapped,40)}
  }
  function install(){
    css();banner();ensureAnalyzeWrapped();
    window.addEventListener('click',onWindowClick,true);document.addEventListener('change',onChange,true);
    document.addEventListener('lbg-tkb-parser-v2-ready',()=>setTimeout(ensureAnalyzeWrapped,0));
    window.LBGAssistPSafe={version:VERSION,scanAssist,displayAssist,reportView,augmentResult,syncMonthlyAssist,sheetsReport,ensureAnalyzeWrapped};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
