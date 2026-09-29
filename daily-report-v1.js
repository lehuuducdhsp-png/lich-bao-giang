'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGDailyReportV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260929.1';
  const PERIODS=5;
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  const q=id=>root.document?.getElementById(id)||null;
  const safeFile=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'NGAY';
  const dayNames={2:'Thứ Hai',3:'Thứ Ba',4:'Thứ Tư',5:'Thứ Năm',6:'Thứ Sáu',7:'Thứ Bảy',8:'Chủ Nhật'};
  let installed=false,currentData=null,groups=[],groupsLoaded=false,exportBusy=false;
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
  function resolveScopeCodes(scope,{teachers=[],events=[],day=0,selectedCodes=[],grade=0,group=null}={}){
    const available=new Set(teachers.map(x=>txt(x?.code).toUpperCase()).filter(Boolean));
    if(scope==='group')return groupCodes(group,available);
    if(scope==='grade'){
      const found=new Set();
      for(const e of events||[])if(Number(e?.day)===Number(day)&&gradeOfEntry(e)===Number(grade)){const code=txt(e?.code).toUpperCase();if(available.has(code))found.add(code)}
      return[...found];
    }
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
  function schoolText(e){return txt(e?.locationLabel||e?.schoolName||e?.school).split(/\n/).filter(Boolean).join(' • ')||'Chưa xác định trường'}
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
  function canView(){const a=root.LBGAccess;return Boolean(a&&(a.isOwner?.()||a.canReviewAllReports?.()))}

  async function loadGroups(){
    if(groupsLoaded)return groups;
    const api=root.LBGAuth;if(!api?.client)return[];
    try{const {data,error}=await api.client.rpc('report_picker_groups');if(error)throw error;groups=Array.isArray(data)?data:[];groups.sort((a,b)=>txt(a?.name).localeCompare(txt(b?.name),'vi'));groupsLoaded=true;return groups}
    catch(error){console.warn('LBG daily groups:',error);groups=[];groupsLoaded=true;return[]}
  }
  function defaultDate(){
    const today=new Date(),b=book();
    if(b&&findWeekForDate(b,today))return dateKey(today);
    const ws=b?.getWorksheet?.(selectedWeekName()),start=weekStart(ws);return dateKey(start)||dateKey(today);
  }
  function ensureStyle(){
    if(q('lbgDailyReportCss'))return;
    const s=root.document.createElement('style');s.id='lbgDailyReportCss';s.textContent=`
      #lbgDailyReportCard{margin-top:18px}.lbg-daily-controls{display:grid;grid-template-columns:minmax(170px,.8fr) minmax(150px,.7fr) minmax(250px,1.2fr) minmax(150px,.65fr) auto auto;gap:9px;align-items:end;margin-top:12px}
      .lbg-daily-controls label{display:grid;gap:5px;font-size:12px;font-weight:800}.lbg-daily-controls input,.lbg-daily-controls select{width:100%;padding:10px 11px;border:1px solid #eadfd8;border-radius:11px;background:#fff;color:#4b342b}
      .lbg-daily-picker{margin-top:10px;padding:10px;border:1px solid #eadfd8;border-radius:12px;background:#fffaf7}.lbg-daily-picker-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lbg-daily-picker-head input{min-width:220px;flex:1;padding:8px 10px;border:1px solid #eadfd8;border-radius:10px}
      .lbg-daily-teachers{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px;max-height:150px;overflow:auto}.lbg-daily-teacher{display:inline-flex;gap:6px;align-items:center;padding:6px 9px;border:1px solid #eadfd8;border-radius:999px;background:#fff;font-size:12px}.lbg-daily-teacher small{color:#806b61}.lbg-daily-note{margin-top:10px;padding:9px 11px;border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff;color:#1e40af;font-size:12px}
      .lbg-daily-summary{margin:12px 0;padding:9px 11px;border:1px solid #d1fae5;border-radius:11px;background:#ecfdf5;color:#166534;font-size:12px}.lbg-daily-wrap{overflow:auto;max-width:100%;border:1px solid #eadfd8;border-radius:12px}.lbg-daily-table{border-collapse:separate;border-spacing:0;min-width:max-content;width:100%;font-family:"Times New Roman",serif}.lbg-daily-table th,.lbg-daily-table td{border-right:1px solid #777;border-bottom:1px solid #777;padding:7px;text-align:center;vertical-align:middle;background:#fff}.lbg-daily-table thead th{position:sticky;top:0;z-index:5;background:#f6c9ae;font-weight:800}.lbg-daily-table .sticky-a{position:sticky;left:0;z-index:6;min-width:88px;background:#f6c9ae}.lbg-daily-table .sticky-b{position:sticky;left:88px;z-index:6;min-width:76px;background:#f6c9ae}.lbg-daily-table thead .sticky-a,.lbg-daily-table thead .sticky-b{z-index:8}.lbg-daily-table .teacher-head{min-width:190px;max-width:235px}.lbg-daily-table .teacher-head small{display:block;font-family:system-ui,sans-serif;font-weight:500;color:#806b61;margin-top:2px}.lbg-daily-table .slot{min-width:190px;max-width:235px;background:#eef9f0}.lbg-daily-event{margin:2px 0;padding:5px 6px;border-radius:7px;background:rgba(255,255,255,.72);line-height:1.25}.lbg-daily-event span{display:block}.lbg-daily-event .meta{font-family:system-ui,sans-serif;font-size:10px;color:#806b61;margin-top:2px}.lbg-daily-session{font-weight:800}.lbg-daily-total td{font-weight:800;background:#b9e6a5}.lbg-daily-empty{padding:18px;text-align:center;color:#806b61;background:#fffaf7}.lbg-daily-title{text-align:center;padding:12px 8px}.lbg-daily-title h2{margin:0;font-family:"Times New Roman",serif;font-size:22px}.lbg-daily-title p{margin:5px 0 0;color:#806b61}
      @media(max-width:1100px){.lbg-daily-controls{grid-template-columns:1fr 1fr 1fr}.lbg-daily-controls button{width:100%}}@media(max-width:700px){.lbg-daily-controls{grid-template-columns:1fr 1fr}.lbg-daily-table .teacher-head,.lbg-daily-table .slot{min-width:170px}.lbg-daily-table .sticky-a{min-width:76px}.lbg-daily-table .sticky-b{left:76px;min-width:66px}}
    `;root.document.head.appendChild(s);
  }
  function ensureCard(){
    if(q('lbgDailyReportCard'))return q('lbgDailyReportCard');
    const anchor=q('lbgSchoolReportCard')||q('previewCard')||[...root.document.querySelectorAll('section.card')].find(x=>/Kiểm tra và lập báo giảng/i.test(txt(x.textContent)));if(!anchor?.parentNode)return null;
    ensureStyle();const card=root.document.createElement('section');card.id='lbgDailyReportCard';card.className='card';
    card.innerHTML=`<div class="head"><div><h3>📅 Lịch báo giảng theo ngày</h3><p>Xem một ngày cụ thể theo giáo viên, khối lớp hoặc nhóm; giáo viên trải ngang từ trái sang phải.</p></div><span class="badge">1 ngày • nhiều GV</span></div>
      <div id="lbgDailyPermission" class="lbg-daily-note">Đang kiểm tra quyền xem lịch…</div>
      <div class="lbg-daily-controls">
        <label>Ngày<input type="date" id="lbgDailyDate"></label>
        <label>Phạm vi<select id="lbgDailyScope"><option value="teachers">Giáo viên</option><option value="grade">Khối lớp</option><option value="group">Nhóm</option></select></label>
        <label id="lbgDailyScopeTargetLabel">Chọn<select id="lbgDailyScopeTarget"><option value="">Chọn…</option></select></label>
        <label>Hiển thị<select id="lbgDailyMode"><option value="full">Đầy đủ</option><option value="compact">Gọn</option></select></label>
        <button class="btn primary" id="lbgDailyView">✓ Xem lịch</button>
        <button class="btn outline" id="lbgDailyExport" disabled>⇩ Xuất Excel</button>
      </div>
      <div id="lbgDailyTeacherPicker" class="lbg-daily-picker"></div>
      <div id="lbgDailySummary"></div>
      <div id="lbgDailyPreview"><div class="lbg-daily-empty">Chọn ngày và phạm vi rồi nhấn Xem lịch.</div></div>`;
    anchor.parentNode.insertBefore(card,anchor.nextSibling);
    bind();return card;
  }
  function currentContext(){
    const d=dateFromKey(q('lbgDailyDate')?.value);if(!d)throw new Error('Hãy chọn ngày hợp lệ.');
    const b=book();if(!b)throw new Error('Hãy mở một file TKB trước.');
    const found=findWeekForDate(b,d);if(!found)throw new Error(`Chưa có TKB chứa ngày ${d.toLocaleDateString('vi-VN')}.`);
    const teachers=allTeachers(found.ws),events=allEvents(found.ws,false),scope=txt(q('lbgDailyScope')?.value)||'teachers';
    return{date:d,dateKey:dateKey(d),day:found.day,ws:found.ws,teachers,events,scope};
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
    if(ctx.scope==='grade'){
      label.firstChild.textContent='Khối lớp';target.innerHTML='<option value="">Chọn khối…</option>'+[1,2,3,4,5].map(n=>`<option value="${n}">Khối ${n}</option>`).join('');
      return;
    }
    label.firstChild.textContent='Nhóm';target.innerHTML='<option value="">Chọn nhóm…</option>'+groups.map(g=>`<option value="${esc(g.id)}">${esc(g.name)} (${(g.members||[]).filter(m=>txt(m?.teacher_code||m?.code)).length} GV)</option>`).join('');
  }
  function scopeCodes(ctx){
    const target=txt(q('lbgDailyScopeTarget')?.value);
    if(ctx.scope==='grade'&&!target)throw new Error('Hãy chọn khối lớp.');
    if(ctx.scope==='group'&&!target)throw new Error('Hãy chọn nhóm.');
    const group=ctx.scope==='group'?groups.find(g=>String(g.id)===target):null;
    const codes=resolveScopeCodes(ctx.scope,{teachers:ctx.teachers,events:ctx.events,day:ctx.day,selectedCodes:[...manualSelected],grade:Number(target),group});
    if(!codes.length)throw new Error(ctx.scope==='teachers'?'Hãy chọn ít nhất một giáo viên.':'Không có giáo viên phù hợp với phạm vi đã chọn trong tuần này.');
    return codes;
  }
  function makeData(){
    if(!canView())throw new Error('Tài khoản này không có quyền xem lịch nhiều giáo viên.');
    const ctx=currentContext(),codes=scopeCodes(ctx),events=allEvents(ctx.ws,true),map=teacherMap(ctx.ws,events),teachers=codes.map(code=>map.get(code)||{code,name:code}),slots=buildDailySlots(events,codes,ctx.day),mode=txt(q('lbgDailyMode')?.value)||'full';
    const scopeTarget=ctx.scope==='teachers'?`${teachers.length} giáo viên`:ctx.scope==='grade'?`Khối ${q('lbgDailyScopeTarget').value}`:txt(groups.find(g=>String(g.id)===q('lbgDailyScopeTarget').value)?.name);
    return{...ctx,events,codes,teacherMap:map,teachers,slots,mode,scopeTarget};
  }
  function renderEvent(e,mode){
    const lines=eventLines(e,mode);
    return`<div class="lbg-daily-event">${lines.map((line,i)=>`<span class="${i===2?'meta':''}">${esc(line)}</span>`).join('')}</div>`;
  }
  function renderRows(d){
    let html='';
    for(const session of ['Sáng','Chiều']){
      for(let p=1;p<=PERIODS;p++){
        html+=`<tr>${p===1?`<td class="sticky-a lbg-daily-session" rowspan="${PERIODS}">${session}</td>`:''}<td class="sticky-b"><b>Tiết ${p}</b></td>${d.teachers.map(t=>{const list=d.slots.get(`${t.code}|${session}|${p}`)||[];return`<td class="slot">${list.length?list.map(e=>renderEvent(e,d.mode)).join(''):'—'}</td>`}).join('')}</tr>`;
      }
    }
    return html;
  }
  function renderCurrent(){
    const preview=q('lbgDailyPreview'),summary=q('lbgDailySummary');if(!preview)return;
    try{
      const d=makeData();currentData=d;
      const totalMain=d.teachers.reduce((n,t)=>n+summarizeTeacher(d.events,t.code,d.day).main,0),totalPlus=d.teachers.reduce((n,t)=>n+summarizeTeacher(d.events,t.code,d.day).plus,0),totalAssist=d.teachers.reduce((n,t)=>n+summarizeTeacher(d.events,t.code,d.day).assist,0);
      if(summary)summary.innerHTML=`<div class="lbg-daily-summary"><b>${esc(formatDateTitle(d.date))}</b> • Tuần ${esc(d.ws.name)} • ${esc(d.scopeTarget)} • ${d.teachers.length} cột giáo viên • ${totalMain} chính${totalPlus?` • ${totalPlus} Cộng (+)`:''}${totalAssist?` • ${totalAssist} Trợ (P)`:''}</div>`;
      const totals=d.teachers.map(t=>{const s=summarizeTeacher(d.events,t.code,d.day);return`<td>${s.main} chính${s.plus?` + ${s.plus} Cộng`:''}${s.assist?` + ${s.assist} P`:''}</td>`}).join('');
      preview.innerHTML=`<div class="lbg-daily-title"><h2>LỊCH BÁO GIẢNG THEO NGÀY</h2><p><b>${esc(formatDateTitle(d.date))}</b> • ${esc(d.scopeTarget)}</p></div><div class="lbg-daily-wrap"><table class="lbg-daily-table"><thead><tr><th class="sticky-a">Buổi</th><th class="sticky-b">Tiết</th>${d.teachers.map(t=>`<th class="teacher-head">${esc(t.code)}<small>${esc(t.name)}</small></th>`).join('')}</tr></thead><tbody>${renderRows(d)}<tr class="lbg-daily-total"><td class="sticky-a" colspan="2">TỔNG NGÀY</td>${totals}</tr></tbody></table></div>`;
      q('lbgDailyExport').disabled=false;
    }catch(error){currentData=null;q('lbgDailyExport').disabled=true;if(summary)summary.innerHTML='';preview.innerHTML=`<div class="lbg-daily-empty">${esc(error?.message||String(error))}</div>`}
  }
  function excelCellText(list,mode){return(list||[]).map(e=>eventLines(e,mode).join('\n')).join('\n\n')||'—'}
  function styleCell(cell,fill,bold=false,size=11){cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};cell.font={name:'Times New Roman',size,bold};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}};cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}}}
  function colLetter(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
  function addExcelSheet(out,d){
    const last=2+d.teachers.length,end=colLetter(last),ws=out.addWorksheet('LBG THEO NGÀY');
    ws.pageSetup={orientation:'landscape',paperSize:9,fitToPage:false,scale:d.teachers.length<=6?90:75,margins:{left:.2,right:.2,top:.35,bottom:.35,header:.1,footer:.1},printTitlesRow:'1:4',printTitlesColumn:'1:2',horizontalCentered:true};
    ws.views=[{state:'frozen',xSplit:2,ySplit:4,topLeftCell:'C5',activeCell:'C5'}];
    [`A1:${end}1`,`A2:${end}2`,`A3:${end}3`,`A5:A9`,`A10:A14`,`A15:B15`].forEach(r=>{try{ws.mergeCells(r)}catch{}});
    ws.getCell('A1').value='LỊCH BÁO GIẢNG THEO NGÀY';ws.getCell('A2').value=formatDateTitle(d.date).toUpperCase();ws.getCell('A3').value=`Tuần ${d.ws.name} • Phạm vi: ${d.scopeTarget} • Chế độ: ${d.mode==='full'?'Đầy đủ':'Gọn'}`;
    ws.getRow(4).values=['Buổi','Tiết',...d.teachers.map(t=>`${t.code}\n${t.name}`)];
    let row=5;
    for(const session of ['Sáng','Chiều']){
      ws.getCell(row,1).value=session;
      for(let p=1;p<=PERIODS;p++,row++){
        ws.getCell(row,2).value=`Tiết ${p}`;
        d.teachers.forEach((t,i)=>{ws.getCell(row,i+3).value=excelCellText(d.slots.get(`${t.code}|${session}|${p}`)||[],d.mode)});
      }
    }
    ws.getCell('A15').value='TỔNG NGÀY';
    d.teachers.forEach((t,i)=>{const s=summarizeTeacher(d.events,t.code,d.day);ws.getCell(15,i+3).value=`${s.main} chính${s.plus?` + ${s.plus} Cộng`:''}${s.assist?` + ${s.assist} P`:''}`});
    ws.getColumn(1).width=10;ws.getColumn(2).width=10;for(let c=3;c<=last;c++)ws.getColumn(c).width=d.mode==='full'?25:22;
    for(let r=1;r<=15;r++){ws.getRow(r).height=r===1?30:r===2?25:r===3?22:r===4?38:r===15?28:(d.mode==='full'?62:42);for(let c=1;c<=last;c++){const fill=r<=3||r===15?'FFB9E6A5':r===4||c<=2?'FFF6C9AE':'FFEEF9F0';styleCell(ws.getCell(r,c),fill,r<=4||r===15,r===1?18:r===2?14:11)}}
    ws.autoFilter=undefined;return ws;
  }
  async function exportCurrent(){
    if(exportBusy)return;const b=q('lbgDailyExport'),old=b?.textContent;exportBusy=true;if(b){b.disabled=true;b.textContent='Đang tạo Excel…'}
    try{
      const d=currentData||makeData();if(!root.ExcelJS||!root.saveAs)throw new Error('Thư viện xuất Excel chưa sẵn sàng.');
      const out=new root.ExcelJS.Workbook();addExcelSheet(out,d);const buf=await out.xlsx.writeBuffer();
      root.saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LBG_THEO_NGAY_${safeFile(d.dateKey)}_${safeFile(d.scopeTarget)}.xlsx`);
      if(typeof root.toast==='function')root.toast(`Đã xuất lịch ${formatDateTitle(d.date)}.`);
    }catch(error){root.alert?.('Không xuất được lịch theo ngày: '+(error?.message||String(error)))}finally{exportBusy=false;if(b){b.disabled=false;b.textContent=old||'⇩ Xuất Excel'}}
  }
  async function refresh(){
    ensureCard();const note=q('lbgDailyPermission'),date=q('lbgDailyDate');if(!note||!date)return;
    if(!root.LBGAccess){note.textContent='Đang kiểm tra quyền xem lịch…';return}
    if(!canView()){note.innerHTML='<b>Phạm vi bảo mật:</b> Lịch theo ngày nhiều giáo viên chỉ mở cho Chủ sở hữu hoặc tài khoản được quyền kiểm tra toàn bộ báo giảng.';['lbgDailyDate','lbgDailyScope','lbgDailyScopeTarget','lbgDailyMode','lbgDailyView'].forEach(id=>{if(q(id))q(id).disabled=true});return}
    if(!date.value)date.value=defaultDate();
    await loadGroups();
    note.textContent='Chọn một ngày cụ thể. Hệ thống tự tìm đúng sheet tuần, sau đó có thể chọn giáo viên, khối lớp hoặc nhóm. Khi nhiều giáo viên, bảng cuộn ngang nhưng cột Buổi/Tiết và tiêu đề giáo viên luôn được giữ cố định.';
    try{const ctx=currentContext();renderTeacherPicker(ctx)}catch(error){q('lbgDailyTeacherPicker').innerHTML=`<div class="lbg-daily-empty">${esc(error?.message||String(error))}</div>`}
  }
  function bind(){
    q('lbgDailyView').onclick=renderCurrent;q('lbgDailyExport').onclick=exportCurrent;
    q('lbgDailyDate').onchange=()=>{currentData=null;refresh()};
    q('lbgDailyScope').onchange=()=>{currentData=null;try{renderTeacherPicker(currentContext())}catch{}};
    q('lbgDailyScopeTarget').onchange=()=>{currentData=null};
    q('lbgDailyMode').onchange=()=>{if(currentData)renderCurrent()};
    q('week')?.addEventListener('change',()=>{if(!q('lbgDailyDate').value)q('lbgDailyDate').value=defaultDate()});
  }
  function install(){
    if(installed)return;installed=true;
    const start=()=>{ensureCard();refresh()};start();
    root.document.addEventListener('lbg-access-ready',()=>setTimeout(refresh,0));
    root.document.addEventListener('lbg-runtime-ready',()=>setTimeout(refresh,0));
    return true;
  }
  return{VERSION,PERIODS,dateFromKey,dateKey,dayNoForDate,formatDateTitle,gradeOfEntry,findWeekForDate,groupCodes,resolveScopeCodes,eventSlot,buildDailySlots,eventLines,summarizeTeacher,install};
});
