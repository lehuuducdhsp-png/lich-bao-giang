'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const cfg=window.LBG_SUPABASE_CONFIG||{};
  const VERSION='20260812.1';
  let auth=null,gate=null,roster=[],dashboard=null,observer=null,retryTimer=null,autoTimer=null,loading=false,started=false;
  let shared={status:'idle',row:null,workbook:null,error:null,loadedAt:0};

  function vnDateKey(date=new Date()){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const m=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${m.year}-${m.month}-${m.day}`;
  }
  function vnDateLabel(){return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}
  function vnMinutes(){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',hour12:false,hour:'2-digit',minute:'2-digit'}).formatToParts(new Date());
    const m=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return Number(m.hour)*60+Number(m.minute);
  }
  function fmtTime(value){
    if(!value)return'';
    const d=new Date(value);if(Number.isNaN(d.getTime()))return'';
    return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function normalizeSession(v){const x=fold(v);if(x==='SANG')return'Sáng';if(x==='CHIEU')return'Chiều';return'Khác'}
  function pointKey(userId,session,school){return `${userId}|${fold(session)}|${fold(school)}`}
  async function rpc(name,args={}){const api=auth||window.LBGAuth;if(!api?.client)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');const{data,error}=await api.client.rpc(name,args);if(error)throw error;return data}

  function style(){
    if(q('lbgCheckinDailyMonitorCss'))return;
    const s=document.createElement('style');s.id='lbgCheckinDailyMonitorCss';s.textContent=`
      #lbgCheckinDailyMonitor{grid-column:1/-1;border:1px solid #ecd8ca;border-radius:18px;padding:16px;background:#fffdfb;box-shadow:0 8px 24px rgba(91,56,40,.05)}
      .lbg-cdm-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.lbg-cdm-head h4{margin:0;color:#5b3828;font-size:19px}.lbg-cdm-head p{margin:5px 0 0;color:#806b61;font-size:13.5px;line-height:1.55}.lbg-cdm-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.lbg-cdm-today{font-size:13px;font-weight:800;color:#8f5636;background:#fff4eb;border:1px solid #f2d4bf;border-radius:999px;padding:7px 10px}
      .lbg-cdm-note{margin-top:11px;padding:10px 12px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-size:13px;line-height:1.55}.lbg-cdm-note b{font-weight:900}
      .lbg-cdm-sessions{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.lbg-cdm-session{border:1px solid #eadfd8;border-radius:16px;background:#fff;overflow:hidden}.lbg-cdm-session-head{padding:13px 14px;background:#fff8f2;border-bottom:1px solid #efe0d6;display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.lbg-cdm-session-head h5{margin:0;color:#5b3828;font-size:17px}.lbg-cdm-session-head p{margin:3px 0 0;color:#806b61;font-size:12.5px}.lbg-cdm-window{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:11.5px;font-weight:900;white-space:nowrap;background:#f8fafc;color:#64748b;border:1px solid #e2e8f0}.lbg-cdm-window.live{background:#ecfdf5;color:#166534;border-color:#bbf7d0}.lbg-cdm-window.done{background:#fff7ed;color:#9a3412;border-color:#fed7aa}
      .lbg-cdm-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:11px 14px;border-bottom:1px solid #f1e8e2}.lbg-cdm-stat{border-radius:12px;padding:9px 10px;background:#fffaf6;border:1px solid #f0e2d9}.lbg-cdm-stat b{display:block;font-size:18px;color:#5b3828}.lbg-cdm-stat span{display:block;margin-top:2px;font-size:11.5px;color:#806b61;font-weight:700}.lbg-cdm-stat.ok{background:#f0fdf4;border-color:#bbf7d0}.lbg-cdm-stat.ok b{color:#166534}.lbg-cdm-stat.miss{background:#fff7ed;border-color:#fed7aa}.lbg-cdm-stat.miss b{color:#9a3412}
      .lbg-cdm-list{display:grid;gap:9px;padding:12px}.lbg-cdm-teacher{border:1px solid #eadfd8;border-radius:14px;padding:11px 12px;background:#fff}.lbg-cdm-teacher.missing{border-color:#fdba74;background:#fffaf5}.lbg-cdm-teacher-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.lbg-cdm-name{font-size:15.5px;font-weight:900;color:#5b3828}.lbg-cdm-sub{margin-top:2px;font-size:12.5px;color:#806b61}.lbg-cdm-status{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:11.5px;font-weight:900;background:#ecfdf5;color:#166534;white-space:nowrap}.lbg-cdm-status.missing{background:#fff1e6;color:#9a3412}.lbg-cdm-points{display:grid;gap:6px;margin-top:9px}.lbg-cdm-point{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 9px;border-radius:10px;background:#fafafa;border:1px solid #eee8e4}.lbg-cdm-point.missing{background:#fff7ed;border-color:#fed7aa}.lbg-cdm-school{font-size:13.5px;font-weight:850;color:#4b342b}.lbg-cdm-detail{font-size:12px;color:#806b61;margin-top:2px}.lbg-cdm-point-state{font-size:12px;font-weight:900;color:#166534;white-space:nowrap}.lbg-cdm-point-state.missing{color:#c2410c}.lbg-cdm-empty{padding:18px;text-align:center;color:#806b61;font-size:13px}.lbg-cdm-error{margin-top:12px;padding:11px 12px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:13px;line-height:1.5}.lbg-cdm-source{margin-top:10px;color:#806b61;font-size:11.5px}
      @media(max-width:980px){.lbg-cdm-sessions{grid-template-columns:1fr}}
      @media(max-width:650px){#lbgCheckinDailyMonitor{padding:12px}.lbg-cdm-summary{grid-template-columns:1fr 1fr 1fr;padding:9px}.lbg-cdm-stat{padding:8px}.lbg-cdm-stat b{font-size:16px}.lbg-cdm-stat span{font-size:10.5px}.lbg-cdm-teacher-head,.lbg-cdm-point{grid-template-columns:1fr}.lbg-cdm-teacher-head{display:grid}.lbg-cdm-status,.lbg-cdm-point-state{justify-self:start}.lbg-cdm-head h4{font-size:17px}}
    `;document.head.appendChild(s)
  }

  function windowState(session){
    const m=vnMinutes();
    if(session==='Sáng'){
      if(m<360)return{label:'Chưa đến 06:00',className:''};
      if(m<=660)return{label:'Đang theo dõi • 06:00–11:00',className:'live'};
      return{label:'Đã qua 11:00',className:'done'};
    }
    if(m<720)return{label:'Chưa đến 12:00',className:''};
    if(m<=1020)return{label:'Đang theo dõi • 12:00–17:00',className:'live'};
    return{label:'Đã qua 17:00',className:'done'};
  }

  async function loadSharedTimetable(force=false){
    const now=Date.now();if(!force&&shared.status==='ready'&&now-shared.loadedAt<300000)return shared;
    shared={status:'loading',row:null,workbook:null,error:null,loadedAt:now};
    try{
      const api=auth||window.LBGAuth;if(!api?.client)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');
      const{data,error}=await api.client.from('tkb_files').select('id,original_name,storage_path,created_at,updated_at').eq('scope','shared').eq('status','ready').eq('is_active',true).order('updated_at',{ascending:false}).limit(1).maybeSingle();
      if(error)throw error;if(!data){shared={status:'none',row:null,workbook:null,error:null,loadedAt:Date.now()};return shared}
      if(!window.ExcelJS)throw new Error('Thư viện Excel chưa sẵn sàng.');
      const{data:blob,error:downloadError}=await api.client.storage.from(cfg.bucket||'tkb-private').download(data.storage_path);if(downloadError)throw downloadError;
      const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await blob.arrayBuffer());
      shared={status:'ready',row:data,workbook,error:null,loadedAt:Date.now()};return shared;
    }catch(error){shared={status:'error',row:null,workbook:null,error,loadedAt:Date.now()};return shared}
  }

  function eligibleRoster(){return roster.filter(r=>Boolean(r.can_checkin)&&!r.is_group_leader&&txt(r.teacher_code))}
  function scanExpected(){
    const book=shared.workbook,scanner=window.LBGTeacherIntelligenceV6?.scanSheet,date=vnDateKey();
    if(shared.status!=='ready'||!book||!scanner)return[];
    const byCode=new Map();for(const r of eligibleRoster()){const c=fold(r.teacher_code);if(c&&!byCode.has(c))byCode.set(c,r)}
    const points=new Map();
    for(const ws of book.worksheets||[]){
      let groups=[];try{groups=scanner(ws)?.groups||[]}catch{continue}
      for(const g of groups){
        const person=byCode.get(fold(g.code));if(!person||txt(g.dateKey)!==date)continue;
        const session=normalizeSession(g.session);if(!['Sáng','Chiều'].includes(session))continue;
        const school=txt(g.school);if(!school)continue;
        const key=pointKey(person.user_id,session,school);
        if(!points.has(key))points.set(key,{key,user_id:person.user_id,display_name:txt(person.display_name)||txt(person.username)||fold(person.teacher_code),username:txt(person.username),teacher_code:fold(person.teacher_code),group_name:txt(person.group_name)||txt(person.bucket_name),session,school_name:school,periods:new Set(),classes:new Set(),sheets:new Set()});
        const p=points.get(key);const period=Number(g.period);if(Number.isFinite(period)&&period>0)p.periods.add(period);for(const c of g.members||[])if(txt(c))p.classes.add(txt(c));if(txt(g.sheet))p.sheets.add(txt(g.sheet));
      }
    }
    return[...points.values()].map(p=>({...p,periods:[...p.periods].sort((a,b)=>a-b),classes:[...p.classes],sheets:[...p.sheets]}));
  }

  function actualMap(){
    const map=new Map();for(const x of dashboard?.items||[]){const key=pointKey(x.user_id,x.session,x.school_name);if(!map.has(key))map.set(key,[]);if(x.checkin_id)map.get(key).push(x)}return map;
  }
  function enrich(points){
    const actual=actualMap();return points.map(p=>{const a=actual.get(p.key)||[];const checked=a.length>0;const first=a.slice().sort((x,y)=>new Date(x.checked_at)-new Date(y.checked_at))[0];return{...p,checked,checked_at:first?.checked_at||null,attempt_count:a.length}})
  }
  function groupTeachers(points,session){
    const map=new Map();for(const p of points.filter(x=>x.session===session)){if(!map.has(p.user_id))map.set(p.user_id,{user_id:p.user_id,display_name:p.display_name,username:p.username,teacher_code:p.teacher_code,group_name:p.group_name,points:[]});map.get(p.user_id).points.push(p)}
    const arr=[...map.values()].map(t=>{t.points.sort((a,b)=>Number(a.checked)-Number(b.checked)||a.school_name.localeCompare(b.school_name,'vi'));t.done=t.points.filter(p=>p.checked).length;t.total=t.points.length;t.missing=t.total-t.done;return t});
    return arr.sort((a,b)=>Number(a.missing===0)-Number(b.missing===0)||b.missing-a.missing||a.display_name.localeCompare(b.display_name,'vi'));
  }
  function periodsText(p){return p.periods.length?`Tiết ${p.periods.join(', ')}`:'Có lịch dạy'}
  function renderTeacher(t){
    const missing=t.missing>0;return`<article class="lbg-cdm-teacher ${missing?'missing':''}"><div class="lbg-cdm-teacher-head"><div><div class="lbg-cdm-name">${esc(t.display_name)}</div><div class="lbg-cdm-sub">${esc(t.teacher_code)}${t.group_name?` • ${esc(t.group_name)}`:''}</div></div><span class="lbg-cdm-status ${missing?'missing':''}">${missing?'⚠️':'✅'} ${t.done}/${t.total} điểm đã Check-in</span></div><div class="lbg-cdm-points">${t.points.map(p=>`<div class="lbg-cdm-point ${p.checked?'':'missing'}"><div><div class="lbg-cdm-school">🏫 ${esc(p.school_name)}</div><div class="lbg-cdm-detail">${esc(periodsText(p))}${p.classes.length?` • ${esc(p.classes.join(', '))}`:''}</div></div><div class="lbg-cdm-point-state ${p.checked?'':'missing'}">${p.checked?`✅ Đã Check-in${p.checked_at?` • ${esc(fmtTime(p.checked_at))}`:''}`:'⚠️ Chưa Check-in'}</div></div>`).join('')}</div></article>`}
  function renderSession(session,points){
    const teachers=groupTeachers(points,session),sessionPoints=points.filter(x=>x.session===session),done=sessionPoints.filter(x=>x.checked).length,total=sessionPoints.length,missing=total-done,state=windowState(session),range=session==='Sáng'?'06:00–11:00':'12:00–17:00';
    return`<section class="lbg-cdm-session"><div class="lbg-cdm-session-head"><div><h5>${session==='Sáng'?'🌤️':'🌇'} Buổi ${session.toLowerCase()} hôm nay</h5><p>Khung theo dõi ${range} • 1 trường trong buổi = 1 điểm cần Check-in</p></div><span class="lbg-cdm-window ${state.className}">${esc(state.label)}</span></div><div class="lbg-cdm-summary"><div class="lbg-cdm-stat"><b>${total}</b><span>Tổng điểm dạy</span></div><div class="lbg-cdm-stat ok"><b>${done}</b><span>Đã Check-in</span></div><div class="lbg-cdm-stat miss"><b>${missing}</b><span>Chưa Check-in</span></div></div><div class="lbg-cdm-list">${teachers.length?teachers.map(renderTeacher).join(''):`<div class="lbg-cdm-empty">Không có giáo viên thuộc phạm vi của bạn có lịch ${session.toLowerCase()} hôm nay.</div>`}</div></section>`}

  function ensurePanel(){
    const grid=q('lbgCheckinCard')?.querySelector('.lbg-checkin-grid');if(!grid)return null;style();let panel=q('lbgCheckinDailyMonitor');if(panel)return panel;
    panel=document.createElement('div');panel.id='lbgCheckinDailyMonitor';panel.className='lbg-checkin-panel lbg-checkin-wide';
    const manager=[...grid.querySelectorAll('.lbg-checkin-panel')].find(x=>/Kiểm tra Check-in/i.test(txt(x.querySelector('h4')?.textContent)));
    if(manager)grid.insertBefore(panel,manager);else grid.prepend(panel);return panel;
  }

  function shell(){
    const panel=ensurePanel();if(!panel)return null;
    panel.innerHTML=`<div class="lbg-cdm-head"><div><h4>📋 Theo dõi Check-in hôm nay</h4><p>Nhóm trưởng xem giáo viên thuộc nhóm mình; Chủ sở hữu xem theo phạm vi hệ thống. Giáo viên chưa đủ điểm Check-in được đưa lên trước để dễ nhắc.</p></div><div class="lbg-cdm-actions"><span class="lbg-cdm-today">${esc(vnDateLabel())}</span><button class="btn outline" id="lbgCdmRefresh">Làm mới</button></div></div><div class="lbg-cdm-note"><b>Quy tắc đối chiếu:</b> cùng một buổi, nhiều tiết ở cùng một trường chỉ cần <b>1 điểm Check-in</b>; nếu dạy <b>2 trường</b> thì cần <b>2 điểm Check-in</b>. Hệ thống chỉ đối chiếu điểm dạy trong TKB với bản ghi Check-in tương ứng, <b>không tự kết luận giáo viên Check-in sai trường</b>.</div><div id="lbgCdmBody"><div class="lbg-cdm-empty">Đang tải lịch và trạng thái Check-in…</div></div><div id="lbgCdmSource" class="lbg-cdm-source"></div>`;
    q('lbgCdmRefresh').onclick=()=>load(true);return panel;
  }
  function errorBox(error){const panel=shell();const body=q('lbgCdmBody');if(body)body.innerHTML=`<div class="lbg-cdm-error"><b>Chưa tải được bảng theo dõi.</b><br>${esc(error?.message||String(error))}</div>`}

  async function load(force=false){
    if(loading)return;if(!window.LBGAuth?.client||!window.LBGAccess?.context)return;
    const ctx=window.LBGAccess.context;if(!ctx)return;loading=true;
    try{
      auth=window.LBGAuth;gate=await rpc('checkin_access_context');
      if(gate?.phase!=='pilot'||(!gate?.is_owner&&!gate?.is_group_leader)){q('lbgCheckinDailyMonitor')?.remove();return}
      const panel=shell();if(!panel)return;
      const body=q('lbgCdmBody');if(body)body.innerHTML='<div class="lbg-cdm-empty">Đang tải lịch và trạng thái Check-in…</div>';
      roster=await rpc('checkin_permission_admin_list')||[];
      await loadSharedTimetable(force);
      if(shared.status==='none')throw new Error('Chưa có TKB chung đang áp dụng.');
      if(shared.status==='error')throw shared.error||new Error('Không tải được TKB chung đang áp dụng.');
      if(!window.LBGTeacherIntelligenceV6?.scanSheet)throw new Error('Bộ đọc TKB chưa sẵn sàng. Hãy chờ vài giây rồi bấm Làm mới.');
      dashboard=await rpc('checkin_dashboard',{p_teaching_date:vnDateKey()});
      const points=enrich(scanExpected());
      if(body)body.innerHTML=`<div class="lbg-cdm-sessions">${renderSession('Sáng',points)}${renderSession('Chiều',points)}</div>`;
      const source=q('lbgCdmSource');if(source)source.textContent=`Nguồn lịch: ${shared.row?.original_name||'TKB chung đang áp dụng'} • Tự cập nhật trạng thái mỗi 60 giây khi đang mở trang.`;
    }catch(error){console.error('Check-in daily monitor:',error);errorBox(error)}finally{loading=false}
  }

  function start(){
    if(started)return;started=true;style();
    observer=new MutationObserver(()=>{if(!q('lbgCheckinDailyMonitor')&&q('lbgCheckinCard'))load(false)});observer.observe(document.body,{childList:true,subtree:true});
    let tries=0;retryTimer=setInterval(()=>{tries++;if(q('lbgCheckinCard')&&window.LBGTeacherIntelligenceV6?.scanSheet){clearInterval(retryTimer);load(false)}else if(tries>=60)clearInterval(retryTimer)},500);
    autoTimer=setInterval(()=>{if(!document.hidden&&q('lbgCheckinDailyMonitor'))load(false)},60000);
  }
  document.addEventListener('lbg-access-ready',()=>{start();load(false)});
  window.LBGAuth?.onReady?.(()=>{start();load(false)});
  window.addEventListener('focus',()=>{if(started)load(false)});
  window.addEventListener('beforeunload',()=>{observer?.disconnect();clearInterval(retryTimer);clearInterval(autoTimer)},{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.LBGCheckinDailyMonitorV1={version:VERSION,refresh:()=>load(true)};
})();
