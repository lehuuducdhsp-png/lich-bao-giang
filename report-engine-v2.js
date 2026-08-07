'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const escHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const GA_PREFIX='lbgGaManualV1';
  const selection=new Map();
  const sundayCache=new WeakMap();
  let observer=null,queued=false;

  function book(){try{return typeof wb!=='undefined'?wb:null}catch{return null}}
  function activeVersion(){try{return typeof activeId!=='undefined'&&activeId?activeId:'active'}catch{return'active'}}
  function worksheet(name){const b=book();return b&&name?b.getWorksheet(name):null}
  function currentWorksheet(){return worksheet(q('week')?.value)}
  function allTeacherReader(){return typeof window.LBGAllTeachers==='function'?window.LBGAllTeachers:window.teachers}
  function visibleTeacherReader(){return window.teachers}

  function allTeachers(ws){
    const fn=allTeacherReader();if(typeof fn!=='function'||!ws)return[];
    try{return fn(ws)||[]}catch{return[]}
  }
  function visibleTeachers(ws){
    const fn=visibleTeacherReader();if(typeof fn!=='function'||!ws)return[];
    try{return fn(ws)||[]}catch{return[]}
  }

  function weekHasSunday(ws){
    if(!ws)return false;
    if(sundayCache.has(ws))return sundayCache.get(ws);
    const codes=new Set(allTeachers(ws).map(x=>txt(x?.code).toUpperCase()).filter(Boolean));
    let found=false;
    if(codes.size){
      ws.eachRow({includeEmpty:false},row=>{
        if(found)return;
        for(let c=64;c<=73;c++){
          const value=txt(row.getCell(c).text).toUpperCase();
          if(value&&codes.has(value)){found=true;break}
        }
      });
    }
    sundayCache.set(ws,found);return found;
  }
  function daysForWorksheet(ws){return weekHasSunday(ws)?[2,3,4,5,6,7,8]:[2,3,4,5,6,7]}
  function daysForReport(a){return daysForWorksheet(worksheet(a?.sheet)||currentWorksheet())}
  function dayLabel(day){return Number(day)===8?'Chủ nhật':`Thứ ${Number(day)}`}
  function endDate(start,hasSunday){return start instanceof Date&&!Number.isNaN(start.getTime())?new Date(start.getTime()+(hasSunday?6:5)*864e5):null}

  function schoolList(a,day,session){return[...new Set((a?.entries||[]).filter(e=>Number(e.day)===Number(day)&&e.session===session).map(e=>txt(e.school)).filter(Boolean))]}
  function slotEntries(a,day,session,period){return(a?.entries||[]).filter(e=>Number(e.day)===Number(day)&&e.session===session&&Number(e.period)===Number(period))}

  function reportKey(a){return`${GA_PREFIX}:${activeVersion()}:${txt(a?.sheet)}:${txt(a?.code||a?.teacherName)}`}
  function ensureGa(a){
    if(!a)return{};
    if(a.gaValues&&typeof a.gaValues==='object')return a.gaValues;
    try{const saved=JSON.parse(localStorage.getItem(reportKey(a))||'{}');a.gaValues=saved&&typeof saved==='object'?saved:{}}catch{a.gaValues={}}
    return a.gaValues;
  }
  function gaKey(day,session,school){return`${Number(day)}|${txt(session)}|${txt(school)}`}
  function gaValue(a,day,session,school){const v=ensureGa(a)[gaKey(day,session,school)];return v==null?'':String(v)}
  function saveGa(a){try{localStorage.setItem(reportKey(a),JSON.stringify(ensureGa(a)))}catch{}}
  function safeGa(v){if(txt(v)==='')return'';const n=Number(v);return Number.isFinite(n)&&n>=0?String(Math.round(n)):''}

  function schoolEditor(a,day,session){
    const list=schoolList(a,day,session);if(!list.length)return'';
    return list.map(school=>`<div class="lbg-r2-school"><div class="lbg-r2-school-name">${escHtml(school)}</div><label>(GA <input class="lbg-r2-ga" type="number" min="0" step="1" inputmode="numeric" value="${escHtml(gaValue(a,day,session,school))}" data-day="${day}" data-session="${encodeURIComponent(session)}" data-school="${encodeURIComponent(school)}" aria-label="Số GA của ${escHtml(school)}">)</label></div>`).join('<div class="lbg-r2-sep">/</div>');
  }
  function bindGaInputs(a){
    q('preview')?.querySelectorAll('.lbg-r2-ga').forEach(input=>input.addEventListener('input',()=>{
      const key=gaKey(Number(input.dataset.day),decodeURIComponent(input.dataset.session||''),decodeURIComponent(input.dataset.school||''));
      const value=safeGa(input.value);input.value=value;
      if(value==='')delete ensureGa(a)[key];else ensureGa(a)[key]=value;
      saveGa(a);
    }));
  }

  function installCss(){
    if(q('lbgReportEngineV2Css'))return;
    const s=document.createElement('style');s.id='lbgReportEngineV2Css';s.textContent=`
      .lbg-r2-help{margin:0 0 10px;padding:9px 11px;border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff;color:#1e40af;font-size:12px}
      .lbg-r2-sunday{display:inline-flex;margin-left:7px;padding:3px 7px;border:1px solid #fed7aa;border-radius:999px;background:#fff7ed;color:#9a3412;font:800 10px system-ui,sans-serif;vertical-align:middle}
      .lbg-r2-school{display:grid;justify-items:center;gap:2px;padding:3px 2px}.lbg-r2-school-name{font-weight:800;line-height:1.15}.lbg-r2-school label{font-weight:800;white-space:nowrap}.lbg-r2-ga{width:45px;padding:2px 3px;border:1px solid #94a3b8;border-radius:6px;background:#fff;text-align:center;font:700 13px "Times New Roman",serif}.lbg-r2-ga:focus{outline:2px solid #0f766e;border-color:#0f766e}.lbg-r2-sep{font-weight:900}.sheet.lbg-r2-seven-days{min-width:1120px}.sheet.lbg-r2-six-days{min-width:980px}
      #compare[data-lbg-r2="1"]{white-space:nowrap}
    `;document.head.appendChild(s);
  }

  function renderPreviewV2(a){
    if(!a)return;installCss();ensureGa(a);
    const ds=daysForReport(a),hasSunday=ds.includes(8),end=endDate(a.start,hasSunday);
    let rows='';
    for(const session of ['Sáng','Chiều']){
      rows+=`<tr><td class="session" rowspan="6">${session}</td><td class="session">Tiết</td>${ds.map(day=>`<td class="school">${schoolEditor(a,day,session)}</td>`).join('')}</tr>`;
      for(let period=1;period<=5;period++){
        rows+=`<tr><td>Tiết ${period}</td>${ds.map(day=>{
          const primary=schoolList(a,day,session)[0];
          return`<td>${slotEntries(a,day,session,period).map(e=>`<span class="${primary&&txt(e.school)!==primary?'red':''}">${escHtml(e.className)}</span>`).join(' & ')}</td>`;
        }).join('')}</tr>`;
      }
    }
    const caption=q('caption');if(caption)caption.innerHTML=`${escHtml(a.teacherName)} • ${Number(a.total)||0} tiết${hasSunday?'<span class="lbg-r2-sunday">Tuần có Chủ nhật</span>':''}`;
    const preview=q('preview');if(preview)preview.innerHTML=`<div class="lbg-r2-help"><b>Số GA có thể chỉnh trực tiếp.</b> Tuần nào TKB thật sự có tiết Chủ nhật, hệ thống tự thêm cột Chủ nhật cho toàn bộ báo giảng của tuần đó.</div><div class="sheet ${hasSunday?'lbg-r2-seven-days':'lbg-r2-six-days'}"><div class="title"><h2>LỊCH BÁO GIẢNG NĂM HỌC ${escHtml(q('year')?.value)} - ${Number(q('year')?.value)+1}</h2><h3>Tuần ${escHtml(a.week||'...')}</h3><p>${a.start&&end?'(Từ ngày '+a.start.toLocaleDateString('vi-VN')+' đến ngày '+end.toLocaleDateString('vi-VN')+')':'(Chưa xác định ngày từ tên sheet)'}</p></div><table class="report"><tr>${['Buổi','Tiết',...ds.map(dayLabel)].map(x=>`<th style="height:62px;vertical-align:middle">${escHtml(x)}</th>`).join('')}</tr>${rows}</table><div class="foot"><span>TỔNG: ${Number(a.total)||0} tiết</span><span>Giáo viên: ${escHtml(a.teacherName)}</span></div></div>`;
    bindGaInputs(a);if(q('previewCard'))q('previewCard').hidden=false;
  }

  function styleCell(cell,fill,bold=false,size=12){
    cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};
    cell.font={name:'Times New Roman',size,bold};
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}};
    cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};
  }
  function colLetter(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
  function safeFile(v){return txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'GIAO_VIEN'}
  function uniqueSheetName(book,name){let base=txt(name).replace(/[\\/?*\[\]:]/g,' ').replace(/\s+/g,' ').trim().slice(0,31)||'GIÁO VIÊN',out=base,n=2;while(book.getWorksheet(out)){const x=` (${n++})`;out=base.slice(0,31-x.length)+x}return out}
  function gaSchoolText(a,day,session){return schoolList(a,day,session).map(s=>`${s}\n(GA ${gaValue(a,day,session,s)})`).join('\n/\n')}

  function addReportSheet(bookOut,a,name){
    ensureGa(a);
    const ws=bookOut.addWorksheet(uniqueSheetName(bookOut,name)),ds=daysForReport(a),hasSunday=ds.includes(8),lastCol=2+ds.length,endCol=colLetter(lastCol),year=Number(q('year')?.value)||new Date().getFullYear();
    ws.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1,margins:{left:.2,right:.2,top:.3,bottom:.3,header:.1,footer:.1}};
    [`A1:${endCol}1`,`A2:${endCol}2`,`A3:${endCol}3`,'A5:A10','A11:A16','A17:D17',`E17:${endCol}17`].forEach(r=>ws.mergeCells(r));
    ws.getCell('A1').value=`LỊCH BÁO GIẢNG NĂM HỌC ${year} - ${year+1}`;
    ws.getCell('A2').value='Tuần '+(a.week||'');
    const end=endDate(a.start,hasSunday);if(a.start&&end)ws.getCell('A3').value=`(Từ ngày ${a.start.toLocaleDateString('vi-VN')} đến ngày ${end.toLocaleDateString('vi-VN')})`;
    ws.getRow(4).values=['Buổi','Tiết',...ds.map(dayLabel)];
    for(const [session,sr,pr] of [['Sáng',5,6],['Chiều',11,12]]){
      ws.getCell(sr,1).value=session;ws.getCell(sr,2).value='Tiết';
      for(let p=1;p<=5;p++)ws.getCell(pr+p-1,2).value='Tiết '+p;
      ds.forEach((day,index)=>{
        const col=index+3,primary=schoolList(a,day,session)[0]||'';
        ws.getCell(sr,col).value=gaSchoolText(a,day,session);
        for(let p=1;p<=5;p++){
          const items=slotEntries(a,day,session,p),cell=ws.getCell(pr+p-1,col);
          cell.value=items.length?{richText:items.flatMap((e,k)=>[{text:(k?' & ':'')+txt(e.className),font:{name:'Times New Roman',size:12,color:{argb:primary&&txt(e.school)!==primary?'FFFF0000':'FF000000'}}}])}:'';
        }
      });
    }
    ws.getCell('A17').value='TỔNG: '+(Number(a.total)||0)+' tiết';ws.getCell('E17').value='Giáo viên: '+txt(a.teacherName);
    ws.columns=[{width:9},{width:10},...ds.map(()=>({width:hasSunday?17:19}))];
    for(let r=1;r<=17;r++){
      ws.getRow(r).height=r<=3?26:r===4?42:(r===5||r===11?64:27);
      for(let c=1;c<=lastCol;c++)styleCell(ws.getCell(r,c),[1,2,3,17].includes(r)?'FFB9E6A5':(r===4||c<=2?'FFF6C9AE':'FFDFF5E4'),[4,5,11,17].includes(r),r===1?18:r===2?15:12);
    }
    ws.getCell('E17').font={name:'Times New Roman',size:12,bold:true,italic:true};return ws;
  }

  function selectedTeachers(){
    const ws=currentWorksheet();if(!ws)return[];
    const allowed=new Map(visibleTeachers(ws).map(x=>[txt(x.code).toUpperCase(),{code:txt(x.code),name:txt(x.name||x.teacherName||x.code)}]));
    const list=[...selection.values()].filter(x=>allowed.has(txt(x.code).toUpperCase()));
    if(list.length)return list;
    const code=txt(q('teacher')?.value),opt=q('teacher')?.selectedOptions?.[0];
    if(code)return[{code,name:txt(opt?.dataset?.name||allowed.get(code.toUpperCase())?.name||code)}];
    try{if(typeof result!=='undefined'&&result?.code)return[{code:result.code,name:result.teacherName||result.code}]}catch{}
    return[];
  }
  function reportsForExport(){
    const ws=currentWorksheet();if(!ws)throw new Error('Hãy chọn tuần trước khi xuất.');
    const teachers=selectedTeachers();if(!teachers.length)throw new Error('Hãy chọn ít nhất một giáo viên.');
    return teachers.map(t=>{const a=analyzeNow(ws,t.code,t.name);ensureGa(a);return a}).filter(a=>a.total>0);
  }
  function loadScript(url,globalName){return new Promise((ok,no)=>{if(window[globalName])return ok(window[globalName]);const s=document.createElement('script');s.src=url;s.onload=()=>ok(window[globalName]);s.onerror=()=>no(new Error('Không tải được thư viện ZIP.'));document.head.appendChild(s)})}

  async function exportUnified(){
    const button=q('export');if(!button)return;
    const old=button.textContent;button.disabled=true;button.textContent='Đang tạo file…';
    try{
      if(!window.ExcelJS||!window.saveAs)throw new Error('Thư viện xuất Excel chưa sẵn sàng.');
      const reports=reportsForExport();if(!reports.length)throw new Error('Không có tiết dạy để xuất.');
      const mode=document.querySelector('input[name="multiExportMode"]:checked')?.value||'workbook';
      if(reports.length===1){
        const out=new ExcelJS.Workbook();addReportSheet(out,reports[0],'TUẦN '+(reports[0].week||''));
        saveAs(new Blob([await out.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LICH_BAO_GIANG_${safeFile(reports[0].teacherName)}_${safeFile(reports[0].sheet)}.xlsx`);
      }else if(mode==='zip'){
        const JSZip=window.JSZip||await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','JSZip'),zip=new JSZip();
        for(const a of reports){const out=new ExcelJS.Workbook();addReportSheet(out,a,'TUẦN '+(a.week||''));zip.file(`LICH_BAO_GIANG_${safeFile(a.teacherName)}_${safeFile(a.sheet)}.xlsx`,await out.xlsx.writeBuffer())}
        saveAs(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),`LICH_BAO_GIANG_${safeFile(reports[0].sheet)}_${reports.length}_GIAO_VIEN.zip`);
      }else{
        const out=new ExcelJS.Workbook();reports.forEach(a=>addReportSheet(out,a,`${a.code} - ${a.teacherName}`));
        saveAs(new Blob([await out.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LICH_BAO_GIANG_${safeFile(reports[0].sheet)}_${reports.length}_GIAO_VIEN.xlsx`);
      }
      if(typeof toast==='function')toast(`Đã xuất lịch của ${reports.length} giáo viên${weekHasSunday(currentWorksheet())?' • có cột Chủ nhật':''}.`);
    }catch(error){console.error(error);alert('Không xuất được file: '+(error?.message||String(error)))}
    finally{button.disabled=false;button.textContent=selection.size>1?`⇩ Xuất Excel (${selection.size} GV)`:'⇩ Xuất Excel'}
  }

  function trackSelection(event){
    const input=event.target?.closest?.('#multiTeacherList input[type="checkbox"]');if(!input)return;
    const ws=currentWorksheet(),item=visibleTeachers(ws).find(x=>txt(x.code)===txt(input.value));
    if(input.checked&&item)selection.set(txt(item.code),{code:txt(item.code),name:txt(item.name||item.teacherName||item.code)});else selection.delete(txt(input.value));
  }
  function bindSelectionButtons(event){
    const target=event.target?.closest?.('button');if(!target)return;
    if(target.id==='multiClearAll')setTimeout(()=>selection.clear(),0);
    if(target.id==='multiSelectAll')setTimeout(()=>{selection.clear();visibleTeachers(currentWorksheet()).forEach(x=>selection.set(txt(x.code),{code:txt(x.code),name:txt(x.name||x.teacherName||x.code)}))},0);
  }

  function updateCompareLabel(){
    const b=q('compare');if(!b)return;b.dataset.lbgR2='1';b.textContent='⇄ So sánh phiên bản TKB';b.title='So sánh lịch của cùng một giáo viên giữa phiên bản TKB đang dùng và một phiên bản TKB khác.';
  }

  function updateWeeklyOffDays(){
    const select=q('weeklyOffDay');if(!select)return;
    const weekName=q('weeklyStatsWeek')?.value||q('week')?.value,ws=worksheet(weekName);if(!ws)return;
    const ds=daysForWorksheet(ws),start=typeof startDate==='function'?startDate(ws.name):null,old=Number(select.value);
    const signature=ds.join(',')+'|'+ws.name;if(select.dataset.lbgR2Days===signature)return;
    select.dataset.lbgR2Days=signature;
    select.innerHTML=ds.map(day=>{let label=dayLabel(day);if(start instanceof Date&&!Number.isNaN(start.getTime())){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d.setDate(d.getDate()+(day===8?6:day-2));label+=` – ${d.toLocaleDateString('vi-VN')}`}return`<option value="${day}">${escHtml(label)}</option>`}).join('');
    if(ds.includes(old))select.value=String(old);select.disabled=false;
  }

  function install(){
    installCss();window.renderPreview=renderPreviewV2;
    window.LBGReportEngineV2={weekHasSunday,daysForWorksheet,daysForReport,renderPreview:renderPreviewV2,addReportSheet,ensureGa};
    updateCompareLabel();updateWeeklyOffDays();
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})}

  document.addEventListener('change',event=>{
    trackSelection(event);
    if(event.target?.id==='week'){selection.clear();sundayCache.delete(currentWorksheet());setTimeout(queue,40)}
    if(event.target?.id==='weeklyStatsWeek')setTimeout(()=>{const s=q('weeklyOffDay');if(s)s.dataset.lbgR2Days='';updateWeeklyOffDays()},20);
  },true);
  document.addEventListener('click',event=>{
    bindSelectionButtons(event);
    const button=event.target?.closest?.('#export');if(button){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();exportUnified()}
  },true);

  function start(){
    install();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
