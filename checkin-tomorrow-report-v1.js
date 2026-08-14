'use strict';
(function(){
  const VERSION='20260814.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  let observer=null,timer=null,queued=false,applying=false;

  function style(){
    if(q('lbgTomorrowReportV1Css'))return;
    const s=document.createElement('style');s.id='lbgTomorrowReportV1Css';s.textContent=`
      .lbg-tomorrow-report{margin-top:12px;border:1px solid #f0d8c8;border-radius:16px;padding:14px;background:linear-gradient(180deg,#fffdfb,#fff9f5)}
      .lbg-tomorrow-report-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
      .lbg-tomorrow-report-head h4{margin:0;color:#5b3828}.lbg-tomorrow-report-head p{margin:4px 0 0;color:#806b61;font-size:12px}
      .lbg-tomorrow-report-preview{margin-top:10px;border:1px dashed #d8b9a6;border-radius:13px;background:#fff;padding:13px 14px;white-space:pre-wrap;font:700 15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;color:#3f2c24}
      .lbg-tomorrow-report-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.lbg-tomorrow-report-actions .btn{width:100%}
      .lbg-tomorrow-report-status{margin-top:9px;padding:9px 11px;border-radius:11px;background:#f8fafc;border:1px solid #e5e7eb;color:#64748b;font-size:12px;line-height:1.5}
      .lbg-tomorrow-report-status.ok{background:#ecfdf5;border-color:#bbf7d0;color:#166534}.lbg-tomorrow-report-status.warn{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
      @media(max-width:650px){.lbg-tomorrow-report-actions{grid-template-columns:1fr}.lbg-tomorrow-report-preview{font-size:14px}}
    `;document.head.appendChild(s);
  }

  function vnParts(date=new Date()){
    const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hourCycle:'h23',hour:'2-digit',minute:'2-digit'}).formatToParts(date);
    return Object.fromEntries(p.map(x=>[x.type,x.value]));
  }
  function todayKey(){const p=vnParts();return`${p.year}-${p.month}-${p.day}`}
  function addDays(key,days){const m=String(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return key;const d=new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+07:00`);d.setUTCDate(d.getUTCDate()+days);const p=vnParts(d);return`${p.year}-${p.month}-${p.day}`}
  function tomorrowKey(){return addDays(todayKey(),1)}
  function minuteNow(){const p=vnParts();return Number(p.hour)*60+Number(p.minute)}
  function normalizeSession(v){const x=fold(v);if(x==='SANG')return'Sáng';if(x==='CHIEU')return'Chiều';return'Khác'}
  function dayPhrase(key){
    const d=new Date(`${key}T12:00:00+07:00`),day=d.getUTCDay();
    if(day===0)return'Chủ nhật';
    return`thứ ${day+1}`;
  }
  function dateLabel(key){const d=new Date(`${key}T12:00:00+07:00`);return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
  function timeLabel(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}).format(d)}

  function gate(){try{return window.LBGCheckinV2?.getGate?.()||null}catch{return null}}
  function context(){try{return window.LBGCheckinV2?.getContext?.()||null}catch{return null}}
  function shared(){try{return window.LBGCheckinV2?.getSharedTimetable?.()||null}catch{return null}}
  function eligible(){const g=gate(),c=context();return Boolean(c?.teacher_code&&!c?.is_group_leader&&!c?.is_owner&&g?.can_checkin)}

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
        if(!map.has(k))map.set(k,{school_name:school,session,classes:[],periods:[]});
        const p=map.get(k),period=Number(g.period);
        if(Number.isFinite(period)&&period>0&&!p.periods.includes(period))p.periods.push(period);
        for(const c of g.members||[]){const name=txt(c);if(name&&!p.classes.includes(name))p.classes.push(name)}
      }
    }
    const rank=s=>s==='Sáng'?0:s==='Chiều'?1:2;
    return[...map.values()].map(p=>({...p,periods:p.periods.sort((a,b)=>a-b)})).sort((a,b)=>rank(a.session)-rank(b.session)||a.school_name.localeCompare(b.school_name,'vi'));
  }

  function reportText(points,key){
    const sessions=['Sáng','Chiều'],blocks=[];
    for(const session of sessions){
      const items=points.filter(p=>p.session===session);if(!items.length)continue;
      const lines=[`${session} ${dayPhrase(key)}`];
      for(const p of items){
        const classes=p.classes.length?p.classes.join(', '):'Chưa xác định lớp';
        lines.push(`${p.school_name}: ${classes}.`);
      }
      blocks.push(lines.join('\n'));
    }
    return blocks.join('\n\n');
  }
  function signature(points,key){return JSON.stringify({key,items:points.map(p=>[p.session,p.school_name,[...p.classes].sort(),[...p.periods].sort((a,b)=>a-b)])})}
  function storeKey(key){const c=context(),who=fold(c?.teacher_code||c?.username||'teacher');return`lbgTomorrowSeen:${who}:${key}`}
  function readSeen(key){try{return JSON.parse(localStorage.getItem(storeKey(key))||'null')}catch{return null}}
  function writeSeen(key,sig){const value={signature:sig,confirmedAt:new Date().toISOString()};localStorage.setItem(storeKey(key),JSON.stringify(value));return value}

  async function copyText(value){
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return}
    const ta=document.createElement('textarea');ta.value=value;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
  }

  function findTomorrowPanel(){
    const card=q('lbgCheckinCard');if(!card)return null;
    return[...card.querySelectorAll('.lbg-checkin-panel')].find(p=>/Ngày mai bạn dạy ở đâu\?/i.test(txt(p.querySelector('h4')?.textContent)))||null;
  }
  function statusHtml(seen,sig){
    if(!seen)return'<div class="lbg-tomorrow-report-status">Chưa xác nhận đã xem lịch ngày mai trên thiết bị này.</div>';
    if(seen.signature!==sig)return'<div class="lbg-tomorrow-report-status warn"><b>⚠ Lịch đã thay đổi sau lần xác nhận trước.</b> Vui lòng xem lại và xác nhận lại.</div>';
    return`<div class="lbg-tomorrow-report-status ok"><b>✓ Đã xem lịch ngày mai</b> • ${esc(timeLabel(seen.confirmedAt))}</div>`;
  }
  function render(panel,points,key){
    let box=q('lbgTomorrowReportV1');if(!box){box=document.createElement('div');box.id='lbgTomorrowReportV1';box.className='lbg-tomorrow-report';const preview=panel.querySelector('.lbg-member-window-preview');if(preview)preview.insertAdjacentElement('afterend',box);else panel.appendChild(box)}
    const text=reportText(points,key),sig=signature(points,key),seen=readSeen(key);
    box.dataset.signature=sig;
    box.innerHTML=`<div class="lbg-tomorrow-report-head"><div><h4>📣 BÁO LỊCH NGÀY MAI</h4><p>Nội dung ngắn gọn để sao chép và báo vào nhóm sau khi đã kiểm tra TKB chung.</p></div><span class="lbg-checkin-pill">${esc(dateLabel(key))}</span></div><div class="lbg-tomorrow-report-preview">${esc(text)}</div><div class="lbg-tomorrow-report-actions"><button class="btn primary" id="lbgTomorrowCopy">📋 Sao chép báo nhóm</button><button class="btn outline" id="lbgTomorrowSeen">✓ Đã xem lịch ngày mai</button></div><div id="lbgTomorrowStatus">${statusHtml(seen,sig)}</div>`;
    q('lbgTomorrowCopy').onclick=async()=>{const b=q('lbgTomorrowCopy'),old=b.textContent;b.disabled=true;try{await copyText(text);b.textContent='✓ Đã sao chép';setTimeout(()=>{b.disabled=false;b.textContent=old},1200)}catch(e){b.disabled=false;b.textContent=old;alert('Không sao chép được nội dung: '+(e?.message||String(e)))}};
    q('lbgTomorrowSeen').onclick=()=>{const current=writeSeen(key,sig);q('lbgTomorrowStatus').innerHTML=statusHtml(current,sig);const b=q('lbgTomorrowSeen');b.textContent='✓ Đã xác nhận';setTimeout(()=>b.textContent='✓ Đã xem lịch ngày mai',1200)};
  }

  function apply(){
    if(applying)return;applying=true;
    try{
      style();
      if(minuteNow()<=1020||!eligible()){q('lbgTomorrowReportV1')?.remove();return}
      const panel=findTomorrowPanel();if(!panel)return;
      const key=tomorrowKey(),points=scanDate(key);
      if(!points.length){q('lbgTomorrowReportV1')?.remove();return}
      const sig=signature(points,key),box=q('lbgTomorrowReportV1');if(box?.dataset.signature===sig)return;
      render(panel,points,key);
    }finally{applying=false}
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
  function start(){style();queue();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});timer=setInterval(queue,30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',queue);window.addEventListener('focus',queue);window.addEventListener('beforeunload',()=>{observer?.disconnect();clearInterval(timer)},{once:true});
  window.LBGCheckinTomorrowReportV1={version:VERSION,refresh:queue};
})();