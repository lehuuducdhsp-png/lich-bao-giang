'use strict';
(function(){
  const VERSION='20260815.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  const cfg=window.LBG_SUPABASE_CONFIG||{};
  let timer=null,applying=false,sortMode='newest';
  let rosterCache={rows:[],at:0},dashboardCache={key:'',data:null,at:0},shared={status:'idle',row:null,workbook:null,at:0};

  function auth(){return window.LBGAuth?.client||null}
  async function rpc(name,args={}){const c=auth();if(!c)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');const{data,error}=await c.rpc(name,args);if(error)throw error;return data}
  function vnParts(d=new Date()){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);return Object.fromEntries(p.map(x=>[x.type,x.value]))}
  function todayKey(){const p=vnParts();return`${p.year}-${p.month}-${p.day}`}
  function minuteNow(){const p=vnParts();return Number(p.hour)*60+Number(p.minute)}
  function normalizeSession(v){const x=fold(v);return x==='SANG'?'Sáng':x==='CHIEU'?'Chiều':'Khác'}
  function pointKey(userId,session,school){return`${userId}|${fold(session)}|${fold(school)}`}
  function fmtTime(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'}).format(d)}

  function style(){
    if(q('lbgCheckinManagerReviewUxCss'))return;
    const s=document.createElement('style');s.id='lbgCheckinManagerReviewUxCss';s.textContent=`
      .lbg-cmr-summary{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0 2px}.lbg-cmr-hint{margin-top:8px;padding:9px 11px;border:1px solid #eadfd8;border-radius:11px;background:#fffaf6;color:#765847;font-size:12px;line-height:1.5}
      .lbg-cmr-missing{display:grid;gap:9px;margin:10px 0}.lbg-cmr-missing-title{font-size:13px;font-weight:900;color:#8f5636}.lbg-cmr-missing-card{border:1px solid #fdba74;border-radius:14px;padding:11px 12px;background:#fffaf5}.lbg-cmr-missing-card.pending{border-color:#e5d8d0;background:#fff}.lbg-cmr-missing-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.lbg-cmr-missing-name{font-size:15px;font-weight:900;color:#5b3828}.lbg-cmr-missing-sub{margin-top:3px;font-size:12px;color:#806b61}.lbg-cmr-missing-state{font-size:12px;font-weight:900;color:#c2410c;text-align:right}.lbg-cmr-missing-card.pending .lbg-cmr-missing-state{color:#64748b}.lbg-cmr-school{margin-top:8px;font-size:13px;font-weight:850;color:#4b342b}.lbg-cmr-detail{margin-top:2px;font-size:12px;color:#806b61}.lbg-cmr-warning{margin-top:9px;padding:10px 11px;border-radius:11px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:12px;line-height:1.5}
      #lbgCheckinManagerSort{min-width:135px}
      @media(max-width:650px){.lbg-cmr-missing-head{display:grid}.lbg-cmr-missing-state{text-align:left}}
    `;document.head.appendChild(s);
  }

  async function loadRoster(force=false){const now=Date.now();if(!force&&rosterCache.rows.length&&now-rosterCache.at<30000)return rosterCache.rows;const rows=await rpc('checkin_review_roster');rosterCache={rows:rows||[],at:Date.now()};return rosterCache.rows}
  async function loadDashboard(date,force=false){const now=Date.now();if(!force&&dashboardCache.key===date&&dashboardCache.data&&now-dashboardCache.at<10000)return dashboardCache.data;const data=await rpc('checkin_dashboard',{p_teaching_date:date});dashboardCache={key:date,data:data||{},at:Date.now()};return dashboardCache.data}
  async function loadShared(force=false){const now=Date.now();if(!force&&shared.status==='ready'&&now-shared.at<120000)return shared;shared={status:'loading',row:null,workbook:null,at:now};try{const c=auth();const{data,error}=await c.from('tkb_files').select('id,original_name,storage_path,created_at,updated_at').eq('scope','shared').eq('status','ready').eq('is_active',true).order('updated_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(!data){shared={status:'none',row:null,workbook:null,at:Date.now()};return shared}const{data:blob,error:de}=await c.storage.from(cfg.bucket||'tkb-private').download(data.storage_path);if(de)throw de;if(!window.ExcelJS)throw new Error('ExcelJS chưa sẵn sàng.');const wb=new ExcelJS.Workbook();await wb.xlsx.load(await blob.arrayBuffer());shared={status:'ready',row:data,workbook:wb,at:Date.now()};return shared}catch(error){shared={status:'error',row:null,workbook:null,error,at:Date.now()};return shared}}

  function expectedFor(date,roster){
    const scanner=window.LBGTeacherIntelligenceV6?.scanSheet,book=shared.workbook;if(!scanner||!book)return{points:[],datePresent:false};
    const people=new Map((roster||[]).map(r=>[fold(r.teacher_code),r]).filter(([k])=>k)),map=new Map();let datePresent=false;
    for(const ws of book.worksheets||[]){let groups=[];try{groups=scanner(ws)?.groups||[]}catch{continue}for(const g of groups){if(txt(g.dateKey)!==date)continue;datePresent=true;const person=people.get(fold(g.code));if(!person)continue;const session=normalizeSession(g.session),school=txt(g.school);if(!school||!['Sáng','Chiều'].includes(session))continue;const k=pointKey(person.user_id,session,school);if(!map.has(k))map.set(k,{key:k,user_id:person.user_id,display_name:txt(person.display_name)||txt(person.username)||fold(person.teacher_code),username:txt(person.username),teacher_code:fold(person.teacher_code),group_name:txt(person.group_name),session,school_name:school,periods:new Set(),classes:new Set()});const p=map.get(k),period=Number(g.period);if(Number.isFinite(period)&&period>0)p.periods.add(period);for(const c of g.members||[])if(txt(c))p.classes.add(txt(c))}}
    const points=[...map.values()].map(p=>({...p,periods:[...p.periods].sort((a,b)=>a-b),classes:[...p.classes].sort((a,b)=>a.localeCompare(b,'vi'))}));
    return{points,datePresent};
  }

  function actualInfo(dashboard){
    const byPoint=new Map(),slots=new Map();for(const x of dashboard?.items||[]){if(!slots.has(x.slot_id))slots.set(x.slot_id,{...x,attempts:[]});if(x.checkin_id)slots.get(x.slot_id).attempts.push(x);const k=pointKey(x.user_id,x.session,x.school_name);if(!byPoint.has(k))byPoint.set(k,[]);if(x.checkin_id)byPoint.get(k).push(x)}return{byPoint,slots:[...slots.values()]};
  }
  function missingState(date,session){
    const today=todayKey();if(date>today)return{kind:'pending',label:'⏳ Chưa đến ngày Check-in'};if(date<today)return{kind:'missed',label:'❌ Không Check-in'};
    const m=minuteNow(),start=session==='Sáng'?360:720,end=session==='Sáng'?660:1020;
    if(m<start)return{kind:'pending',label:`⏳ Chưa đến giờ Check-in • mở ${session==='Sáng'?'06:00':'12:00'}`};
    if(m<=end)return{kind:'missing',label:'⚠️ Chưa Check-in'};
    return{kind:'missed',label:'❌ Không Check-in trong khung giờ'};
  }
  function pointDetail(p){const bits=[];if(p.periods.length)bits.push(`Tiết ${p.periods.join(', ')}`);if(p.classes.length)bits.push(`Lớp ${p.classes.join(', ')}`);return bits.join(' • ')||'Có lịch dạy theo TKB chung'}

  function ensureSort(toolbar){
    let label=q('lbgCheckinManagerSortLabel');if(label)return label;
    label=document.createElement('label');label.id='lbgCheckinManagerSortLabel';label.innerHTML='Sắp xếp<select id="lbgCheckinManagerSort"><option value="newest">Mới → Cũ</option><option value="oldest">Cũ → Mới</option><option value="name">Tên A → Z</option></select>';toolbar.appendChild(label);
    const sel=q('lbgCheckinManagerSort');sel.value=sortMode;sel.onchange=()=>{sortMode=sel.value||'newest';applySort()};return label;
  }
  function attemptNo(el){const m=txt(el?.querySelector('b')?.textContent||el?.textContent).match(/Lần\s+(\d+)/i);return m?Number(m[1]):0}
  function sortAttempts(card){const parent=card.querySelector('.lbg-checkin-manager-attempt')?.parentElement;if(!parent)return;const arr=[...parent.querySelectorAll(':scope > .lbg-checkin-manager-attempt')].sort((a,b)=>attemptNo(b)-attemptNo(a));for(const el of arr)parent.appendChild(el)}
  function applySort(){
    const box=q('lbgCheckinManagerResult');if(!box)return;const cards=[...box.querySelectorAll(':scope > .lbg-checkin-manager-slot')];cards.forEach(sortAttempts);
    cards.sort((a,b)=>{const na=txt(a.dataset.sortName),nb=txt(b.dataset.sortName),ta=Number(a.dataset.sortTime)||0,tb=Number(b.dataset.sortTime)||0;if(sortMode==='oldest')return ta-tb||na.localeCompare(nb,'vi');if(sortMode==='name')return na.localeCompare(nb,'vi',{sensitivity:'base'})||tb-ta;return tb-ta||na.localeCompare(nb,'vi')});
    for(const card of cards)box.appendChild(card);
  }

  function renderMissing(result,date,expected,actual,datePresent){
    q('lbgCheckinMissingExpectedV1')?.remove();q('lbgCheckinManagerSummaryV1')?.remove();q('lbgCheckinManagerRefWarnV1')?.remove();
    const missing=expected.filter(p=>(actual.byPoint.get(p.key)||[]).length===0),done=expected.length-missing.length;
    const summary=document.createElement('div');summary.id='lbgCheckinManagerSummaryV1';summary.className='lbg-cmr-summary';summary.innerHTML=`<span class="lbg-checkin-pill lbg-checkin-good">✅ Có Check-in: ${done}/${expected.length}</span><span class="lbg-checkin-pill">⚠ Chưa có Check-in: ${missing.length}</span>`;result.insertAdjacentElement('beforebegin',summary);

    if(!datePresent){const warn=document.createElement('div');warn.id='lbgCheckinManagerRefWarnV1';warn.className='lbg-cmr-warning';warn.innerHTML='<b>Không tìm thấy ngày này trong TKB chung đang áp dụng.</b> Hệ thống chỉ hiển thị các Check-in đã ghi nhận và không tự kết luận ai “Chưa Check-in” khi thiếu lịch tham chiếu.';summary.insertAdjacentElement('afterend',warn);return}
    if(!missing.length)return;

    const section=document.createElement('section');section.id='lbgCheckinMissingExpectedV1';section.className='lbg-cmr-missing';
    const ordered=missing.slice().sort((a,b)=>{const sa=missingState(date,a.session),sb=missingState(date,b.session),rank=x=>x.kind==='missed'?0:x.kind==='missing'?1:2;return rank(sa)-rank(sb)||a.display_name.localeCompare(b.display_name,'vi')||a.school_name.localeCompare(b.school_name,'vi')});
    section.innerHTML=`<div class="lbg-cmr-missing-title">Các điểm chưa có Check-in theo TKB chung</div>${ordered.map(p=>{const st=missingState(date,p.session),pending=st.kind==='pending';return`<article class="lbg-cmr-missing-card ${pending?'pending':''}"><div class="lbg-cmr-missing-head"><div><div class="lbg-cmr-missing-name">${esc(p.display_name)}${p.teacher_code?` — ${esc(p.teacher_code)}`:''}</div><div class="lbg-cmr-missing-sub">${esc(p.group_name||'Chưa phân nhóm')} • ${esc(p.session)}</div></div><div class="lbg-cmr-missing-state">${esc(st.label)}</div></div><div class="lbg-cmr-school">🏫 ${esc(p.school_name)}</div><div class="lbg-cmr-detail">${esc(pointDetail(p))} • Theo TKB chung</div></article>`}).join('')}`;
    summary.insertAdjacentElement('afterend',section);
    const empty=result.querySelector(':scope > .lbg-checkin-empty');if(empty)empty.hidden=true;
  }

  function annotateActual(result,slots){
    const cards=[...result.querySelectorAll(':scope > .lbg-checkin-manager-slot')];slots.forEach((s,i)=>{const card=cards[i];if(!card)return;const latest=Math.max(0,...(s.attempts||[]).map(a=>new Date(a.checked_at).getTime()).filter(Number.isFinite));card.dataset.sortTime=String(latest);card.dataset.sortName=txt(s.display_name||s.username);sortAttempts(card)});applySort();
  }

  async function enhance(force=false){
    if(applying)return;const input=q('lbgCheckinManagerDate'),result=q('lbgCheckinManagerResult'),toolbar=input?.closest('.lbg-checkin-toolbar');if(!input||!result||!toolbar)return;applying=true;
    try{
      style();ensureSort(toolbar);const date=input.value||todayKey();
      let roster,dashboard;try{[roster,dashboard]=await Promise.all([loadRoster(force),loadDashboard(date,force),loadShared(force)]).then(x=>[x[0],x[1]])}catch{return}
      if(shared.status!=='ready')return;
      const scan=expectedFor(date,roster),actual=actualInfo(dashboard);renderMissing(result,date,scan.points,actual,scan.datePresent);annotateActual(result,actual.slots);
      let hint=q('lbgCheckinManagerSortHintV1');if(!hint){hint=document.createElement('div');hint.id='lbgCheckinManagerSortHintV1';hint.className='lbg-cmr-hint';toolbar.insertAdjacentElement('afterend',hint)}hint.textContent='Mặc định ưu tiên dữ liệu Check-in mới nhất. Các điểm chưa Check-in vẫn được ghim phía trên để người kiểm tra dễ nhận biết và xử lý.';
      const empty=result.querySelector(':scope > .lbg-checkin-empty');if(empty&&scan.datePresent&&scan.points.length===0&&(dashboard?.items||[]).length===0){empty.hidden=false;empty.textContent='Không có giáo viên trong phạm vi có lịch Check-in theo TKB chung vào ngày này.'}
    }finally{applying=false}
  }

  function bind(){const date=q('lbgCheckinManagerDate'),refresh=q('lbgCheckinManagerRefresh');if(date&&date.dataset.cmrBound!=='1'){date.dataset.cmrBound='1';date.addEventListener('change',()=>{dashboardCache.at=0;setTimeout(()=>enhance(true),250)})}if(refresh&&refresh.dataset.cmrBound!=='1'){refresh.dataset.cmrBound='1';refresh.addEventListener('click',()=>{dashboardCache.at=0;setTimeout(()=>enhance(true),350);setTimeout(()=>enhance(true),1000)})}}
  function cycle(){bind();enhance(false).catch(console.error)}
  function start(){style();cycle();timer=setInterval(cycle,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',()=>{rosterCache.at=0;dashboardCache.at=0;shared.status='idle';setTimeout(cycle,200)});
  window.addEventListener('focus',()=>{dashboardCache.at=0;setTimeout(cycle,100)});
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  window.LBGCheckinManagerReviewUxV1={version:VERSION,refresh:()=>enhance(true),get sort(){return sortMode}};
})();
