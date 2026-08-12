'use strict';
(function(){
  const ID='lbgCheckinMemberWindowV1Css';
  const VERSION='20260812.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  let observer=null,timer=null,applying=false,queued=false;

  function style(){
    if(q(ID))return;
    const s=document.createElement('style');s.id=ID;s.textContent=`
      .lbg-member-window-note{margin:9px 0 10px;padding:10px 12px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;line-height:1.55}
      .lbg-member-window-note.live{background:#ecfdf5;border-color:#bbf7d0;color:#166534}
      .lbg-member-window-preview{display:grid;gap:9px;margin-top:10px}.lbg-member-window-preview .lbg-checkin-point{margin-top:0}
      .lbg-member-window-preview .btn[disabled],.lbg-member-window-locked .btn[disabled],#lbgCheckinManualStart[disabled]{background:#f1f5f9!important;color:#94a3b8!important;border-color:#dbe3ea!important;box-shadow:none!important;cursor:not-allowed!important;transform:none!important;opacity:1!important}
      .lbg-member-window-empty{padding:16px;text-align:center;color:#806b61;border:1px dashed #e5d4ca;border-radius:13px;background:#fffaf7;font-size:13px;line-height:1.55}
      .lbg-member-window-date{margin-top:8px;padding:8px 10px;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;font-size:12px;color:#64748b}
    `;document.head.appendChild(s);
  }

  function vnParts(date=new Date()){
    const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour12:false,hour:'2-digit',minute:'2-digit'}).formatToParts(date);
    return Object.fromEntries(p.map(x=>[x.type,x.value]));
  }
  function todayKey(){const p=vnParts();return`${p.year}-${p.month}-${p.day}`}
  function addDays(key,days){const m=String(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return key;const d=new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+07:00`);d.setUTCDate(d.getUTCDate()+days);const p=vnParts(d);return`${p.year}-${p.month}-${p.day}`}
  function dateLabel(key){const m=String(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return key;const d=new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+07:00`);return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
  function minuteNow(){const p=vnParts();return Number(p.hour)*60+Number(p.minute)}
  function normalizeSession(v){const x=fold(v);if(x==='SANG')return'Sáng';if(x==='CHIEU')return'Chiều';return'Khác'}
  function mode(){
    const now=minuteNow(),today=todayKey();
    if(now<360)return{targetDate:today,session:'Sáng',open:false,title:'Hôm nay bạn dạy ở đâu?',message:'Chưa đến khung Check-in buổi sáng. Nút Check-in sẽ mở từ 06:00 đến hết 11:00.',range:'06:00–11:00'};
    if(now<=660)return{targetDate:today,session:'Sáng',open:true,title:'Hôm nay bạn dạy ở đâu?',message:'Đang trong khung Check-in buổi sáng 06:00–11:00.',range:'06:00–11:00'};
    if(now<720)return{targetDate:today,session:'Chiều',open:false,title:'Chiều nay bạn dạy ở đâu?',message:'Buổi sáng đã kết thúc. Check-in buổi chiều sẽ mở từ 12:00 đến hết 17:00.',range:'12:00–17:00'};
    if(now<=1020)return{targetDate:today,session:'Chiều',open:true,title:'Hôm nay bạn dạy ở đâu?',message:'Đang trong khung Check-in buổi chiều 12:00–17:00.',range:'12:00–17:00'};
    return{targetDate:addDays(today,1),session:'ALL',open:false,title:'Ngày mai bạn dạy ở đâu?',message:'Đã hết khung Check-in hôm nay. Đây là lịch xem trước ngày mai; nút Check-in chỉ mở đúng 06:00–11:00 hoặc 12:00–17:00.',range:'Ngày mai'};
  }

  function gate(){try{return window.LBGCheckinV2?.getGate?.()||null}catch{return null}}
  function context(){try{return window.LBGCheckinV2?.getContext?.()||null}catch{return null}}
  function shared(){try{return window.LBGCheckinV2?.getSharedTimetable?.()||null}catch{return null}}
  function memberEnabled(){const g=gate();return Boolean(g?.can_checkin&&!g?.is_group_leader&&!g?.is_owner)}

  function parsePoint(el){
    try{return JSON.parse(decodeURIComponent(el.dataset.checkinPoint||''))}catch{return null}
  }
  function scanDate(key){
    const sh=shared(),ctx=context(),book=sh?.workbook,scanner=window.LBGTeacherIntelligenceV6?.scanSheet,code=fold(ctx?.teacher_code);
    if(sh?.status!=='ready'||!book||!scanner||!code)return[];
    const map=new Map();
    for(const ws of book.worksheets||[]){
      let groups=[];try{groups=scanner(ws)?.groups||[]}catch{continue}
      for(const g of groups){
        if(fold(g.code)!==code||txt(g.dateKey)!==key)continue;
        const school=txt(g.school),session=normalizeSession(g.session);if(!school||!['Sáng','Chiều'].includes(session))continue;
        const k=`${fold(session)}|${fold(school)}`;
        if(!map.has(k))map.set(k,{school_name:school,session,periods:new Set(),classes:new Set()});
        const p=map.get(k),period=Number(g.period);if(Number.isFinite(period)&&period>0)p.periods.add(period);for(const c of g.members||[])if(txt(c))p.classes.add(txt(c));
      }
    }
    return[...map.values()].map(p=>({...p,periods:[...p.periods].sort((a,b)=>a-b),classes:[...p.classes]})).sort((a,b)=>a.session.localeCompare(b.session,'vi')||a.school_name.localeCompare(b.school_name,'vi'));
  }
  function previewHtml(points,m){
    if(!points.length)return`<div class="lbg-member-window-empty">TKB chung đang áp dụng chưa có điểm dạy của bạn vào <b>${esc(dateLabel(m.targetDate))}</b>.</div>`;
    return points.map(p=>`<article class="lbg-checkin-point lbg-member-window-locked"><div class="lbg-checkin-point-head"><div><h4>🏫 ${esc(p.school_name)}</h4><p>${esc(dateLabel(m.targetDate))} • ${esc(p.session)} • Theo TKB chung</p>${p.periods.length?`<div class="lbg-checkin-meta">Tiết ${esc(p.periods.join(', '))}${p.classes.length?` • Lớp ${esc(p.classes.join(', '))}`:''}</div>`:''}</div><span class="lbg-checkin-pill">Xem trước</span></div><div class="lbg-checkin-actions"><button class="btn outline" disabled>🔒 Chưa đến khung Check-in</button></div></article>`).join('');
  }

  function setManualState(panel,m){
    const select=q('lbgCheckinManualSession'),button=q('lbgCheckinManualStart');if(!button)return;
    if(button.dataset.lbgWindowBaseText===undefined)button.dataset.lbgWindowBaseText=button.textContent||'📍 Check-in điểm dạy này';
    const selected=normalizeSession(select?.value||'Khác');
    const allowed=m.open&&(selected==='Khác'||selected===m.session);
    button.disabled=!allowed;
    button.textContent=allowed?button.dataset.lbgWindowBaseText:`🔒 Check-in chỉ mở ${m.session==='Chiều'?'12:00–17:00':'06:00–11:00'}`;
    if(select&&!select.dataset.lbgWindowBound){select.dataset.lbgWindowBound='1';select.addEventListener('change',queue)}
  }

  function decorateTodayPanel(panel,m){
    const h4=panel.querySelector(':scope>h4')||panel.querySelector('h4');if(h4)h4.textContent=m.title;
    let note=panel.querySelector('[data-lbg-member-window-note]');if(!note){note=document.createElement('div');note.dataset.lbgMemberWindowNote='1';h4?.insertAdjacentElement('afterend',note)}
    note.className=`lbg-member-window-note ${m.open?'live':''}`;note.innerHTML=`<b>${m.open?'✅':'🔒'} ${esc(m.message)}</b>`;
    const label=panel.querySelector('[data-lbg-today-label]');if(label)label.innerHTML=`📅 Ngày đối chiếu TKB: <b>${esc(dateLabel(m.targetDate))}</b> • Giờ Việt Nam`;
    panel.querySelectorAll('[data-lbg-member-window-generated]').forEach(x=>x.remove());
    const points=[...panel.querySelectorAll('.lbg-checkin-point[data-checkin-point]')];let visible=0;
    for(const el of points){
      const p=parsePoint(el),same=normalizeSession(p?.session)===m.session;el.hidden=!same;if(!same)continue;visible++;
      const b=el.querySelector('[data-checkin-start]');if(!b)continue;
      if(b.dataset.lbgWindowBaseDisabled===undefined)b.dataset.lbgWindowBaseDisabled=b.disabled?'1':'0';
      const baseDisabled=b.dataset.lbgWindowBaseDisabled==='1';b.disabled=baseDisabled||!m.open;
      if(!m.open){if(b.dataset.lbgWindowBaseText===undefined)b.dataset.lbgWindowBaseText=b.textContent;b.textContent=`🔒 Mở ${m.range}`;el.classList.add('lbg-member-window-locked')}
      else{if(b.dataset.lbgWindowBaseText!==undefined)b.textContent=b.dataset.lbgWindowBaseText;el.classList.remove('lbg-member-window-locked')}
    }
    const oldEmpty=[...panel.querySelectorAll(':scope>.lbg-checkin-empty')];oldEmpty.forEach(x=>x.hidden=visible>0);
    if(!visible){
      const manual=panel.querySelector('.lbg-checkin-manual'),empty=document.createElement('div');empty.dataset.lbgMemberWindowGenerated='1';empty.className='lbg-member-window-empty';empty.innerHTML=`Không có điểm dạy ${esc(m.session.toLowerCase())} trong TKB chung vào <b>${esc(dateLabel(m.targetDate))}</b>.`;if(manual)panel.insertBefore(empty,manual);else panel.appendChild(empty);
    }
    setManualState(panel,m);
  }

  function decorateTomorrow(panel,m){
    const h4=panel.querySelector(':scope>h4')||panel.querySelector('h4');if(h4)h4.textContent=m.title;
    let note=panel.querySelector('[data-lbg-member-window-note]');if(!note){note=document.createElement('div');note.dataset.lbgMemberWindowNote='1';h4?.insertAdjacentElement('afterend',note)}
    note.className='lbg-member-window-note';note.innerHTML=`<b>🔒 ${esc(m.message)}</b>`;
    const label=panel.querySelector('[data-lbg-today-label]');if(label)label.innerHTML=`📅 Lịch xem trước: <b>${esc(dateLabel(m.targetDate))}</b> • Giờ Việt Nam`;
    panel.querySelectorAll('.lbg-checkin-point[data-checkin-point],:scope>.lbg-checkin-empty').forEach(x=>x.hidden=true);
    panel.querySelectorAll('[data-lbg-member-window-generated]').forEach(x=>x.remove());
    const wrap=document.createElement('div');wrap.dataset.lbgMemberWindowGenerated='1';wrap.className='lbg-member-window-preview';wrap.innerHTML=previewHtml(scanDate(m.targetDate),m);
    const manual=panel.querySelector('.lbg-checkin-manual');if(manual)panel.insertBefore(wrap,manual);else panel.appendChild(wrap);
    setManualState(panel,m);
  }

  function apply(){
    if(applying)return;applying=true;
    try{
      style();if(!memberEnabled())return;
      const card=q('lbgCheckinCard');if(!card)return;
      const panel=[...card.querySelectorAll('.lbg-checkin-panel')].find(p=>{const t=txt(p.querySelector('h4')?.textContent);return /bạn dạy ở đâu\?|Chiều nay bạn dạy ở đâu\?|Ngày mai bạn dạy ở đâu\?/i.test(t)});
      if(!panel)return;
      const m=mode();if(m.targetDate!==todayKey())decorateTomorrow(panel,m);else decorateTodayPanel(panel,m);
    }finally{applying=false}
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
  function start(){style();queue();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});timer=setInterval(queue,30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',queue);window.addEventListener('focus',queue);window.addEventListener('beforeunload',()=>{observer?.disconnect();clearInterval(timer)},{once:true});
  window.LBGCheckinMemberWindowV1={version:VERSION,refresh:queue};
})();
