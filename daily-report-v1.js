'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGDailyReportV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260929.9';
  const PERIODS=5;
  const DAILY_LAYOUT=Object.freeze({teacherColumn:1,morningStart:2,morningEnd:6,afternoonStart:7,afternoonEnd:11,totalColumn:12});
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  const q=id=>root.document?.getElementById(id)||null;
  const safeFile=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'NGAY';
  const dayNames={2:'Thứ Hai',3:'Thứ Ba',4:'Thứ Tư',5:'Thứ Năm',6:'Thứ Sáu',7:'Thứ Bảy',8:'Chủ Nhật'};
  let installed=false,currentData=null,groups=[],groupsLoaded=false,exportBusy=false,pngExportBusy=false,pngModulePromise=null;
  const manualSelected=new Set(),rawEventCache=new WeakMap();

  function dateFromKey(value){
    const m=txt(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
    return Number.isNaN(d.getTime())?null:d;
  }
  function dateKey(d){return d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''}
  function dayNoForDate(d){if(!(d instanceof Date)||Number.isNaN(d.getTime()))return 0;const js=d.getDay();return js===0?8:js+1}
  function formatDateTitle(d){
    if(!(d instanceof Date)||Number.isNaN(d.getTime()))return'';
    return`${dayNames[dayNoForDate(d)]||''}, ngày ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }
  function classText(e){
    const schoolApi=root.LBGSchoolReportV1;
    if(typeof schoolApi?.classText==='function')return schoolApi.classText(e);
    const base=txt(e?.className||e?.classRaw)||'Lớp không xác định',note=txt(e?.groupNote);
    return note&&!base.toUpperCase().includes(note.toUpperCase())?`${base} - ${note}`:base;
  }
  function gradeOfEntry(e){
    const raw=txt(e?.classRaw||e?.className||e?.classDisplay);
    let m=raw.match(/KHỐI\s*([1-5])/i);if(m)return Number(m[1]);
    m=raw.match(/(?:^|[^0-9])([1-5])\s*\/\s*[A-ZÀ-Ỹ0-9]{1,4}/i);if(m)return Number(m[1]);
    m=raw.match(/LỚP\s*([1-5])(?:\b|\s*\/)/i);return m?Number(m[1]):0;
  }
  function book(){try{return typeof wb!=='undefined'?wb:null}catch{return null}}
  function selectedWeekName(){return txt(q('week')?.value)}
  function yearStart(){
    const n=Number(q('year')?.value);return Number.isFinite(n)&&n>2000?n:new Date().getFullYear();
  }
  function fallbackWeekStart(ws){
    const m=txt(ws?.name).match(/^(\d{1,2})\s*T\s*(\d{1,2})$/i);if(!m)return null;
    const month=Number(m[2]),base=yearStart(),year=month>=8?base:base+1;
    const d=new Date(year,month-1,Number(m[1]),12);return Number.isNaN(d.getTime())?null:d;
  }
  function weekStart(ws){
    try{
      const d=typeof startDate==='function'?startDate(ws?.name):null;
      if(d instanceof Date&&!Number.isNaN(d.getTime()))return d;
    }catch{}
    return fallbackWeekStart(ws);
  }
  function isWeek(ws){
    try{return typeof weekLike==='function'?Boolean(weekLike(ws)):Boolean(fallbackWeekStart(ws))}catch{return Boolean(fallbackWeekStart(ws))}
  }
  function findWeekForDate(b,d){
    if(!b||!(d instanceof Date)||Number.isNaN(d.getTime()))return null;
    const t=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12).getTime();
    for(const ws of b.worksheets||[]){
      if(!isWeek(ws))continue;
      const start=weekStart(ws);if(!start)continue;
      const s=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12).getTime();
      const end=s+6*86400000;
      if(t>=s&&t<=end)return{ws,start:new Date(s),day:dayNoForDate(d)};
    }
    return null;
  }
  function weekDates(start,includeSunday=false){
    if(!(start instanceof Date)||Number.isNaN(start.getTime()))return[];
    const count=includeSunday?7:6,out=[];
    for(let i=0;i<count;i++){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i,12);out.push({day:i+2,date:d,dateKey:dateKey(d)})}
    return out
  }
  function sheetNameForDate(day,date){
    const prefix=Number(day)===8?'CN':`T${Number(day)}`;
    return`${prefix} ${String(date.getDate()).padStart(2,'0')}-${String(date.getMonth()+1).padStart(2,'0')}`
  }
  function availableWeeks(b){
    return(b?.worksheets||[]).filter(isWeek).map(ws=>({ws,start:weekStart(ws)})).filter(x=>x.start).sort((a,b)=>a.start-b.start)
  }
  function currentRangeMode(){return txt(q('lbgDailyRangeMode')?.value)||'day'}
  function allTeachers(ws){
    const fn=typeof root.LBGAllTeachers==='function'?root.LBGAllTeachers:(typeof root.teachers==='function'?root.teachers:null);
    try{return(fn?.(ws)||[]).map(x=>({code:txt(x?.code).toUpperCase(),name:txt(x?.name||x?.teacherName||x?.code)})).filter(x=>x.code&&x.code!=='OFF')}catch{return[]}
  }
  function cellText(cell){
    try{const c=cell?.master||cell,t=txt(c?.text);if(t)return t;const v=c?.value;if(v==null)return'';if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return txt(v);if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));if(v?.result!=null)return txt(v.result);if(typeof v?.text==='string')return txt(v.text)}catch{}return'';
  }
  function mainEvents(ws){
    const parser=root.LBGTkbParserV2;if(!parser?.scanAssignments)throw new Error('Bộ đọc TKB chưa sẵn sàng.');
    const teachers=allTeachers(ws),allowed=new Set(teachers.map(x=>x.code));
    return(parser.scanAssignments(ws)||[]).filter(e=>allowed.has(txt(e?.code).toUpperCase())).map(e=>({...e,code:txt(e?.code).toUpperCase(),isAssist:false,isPlus:false,teachingPeriod:Number(e?.teachingPeriod??e?.period)||0}));
  }
  function plusEvents(ws){
    const parser=root.LBGTkbParserV2;if(!parser?.scanPlusGroupedAssignments)return[];
    try{return(parser.scanPlusGroupedAssignments(ws)||[]).map(e=>({...e,code:txt(e?.code).toUpperCase(),isPlus:true,isAssist:false,teachingPeriod:Number(e?.teachingPeriod??e?.period)||0}))}catch{return[]}
  }
  function assistTeacherCodesPresent(ws,teachers){
    const parser=root.LBGTkbParserV2,map=new Map((teachers||[]).map(t=>[`${t.code}P`,t.code])),found=new Set();
    if(!ws||!map.size||!parser?.timetableColumns)return found;
    const start=Math.max(1,Number(parser.buildHeader?.(ws)?.headerRow||4)+1),last=Number(ws.rowCount||0);
    for(const col of parser.timetableColumns(ws)||[])for(let row=start;row<=last;row++){const base=map.get(cellText(ws.getCell(row,col)).toUpperCase());if(base)found.add(base)}
    return found;
  }
  function assistEvents(ws){
    const api=root.LBGAssistPPreviewSafe,teachers=allTeachers(ws),byCode=new Map(teachers.map(t=>[t.code,t]));if(!api?.scanAssist)return[];
    const out=[],seen=new Set(),present=assistTeacherCodesPresent(ws,teachers);
    for(const code of present){
      const t=byCode.get(code);if(!t)continue;
      for(const e of api.scanAssist(ws,code)||[]){
        const address=txt(e?.address),id=address||`${code}|${Number(e?.day)}|${txt(e?.session)}|${Number(e?.teachingPeriod??e?.period)}|${txt(e?.className)}`;
        if(seen.has(id))continue;seen.add(id);
        out.push({...e,code,teacherName:t.name,isAssist:true,isPlus:false,teachingPeriod:Number(e?.teachingPeriod??e?.period)||0});
      }
    }
    return out;
  }
  function rawEvents(ws){
    if(rawEventCache.has(ws))return rawEventCache.get(ws);
    const map=new Map();
    for(const e of [...mainEvents(ws),...plusEvents(ws),...assistEvents(ws)]){
      const key=txt(e?.address)||`${txt(e?.code)}|${Number(e?.day)}|${txt(e?.session)}|${Number(e?.teachingPeriod??e?.period)}|${txt(e?.classRaw||e?.className)}|${e?.isAssist?'P':e?.isPlus?'+':'T'}`;
      if(!map.has(key))map.set(key,e);
    }
    const rows=[...map.values()];rawEventCache.set(ws,rows);return rows;
  }
  function allEvents(ws,attachGa=false){
    const raw=rawEvents(ws);if(!attachGa)return raw;
    const api=root.LBGSchoolReportV1;
    try{return typeof api?.attachGa==='function'?api.attachGa(ws,raw):raw}catch{return raw}
  }
  function teacherMap(ws,events=[]){
    const map=new Map(allTeachers(ws).map(x=>[x.code,x]));
    for(const e of events||[]){const code=txt(e?.code).toUpperCase();if(code&&!map.has(code))map.set(code,{code,name:txt(e?.teacherName||code)})}
    return map;
  }
  function groupCodes(group,available){
    const helper=root.LBGReportGroupPickerV1;
    if(typeof helper?.groupCodes==='function')return helper.groupCodes(group,available);
    const allow=available instanceof Set?available:new Set(available||[]),seen=new Set(),out=[];
    for(const m of group?.members||[]){const code=txt(m?.teacher_code||m?.code).toUpperCase();if(!code||seen.has(code)||(allow.size&&!allow.has(code)))continue;seen.add(code);out.push(code)}
    return out;
  }
  function resolveScopeCodes(scope,{teachers=[],selectedCodes=[],group=null}={}){
    const available=new Set(teachers.map(x=>txt(x?.code).toUpperCase()).filter(Boolean));
    if(scope==='group')return groupCodes(group,available);
    const seen=new Set(),out=[];
    for(const raw of selectedCodes||[]){const code=txt(raw).toUpperCase();if(code&&available.has(code)&&!seen.has(code)){seen.add(code);out.push(code)}}
    return out;
  }
  const eventSlot=e=>`${txt(e?.session)}|${Number(e?.teachingPeriod??e?.period)}`;
  function eventsForTeacherDay(events,code,day){const c=txt(code).toUpperCase();return(events||[]).filter(e=>txt(e?.code).toUpperCase()===c&&Number(e?.day)===Number(day))}
  function buildDailySlots(events,codes,day){
    const map=new Map();
    for(const code of codes||[])for(const e of eventsForTeacherDay(events,code,day)){
      const key=`${txt(code).toUpperCase()}|${eventSlot(e)}`;if(!map.has(key))map.set(key,[]);map.get(key).push(e)
    }
    for(const list of map.values())list.sort((a,b)=>Number(Boolean(a?.isAssist))-Number(Boolean(b?.isAssist))||Number(Boolean(a?.isPlus))-Number(Boolean(b?.isPlus))||txt(a?.address).localeCompare(txt(b?.address)));
    return map;
  }
  function gaText(e){
    const raw=e?.gaDisplay??e?.ga;
    if(raw===null||raw===undefined||txt(raw)==='')return'GA —';
    const n=Number(raw);return Number.isFinite(n)?`GA ${Math.round(n)}`:`GA ${txt(raw)}`;
  }
  function schoolText(e){
    const cleaner=root.LBGReportEngineV4?.dailyLocationText;
    if(typeof cleaner==='function'){
      const value=txt(cleaner(e));if(value)return value
    }
    return txt(e?.locationLabel||e?.schoolName||e?.school).replace(/<br\s*\/?\s*>/gi,'\n').split(/\n/).map(txt).filter(Boolean).join(' • ')||'Chưa xác định trường'
  }
  function roomText(e){return txt(e?.roomRaw)}
  function eventLines(e,mode='full'){
    const school=schoolText(e),cls=classText(e),room=roomText(e),ga=gaText(e),flags=[e?.isPlus?'Cộng (+)':'',e?.isAssist?'Trợ (P)':'',e?.makeUp?'Dạy bù':''].filter(Boolean);
    if(mode==='compact')return[`${school} • ${cls}${room?` • ${room}`:''} • ${ga}${flags.length?` • ${flags.join(' • ')}`:''}`];
    return[school,`${cls}${room?` • ${room}`:''}`,`${ga}${flags.length?` • ${flags.join(' • ')}`:''}`];
  }
  function summarizeTeacher(events,code,day){
    const rows=eventsForTeacherDay(events,code,day);
    return{main:rows.filter(e=>!e.isAssist&&!e.isPlus).length,plus:rows.filter(e=>e.isPlus).length,assist:rows.filter(e=>e.isAssist).length,total:rows.length};
  }
  function authOwner(){try{return Boolean(root.LBGAuth?.isOwner?.())}catch{return false}}
  function accessReady(){return Boolean(root.LBGAccess?.context)}
  function canView(){
    const a=root.LBGAccess;
    if(accessReady())return Boolean(a?.isOwner?.()||a?.canReviewAllReports?.());
    return authOwner()
  }
  function setControlsEnabled(enabled){
    for(const id of ['lbgDailyRangeMode','lbgDailyDate','lbgDailyWeek','lbgDailyScope','lbgDailyScopeTarget','lbgDailyMode','lbgDailyView'])if(q(id))q(id).disabled=!enabled;
    if(!enabled){if(q('lbgDailyExport'))q('lbgDailyExport').disabled=true;setPngEnabled(false,'Đang chờ xác nhận quyền xem lịch.')}
  }

  async function loadGroups(){
    if(groupsLoaded)return groups;
    const api=root.LBGAuth;if(!api?.client||!api?.profile)return[];
    try{const {data,error}=await api.client.rpc('report_picker_groups');if(error)throw error;groups=Array.isArray(data)?data:[];groups.sort((a,b)=>txt(a?.name).localeCompare(txt(b?.name),'vi'));groupsLoaded=true;return groups}
    catch(error){console.warn('LBG daily groups:',error);groups=[];groupsLoaded=false;return[]}
  }
  function defaultDate(){
    const today=new Date(),b=book();
    if(b&&findWeekForDate(b,today))return dateKey(today);
    const ws=b?.getWorksheet?.(selectedWeekName()),start=weekStart(ws);return dateKey(start)||dateKey(today);
  }
  function ensureStyle(){
    if(q('lbgDailyReportCss'))return;
    const s=root.document.createElement('style');s.id='lbgDailyReportCss';s.textContent=`
      #lbgDailyReportCard{margin-top:18px}.lbg-daily-controls{display:grid;grid-template-columns:minmax(110px,.55fr) minmax(150px,.8fr) minmax(118px,.58fr) minmax(150px,.78fr) minmax(105px,.5fr) max-content max-content max-content;gap:8px;align-items:end;margin-top:12px}
      .lbg-daily-controls [hidden]{display:none!important}.lbg-daily-controls label{display:grid;gap:5px;font-size:12px;font-weight:800;min-width:0}.lbg-daily-controls input,.lbg-daily-controls select{width:100%;min-width:0;padding:10px 9px;border:1px solid #eadfd8;border-radius:11px;background:#fff;color:#4b342b}.lbg-daily-controls button{white-space:nowrap;padding-left:13px;padding-right:13px}
      .lbg-daily-picker{margin-top:10px;padding:10px;border:1px solid #eadfd8;border-radius:12px;background:#fffaf7}.lbg-daily-picker-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lbg-daily-picker-head input{min-width:220px;flex:1;padding:8px 10px;border:1px solid #eadfd8;border-radius:10px}
      .lbg-daily-teachers{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px;max-height:150px;overflow:auto}.lbg-daily-teacher{display:inline-flex;gap:6px;align-items:center;padding:6px 9px;border:1px solid #eadfd8;border-radius:999px;background:#fff;font-size:12px}.lbg-daily-teacher small{color:#806b61}.lbg-daily-note{margin-top:10px;padding:9px 11px;border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff;color:#1e40af;font-size:12px}
      .lbg-daily-summary{margin:12px 0;padding:9px 11px;border:1px solid #d1fae5;border-radius:11px;background:#ecfdf5;color:#166534;font-size:12px}.lbg-daily-wrap{overflow:auto;max-width:100%;border:1px solid #eadfd8;border-radius:12px}.lbg-daily-table{border-collapse:separate;border-spacing:0;min-width:1320px;width:100%;font-family:"Times New Roman",serif}.lbg-daily-table th,.lbg-daily-table td{border-right:1px solid #777;border-bottom:1px solid #777;padding:7px;text-align:center;vertical-align:middle}.lbg-daily-table thead th{position:sticky;z-index:5;font-weight:800}.lbg-daily-table thead tr:first-child th{top:0}.lbg-daily-table thead tr:nth-child(2) th{top:44px}.lbg-daily-table .gv-head,.lbg-daily-table .gv-cell{position:sticky;left:0;z-index:7;min-width:150px;max-width:180px;background:#fff2df}.lbg-daily-table thead .gv-head{z-index:9;background:#f6c58f}.lbg-daily-table .gv-cell b{display:block;font-size:16px}.lbg-daily-table .gv-cell small{display:block;font-family:system-ui,sans-serif;color:#806b61;margin-top:2px}.lbg-daily-table .morning-head{background:#bfe3ff;color:#153a59}.lbg-daily-table .morning-period{background:#e4f4ff}.lbg-daily-table .afternoon-head{background:#ffd4b8;color:#6d3518}.lbg-daily-table .afternoon-period{background:#fff0e6}.lbg-daily-table .morning-slot{background:#f3faff;min-width:118px}.lbg-daily-table .afternoon-slot{background:#fff8f3;min-width:118px}.lbg-daily-table .total-head,.lbg-daily-table .total-cell{background:#d9efca;font-weight:800;min-width:112px}.lbg-daily-event{margin:2px 0;padding:5px 6px;border-radius:7px;background:rgba(255,255,255,.78);line-height:1.22}.lbg-daily-event span{display:block}.lbg-daily-event .meta{font-family:system-ui,sans-serif;font-size:10px;color:#806b61;margin-top:2px}.lbg-daily-empty{padding:18px;text-align:center;color:#806b61;background:#fffaf7}.lbg-daily-title{text-align:center;padding:12px 8px}.lbg-daily-title h2{margin:0;font-family:"Times New Roman",serif;font-size:22px}.lbg-daily-title p{margin:5px 0 0;color:#806b61}.lbg-week-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 12px}.lbg-week-tab{border:1px solid #d7c6bd;border-radius:999px;padding:7px 11px;background:#fff;color:#5b3828;font-weight:800;cursor:pointer}.lbg-week-tab.active{background:#f4a261;border-color:#f4a261;color:#4b342b}.lbg-week-day-label{text-align:center;font-weight:800;margin:7px 0 10px;color:#6b4a3a}
      @media(max-width:980px){.lbg-daily-controls{grid-template-columns:1fr 1fr 1fr}.lbg-daily-controls button{width:100%}}@media(max-width:700px){.lbg-daily-controls{grid-template-columns:1fr 1fr}.lbg-daily-table{min-width:1180px}.lbg-daily-table .gv-head,.lbg-daily-table .gv-cell{min-width:125px}}
    `;root.document.head.appendChild(s);
  }
  function ensureCard(){
    if(q('lbgDailyReportCard'))return q('lbgDailyReportCard');
    const anchor=q('lbgSchoolReportCard')||q('previewCard')||[...root.document.querySelectorAll('section.card')].find(x=>/Kiểm tra và lập báo giảng/i.test(txt(x.textContent)));if(!anchor?.parentNode)return null;
    ensureStyle();const card=root.document.createElement('section');card.id='lbgDailyReportCard';card.className='card';
    card.innerHTML=`<div class="head"><div><h3>📅 Lịch báo giảng theo ngày / tuần</h3><p>Chọn xem một ngày hoặc nguyên tuần; giáo viên chạy dọc, T1–T5 buổi sáng và buổi chiều chạy ngang.</p></div><span class="badge">Ngày • Tuần</span></div>
      <div id="lbgDailyPermission" class="lbg-daily-note">Đang kiểm tra quyền xem lịch…</div>
      <div class="lbg-daily-controls">
        <label>Kiểu xem<select id="lbgDailyRangeMode"><option value="day">Theo ngày</option><option value="week">Theo tuần</option></select></label>
        <label id="lbgDailyDateLabel">Ngày<input type="date" id="lbgDailyDate"></label>
        <label id="lbgDailyWeekLabel" hidden>Tuần<select id="lbgDailyWeek"><option value="">Chọn tuần…</option></select></label>
        <label>Phạm vi<select id="lbgDailyScope"><option value="teachers">Giáo viên</option><option value="group">Khối / nhóm</option></select></label>
        <label id="lbgDailyScopeTargetLabel">Chọn<select id="lbgDailyScopeTarget"><option value="">Chọn…</option></select></label>
        <label>Hiển thị<select id="lbgDailyMode"><option value="full">Đầy đủ</option><option value="compact">Gọn</option></select></label>
        <button class="btn primary" id="lbgDailyView">✓ Xem lịch</button>
        <button class="btn outline" id="lbgDailyExport" disabled>⇩ Xuất Excel</button>
        <button class="btn outline" id="lbgDailyExportPng" disabled title="Giai đoạn 1: xuất PNG cho Theo ngày">🖼 Xuất PNG</button>
      </div>
      <div id="lbgDailyTeacherPicker" class="lbg-daily-picker"></div>
      <div id="lbgDailySummary"></div>
      <div id="lbgDailyPreview"><div class="lbg-daily-empty">Chọn ngày và phạm vi rồi nhấn Xem lịch.</div></div>`;
    anchor.parentNode.insertBefore(card,anchor.nextSibling);
    bind();return card;
  }
  function currentContext(){
    const b=book();if(!b)throw new Error('Hãy mở một file TKB trước.');
    const scope=txt(q('lbgDailyScope')?.value)||'teachers',range=currentRangeMode();
    if(range==='week'){
      const name=txt(q('lbgDailyWeek')?.value);if(!name)throw new Error('Hãy chọn tuần.');
      const ws=b.getWorksheet?.(name),start=weekStart(ws);if(!ws||!start)throw new Error('Không tìm thấy tuần đã chọn trong TKB.');
      return{range,ws,start,teachers:allTeachers(ws),events:allEvents(ws,false),scope}
    }
    const d=dateFromKey(q('lbgDailyDate')?.value);if(!d)throw new Error('Hãy chọn ngày hợp lệ.');
    const found=findWeekForDate(b,d);if(!found)throw new Error(`Chưa có TKB chứa ngày ${d.toLocaleDateString('vi-VN')}.`);
    return{range,date:d,dateKey:dateKey(d),day:found.day,ws:found.ws,start:found.start,teachers:allTeachers(found.ws),events:allEvents(found.ws,false),scope};
  }
  function renderTeacherPicker(ctx){
    const box=q('lbgDailyTeacherPicker'),target=q('lbgDailyScopeTarget'),label=q('lbgDailyScopeTargetLabel');if(!box||!target||!label)return;
    if(ctx.scope==='teachers'){
      label.hidden=true;target.innerHTML='<option value="">—</option>';
      const term=fold(q('lbgDailyTeacherSearch')?.value||'');
      box.hidden=false;box.innerHTML=`<div class="lbg-daily-picker-head"><b>Chọn giáo viên</b><input id="lbgDailyTeacherSearch" placeholder="Tìm tên hoặc mã giáo viên…" value="${esc(q('lbgDailyTeacherSearch')?.value||'')}"><button class="btn outline mini" id="lbgDailySelectAll">Chọn tất cả</button><button class="btn outline mini" id="lbgDailyClearAll">Bỏ chọn</button></div><div class="lbg-daily-teachers">${ctx.teachers.filter(t=>!term||fold(t.code+' '+t.name).includes(term)).map(t=>`<label class="lbg-daily-teacher"><input type="checkbox" data-daily-teacher="${esc(t.code)}" ${manualSelected.has(t.code)?'checked':''}><b>${esc(t.code)}</b><small>${esc(t.name)}</small></label>`).join('')||'<span class="meta">Không tìm thấy giáo viên.</span>'}</div>`;
      q('lbgDailyTeacherSearch').oninput=()=>{const value=q('lbgDailyTeacherSearch').value;renderTeacherPicker(ctx);const el=q('lbgDailyTeacherSearch');if(el){el.value=value;el.focus();el.setSelectionRange(value.length,value.length)}};
      q('lbgDailySelectAll').onclick=()=>{ctx.teachers.forEach(t=>manualSelected.add(t.code));renderTeacherPicker(ctx)};
      q('lbgDailyClearAll').onclick=()=>{manualSelected.clear();renderTeacherPicker(ctx)};
      box.querySelectorAll('[data-daily-teacher]').forEach(el=>el.onchange=()=>{if(el.checked)manualSelected.add(el.dataset.dailyTeacher);else manualSelected.delete(el.dataset.dailyTeacher)});
      return;
    }
    box.hidden=true;label.hidden=false;
    label.firstChild.textContent='Khối / nhóm';
    target.innerHTML='<option value="">Chọn khối / nhóm…</option>'+groups.map(g=>`<option value="${esc(g.id)}">${esc(g.name)} (${(g.members||[]).filter(m=>txt(m?.teacher_code||m?.code)).length} GV)</option>`).join('');
  }
  function scopeCodes(ctx){
    const target=txt(q('lbgDailyScopeTarget')?.value);
    if(ctx.scope==='group'&&!target)throw new Error('Hãy chọn khối / nhóm.');
    const group=ctx.scope==='group'?groups.find(g=>String(g.id)===target):null;
    const codes=resolveScopeCodes(ctx.scope,{teachers:ctx.teachers,selectedCodes:[...manualSelected],group});
    if(!codes.length)throw new Error(ctx.scope==='teachers'?'Hãy chọn ít nhất một giáo viên.':'Khối / nhóm này chưa có giáo viên khả dụng trong tuần này.');
    return codes;
  }
  function scopeTargetText(ctx,teachers){
    return ctx.scope==='teachers'?`${teachers.length} giáo viên`:txt(groups.find(g=>String(g.id)===q('lbgDailyScopeTarget').value)?.name)
  }
  function dayData(ctx,codes,events,teachers,mode,scopeTarget,day,date){
    return{...ctx,range:'day',events,codes,teachers,mode,scopeTarget,day,date,dateKey:dateKey(date),slots:buildDailySlots(events,codes,day)}
  }
  function makeData(){
    if(!canView())throw new Error('Tài khoản này không có quyền xem lịch nhiều giáo viên.');
    const ctx=currentContext(),codes=scopeCodes(ctx),events=allEvents(ctx.ws,true),map=teacherMap(ctx.ws,events),teachers=codes.map(code=>map.get(code)||{code,name:code}),mode=txt(q('lbgDailyMode')?.value)||'full',scopeTarget=scopeTargetText(ctx,teachers);
    if(ctx.range==='week'){
      const includeSunday=events.some(e=>Number(e?.day)===8),days=weekDates(ctx.start,includeSunday).map(x=>dayData(ctx,codes,events,teachers,mode,scopeTarget,x.day,x.date));
      return{...ctx,range:'week',events,codes,teachers,mode,scopeTarget,days}
    }
    return dayData(ctx,codes,events,teachers,mode,scopeTarget,ctx.day,ctx.date)
  }
  function renderEvent(e,mode){
    const lines=eventLines(e,mode);
    return`<div class="lbg-daily-event">${lines.map((line,i)=>`<span class="${i===2?'meta':''}">${esc(line)}</span>`).join('')}</div>`;
  }
  function renderTeacherRows(d){
    return d.teachers.map(t=>{
      const s=summarizeTeacher(d.events,t.code,d.day);
      const morning=Array.from({length:PERIODS},(_,i)=>{const p=i+1,list=d.slots.get(`${t.code}|Sáng|${p}`)||[];return`<td class="morning-slot">${list.length?list.map(e=>renderEvent(e,d.mode)).join(''):'—'}</td>`}).join('');
      const afternoon=Array.from({length:PERIODS},(_,i)=>{const p=i+1,list=d.slots.get(`${t.code}|Chiều|${p}`)||[];return`<td class="afternoon-slot">${list.length?list.map(e=>renderEvent(e,d.mode)).join(''):'—'}</td>`}).join('');
      const total=`${s.main} chính${s.plus?` + ${s.plus} Cộng`:''}${s.assist?` + ${s.assist} P`:''}`;
      return`<tr><td class="gv-cell"><b>${esc(t.code)}</b><small>${esc(t.name)}</small></td>${morning}${afternoon}<td class="total-cell">${esc(total)}</td></tr>`;
    }).join('');
  }
  function tableHtml(d){
    return`<div class="lbg-daily-wrap"><table class="lbg-daily-table"><thead><tr><th class="gv-head" rowspan="2">GV</th><th class="morning-head" colspan="5">BUỔI SÁNG</th><th class="afternoon-head" colspan="5">BUỔI CHIỀU</th><th class="total-head" rowspan="2">TỔNG NGÀY</th></tr><tr class="period-row"><th class="morning-period">T1</th><th class="morning-period">T2</th><th class="morning-period">T3</th><th class="morning-period">T4</th><th class="morning-period">T5</th><th class="afternoon-period">T1</th><th class="afternoon-period">T2</th><th class="afternoon-period">T3</th><th class="afternoon-period">T4</th><th class="afternoon-period">T5</th></tr></thead><tbody>${renderTeacherRows(d)}</tbody></table></div>`
  }
  function dailyTotals(d){
    return{
      main:d.teachers.reduce((n,t)=>n+summarizeTeacher(d.events,t.code,d.day).main,0),
      plus:d.teachers.reduce((n,t)=>n+summarizeTeacher(d.events,t.code,d.day).plus,0),
      assist:d.teachers.reduce((n,t)=>n+summarizeTeacher(d.events,t.code,d.day).assist,0)
    }
  }
  function renderWeekDay(w,day){
    const preview=q('lbgDailyPreview'),d=w.days.find(x=>Number(x.day)===Number(day))||w.days[0];if(!preview||!d)return;
    preview.innerHTML=`<div class="lbg-daily-title"><h2>LỊCH BÁO GIẢNG THEO TUẦN</h2><p><b>Tuần ${esc(w.ws.name)}</b> • ${esc(w.scopeTarget)}</p></div><div class="lbg-week-tabs">${w.days.map(x=>`<button type="button" class="lbg-week-tab ${x.day===d.day?'active':''}" data-week-day="${x.day}">${esc(sheetNameForDate(x.day,x.date))}</button>`).join('')}</div><div class="lbg-week-day-label">${esc(formatDateTitle(d.date))}</div>${tableHtml(d)}`;
    preview.querySelectorAll('[data-week-day]').forEach(btn=>btn.onclick=()=>renderWeekDay(w,Number(btn.dataset.weekDay)))
  }
  function renderCurrent(){
    const preview=q('lbgDailyPreview'),summary=q('lbgDailySummary');if(!preview)return;
    try{
      const d=makeData();currentData=d;
      if(d.range==='week'){
        const totals=d.days.reduce((acc,x)=>{const t=dailyTotals(x);acc.main+=t.main;acc.plus+=t.plus;acc.assist+=t.assist;return acc},{main:0,plus:0,assist:0});
        if(summary)summary.innerHTML=`<div class="lbg-daily-summary"><b>Tuần ${esc(d.ws.name)}</b> • ${d.days.length} ngày • ${esc(d.scopeTarget)} • ${d.teachers.length} giáo viên • ${totals.main} chính${totals.plus?` • ${totals.plus} Cộng (+)`:''}${totals.assist?` • ${totals.assist} Trợ (P)`:''}</div>`;
        renderWeekDay(d,d.days[0]?.day);q('lbgDailyExport').disabled=!d.days.length;setPngEnabled(Boolean(d.days.length),'Xuất cả tuần thành 1 file ZIP, mỗi ngày 1 ảnh PNG.');return
      }
      const totals=dailyTotals(d);
      if(summary)summary.innerHTML=`<div class="lbg-daily-summary"><b>${esc(formatDateTitle(d.date))}</b> • Tuần ${esc(d.ws.name)} • ${esc(d.scopeTarget)} • ${d.teachers.length} giáo viên • ${totals.main} chính${totals.plus?` • ${totals.plus} Cộng (+)`:''}${totals.assist?` • ${totals.assist} Trợ (P)`:''}</div>`;
      preview.innerHTML=`<div class="lbg-daily-title"><h2>LỊCH BÁO GIẢNG THEO NGÀY</h2><p><b>${esc(formatDateTitle(d.date))}</b> • ${esc(d.scopeTarget)}</p></div>${tableHtml(d)}`;
      q('lbgDailyExport').disabled=false;setPngEnabled(true,'Xuất toàn bộ bảng ngày hiện tại thành 1 ảnh PNG, không phụ thuộc phần đang cuộn.');
    }catch(error){currentData=null;q('lbgDailyExport').disabled=true;setPngEnabled(false,'Chọn và xem lịch Theo ngày trước khi xuất PNG.');if(summary)summary.innerHTML='';preview.innerHTML=`<div class="lbg-daily-empty">${esc(error?.message||String(error))}</div>`}
  }
  function excelCellText(list,mode){return(list||[]).map(e=>eventLines(e,mode).join('\n')).join('\n\n')||'—'}
  function styleCell(cell,fill,bold=false,size=11){cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};cell.font={name:'Times New Roman',size,bold};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}};cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}}}
  function colLetter(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
  function addExcelSheet(out,d,sheetName='LBG THEO NGÀY'){
    const last=12,end=colLetter(last),ws=out.addWorksheet(sheetName);
    ws.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.2,right:.2,top:.35,bottom:.35,header:.1,footer:.1},printTitlesRow:'1:5',printTitlesColumn:'1:1',horizontalCentered:true};
    ws.views=[{state:'frozen',xSplit:1,ySplit:5,topLeftCell:'B6',activeCell:'B6'}];
    [`A1:${end}1`,`A2:${end}2`,`A3:${end}3`,'A4:A5','B4:F4','G4:K4','L4:L5'].forEach(r=>{try{ws.mergeCells(r)}catch{}});
    ws.getCell('A1').value='LỊCH BÁO GIẢNG THEO NGÀY';
    ws.getCell('A2').value=formatDateTitle(d.date).toUpperCase();
    ws.getCell('A3').value=`Tuần ${d.ws.name} • Phạm vi: ${d.scopeTarget} • Chế độ: ${d.mode==='full'?'Đầy đủ':'Gọn'}`;
    ws.getCell('A4').value='GV';ws.getCell('B4').value='BUỔI SÁNG';ws.getCell('G4').value='BUỔI CHIỀU';ws.getCell('L4').value='TỔNG NGÀY';
    ['T1','T2','T3','T4','T5'].forEach((v,i)=>{ws.getCell(5,i+2).value=v;ws.getCell(5,i+7).value=v});
    d.teachers.forEach((t,index)=>{
      const row=6+index;ws.getCell(row,1).value=`${t.code}\n${t.name}`;
      for(let p=1;p<=PERIODS;p++){
        ws.getCell(row,p+1).value=excelCellText(d.slots.get(`${t.code}|Sáng|${p}`)||[],d.mode);
        ws.getCell(row,p+6).value=excelCellText(d.slots.get(`${t.code}|Chiều|${p}`)||[],d.mode);
      }
      const sum=summarizeTeacher(d.events,t.code,d.day);
      ws.getCell(row,12).value=`${sum.main} chính${sum.plus?` + ${sum.plus} Cộng`:''}${sum.assist?` + ${sum.assist} P`:''}`;
    });
    ws.getColumn(1).width=20;for(let c=2;c<=11;c++)ws.getColumn(c).width=d.mode==='full'?18:16;ws.getColumn(12).width=17;
    const rows=5+d.teachers.length;
    for(let r=1;r<=rows;r++){
      ws.getRow(r).height=r===1?30:r===2?25:r===3?22:r===4?26:r===5?24:(d.mode==='full'?70:46);
      for(let c=1;c<=last;c++){
        let fill='FFFFFFFF',bold=false,size=11;
        if(r<=3){fill='FFD9EFCA';bold=true;size=r===1?18:r===2?14:11}
        else if(c===1){fill='FFFFF2DF';bold=true}
        else if(c>=2&&c<=6){fill=r===4?'FFBFE3FF':r===5?'FFE4F4FF':'FFF3FAFF';bold=r<=5}
        else if(c>=7&&c<=11){fill=r===4?'FFFFD4B8':r===5?'FFFFF0E6':'FFFFF8F3';bold=r<=5}
        else if(c===12){fill='FFD9EFCA';bold=true}
        styleCell(ws.getCell(r,c),fill,bold,size);
      }
    }
    ws.autoFilter=undefined;return ws;
  }
  async function exportCurrent(){
    if(exportBusy)return;const b=q('lbgDailyExport'),old=b?.textContent;exportBusy=true;if(b){b.disabled=true;b.textContent='Đang tạo Excel…'}
    try{
      const d=currentData||makeData();if(!root.ExcelJS||!root.saveAs)throw new Error('Thư viện xuất Excel chưa sẵn sàng.');
      const out=new root.ExcelJS.Workbook();
      if(d.range==='week'){
        for(const day of d.days)addExcelSheet(out,day,sheetNameForDate(day.day,day.date));
        const buf=await out.xlsx.writeBuffer();root.saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LBG_THEO_TUAN_${safeFile(d.ws.name)}_${safeFile(d.scopeTarget)}.xlsx`);
        if(typeof root.toast==='function')root.toast(`Đã xuất tuần ${d.ws.name}: ${d.days.length} sheet, mỗi ngày một sheet.`);return
      }
      addExcelSheet(out,d);const buf=await out.xlsx.writeBuffer();
      root.saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LBG_THEO_NGAY_${safeFile(d.dateKey)}_${safeFile(d.scopeTarget)}.xlsx`);
      if(typeof root.toast==='function')root.toast(`Đã xuất lịch ${formatDateTitle(d.date)}.`);
    }catch(error){root.alert?.('Không xuất được lịch theo ngày/tuần: '+(error?.message||String(error)))}finally{exportBusy=false;if(b){b.disabled=false;b.textContent=old||'⇩ Xuất Excel'}}
  }
  function setPngEnabled(enabled,title=''){
    const b=q('lbgDailyExportPng');if(!b)return;b.disabled=!enabled;if(title)b.title=title
  }
  function loadPngExporter(){
    if(root.LBGDailyPngExportV1)return Promise.resolve(root.LBGDailyPngExportV1);
    if(pngModulePromise)return pngModulePromise;
    pngModulePromise=new Promise((resolve,reject)=>{
      const existing=q('lbgDailyPngExportV1Script');
      const done=()=>root.LBGDailyPngExportV1?resolve(root.LBGDailyPngExportV1):reject(new Error('Bộ xuất PNG chưa khởi tạo được.'));
      if(existing){
        existing.addEventListener('load',done,{once:true});
        existing.addEventListener('error',()=>reject(new Error('Không tải được bộ xuất PNG.')),{once:true});
        return
      }
      const script=root.document.createElement('script');
      script.id='lbgDailyPngExportV1Script';
      script.src='daily-png-export-v1.js?v=20260929.3';
      script.async=true;
      script.onload=done;
      script.onerror=()=>{pngModulePromise=null;reject(new Error('Không tải được bộ xuất PNG.'))};
      root.document.body.appendChild(script)
    });
    return pngModulePromise
  }
  function pngDayNode(d){
    const node=root.document.createElement('div');
    node.className='lbg-png-day-source';
    node.innerHTML=`<div class="lbg-daily-title"><h2>LỊCH BÁO GIẢNG THEO NGÀY</h2><p><b>${esc(formatDateTitle(d.date))}</b> • Tuần ${esc(d.ws.name)} • ${esc(d.scopeTarget)}</p></div>${tableHtml(d)}`;
    return node
  }
  async function exportCurrentPng(){
    if(pngExportBusy)return;
    const b=q('lbgDailyExportPng'),old=b?.textContent;pngExportBusy=true;if(b){b.disabled=true;b.textContent='Đang tạo PNG…'}
    try{
      const d=currentData||makeData(),exporter=await loadPngExporter(),options={width:3000,preferredScale:2.5};
      if(d.range==='week'){
        if(!d.days?.length)throw new Error('Tuần này chưa có ngày để xuất PNG.');
        const zip=await exporter.createZip();
        for(let i=0;i<d.days.length;i++){
          const day=d.days[i];if(b)b.textContent=`Đang tạo ${i+1}/${d.days.length}…`;
          const result=await exporter.renderBlob(pngDayNode(day),options);
          zip.file(`${safeFile(sheetNameForDate(day.day,day.date))}.png`,result.blob)
        }
        if(b)b.textContent='Đang đóng gói ZIP…';
        const blob=await exporter.generateZip(zip),filename=`LBG_THEO_TUAN_${safeFile(d.ws.name)}_${safeFile(d.scopeTarget)}.zip`;
        exporter.downloadBlob(blob,filename);
        if(typeof root.toast==='function')root.toast(`Đã xuất ${d.days.length} ảnh PNG của tuần ${d.ws.name} trong 1 file ZIP.`);
        return
      }
      const filename=`LBG_THEO_NGAY_${safeFile(d.dateKey)}_${safeFile(d.scopeTarget)}.png`;
      const result=await exporter.exportElement(pngDayNode(d),filename,options);
      if(typeof root.toast==='function')root.toast(`Đã xuất PNG ${formatDateTitle(d.date)} • ${Math.round(result.width*result.scale)}×${Math.round(result.height*result.scale)} px.`)
    }catch(error){
      console.error('LBG PNG:',error);root.alert?.('Không xuất được PNG: '+(error?.message||String(error)))
    }finally{
      pngExportBusy=false;
      if(b){
        b.textContent=old||'🖼 Xuất PNG';
        const ready=Boolean(currentData&&(currentData.range==='day'||currentData.range==='week'));
        setPngEnabled(ready,currentData?.range==='week'?'Xuất cả tuần thành 1 file ZIP, mỗi ngày 1 ảnh PNG.':'Xuất toàn bộ bảng ngày hiện tại thành 1 ảnh PNG.')
      }
    }
  }
  function syncRangeUi(){
    const range=currentRangeMode(),dateLabel=q('lbgDailyDateLabel'),weekLabel=q('lbgDailyWeekLabel');
    if(dateLabel)dateLabel.hidden=range==='week';if(weekLabel)weekLabel.hidden=range!=='week';
    const b=book(),weekSelect=q('lbgDailyWeek');
    if(b&&weekSelect){
      const old=weekSelect.value||selectedWeekName(),list=availableWeeks(b);
      weekSelect.innerHTML=list.map(x=>`<option value="${esc(x.ws.name)}">${esc(x.ws.name)} • ${esc(x.start.toLocaleDateString('vi-VN'))}</option>`).join('')||'<option value="">Chưa có tuần</option>';
      if(old&&list.some(x=>x.ws.name===old))weekSelect.value=old
    }
  }
  async function refresh(){
    ensureCard();const note=q('lbgDailyPermission'),date=q('lbgDailyDate');if(!note||!date)return;
    const auth=root.LBGAuth,access=root.LBGAccess;
    if(!accessReady()&&!authOwner()){
      setControlsEnabled(false);
      note.textContent=auth?.profile?'Đang tải quyền xem lịch và danh sách Khối / nhóm…':'Đang kiểm tra quyền xem lịch…';
      return
    }
    if(!canView()){
      setControlsEnabled(false);
      note.innerHTML='<b>Phạm vi bảo mật:</b> Lịch theo ngày/tuần nhiều giáo viên chỉ mở cho Chủ sở hữu hoặc tài khoản được quyền kiểm tra toàn bộ báo giảng.';
      return
    }
    setControlsEnabled(true);
    if(!date.value)date.value=defaultDate();syncRangeUi();
    await loadGroups();
    note.textContent=currentRangeMode()==='week'?'Chọn nguyên tuần, sau đó chọn Giáo viên hoặc Khối / nhóm một lần. Xuất Excel: mỗi ngày một sheet. Xuất PNG: tải 1 file ZIP, mỗi ngày là 1 ảnh PNG riêng.':'Chọn một ngày cụ thể. Hệ thống tự tìm đúng sheet tuần; bạn có thể tự chọn giáo viên hoặc chọn đúng Khối / nhóm đang được quản lý trong hệ thống. Sau khi Xem lịch, có thể xuất toàn bộ bảng thành 1 ảnh PNG.';
    try{const ctx=currentContext();renderTeacherPicker(ctx)}catch(error){q('lbgDailyTeacherPicker').innerHTML=`<div class="lbg-daily-empty">${esc(error?.message||String(error))}</div>`}
  }
  function bind(){
    q('lbgDailyView').onclick=renderCurrent;q('lbgDailyExport').onclick=exportCurrent;q('lbgDailyExportPng').onclick=exportCurrentPng;
    q('lbgDailyRangeMode').onchange=()=>{currentData=null;setPngEnabled(false,'Hãy bấm Xem lịch trước khi xuất PNG.');refresh()};
    q('lbgDailyDate').onchange=()=>{currentData=null;setPngEnabled(false,'Hãy bấm Xem lịch trước khi xuất PNG.');refresh()};
    q('lbgDailyWeek').onchange=()=>{currentData=null;setPngEnabled(false,'Hãy bấm Xem lịch trước khi xuất PNG.');refresh()};
    q('lbgDailyScope').onchange=()=>{currentData=null;setPngEnabled(false,'Hãy bấm Xem lịch trước khi xuất PNG.');try{renderTeacherPicker(currentContext())}catch{}};
    q('lbgDailyScopeTarget').onchange=()=>{currentData=null;setPngEnabled(false,'Hãy bấm Xem lịch trước khi xuất PNG.')};
    q('lbgDailyMode').onchange=()=>{if(currentData)renderCurrent()};
    q('week')?.addEventListener('change',()=>{const selected=selectedWeekName(),weekly=q('lbgDailyWeek');if(weekly&&[...weekly.options].some(o=>o.value===selected))weekly.value=selected;if(!q('lbgDailyDate').value)q('lbgDailyDate').value=defaultDate()});
  }
  function install(){
    if(installed)return;installed=true;
    const start=()=>{ensureCard();refresh()};start();
    root.document.addEventListener('lbg-access-ready',()=>setTimeout(refresh,0));
    root.document.addEventListener('lbg-runtime-ready',()=>setTimeout(refresh,0));
    try{root.LBGAuth?.onReady?.(()=>setTimeout(refresh,0))}catch{}
    return true;
  }
  return{VERSION,PERIODS,DAILY_LAYOUT,dateFromKey,dateKey,dayNoForDate,formatDateTitle,gradeOfEntry,findWeekForDate,weekDates,sheetNameForDate,availableWeeks,groupCodes,resolveScopeCodes,eventSlot,buildDailySlots,schoolText,eventLines,summarizeTeacher,authOwner,accessReady,canView,loadPngExporter,install};
});
