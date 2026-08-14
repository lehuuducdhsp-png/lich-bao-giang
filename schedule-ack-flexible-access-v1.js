'use strict';
(function(){
  const VERSION='20260814.2';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  const cfg=window.LBG_SUPABASE_CONFIG||{};
  let timer=null,observer=null,polishQueued=false,accessCache={value:'',at:0},shared={status:'idle',row:null,workbook:null,at:0};

  function auth(){return window.LBGAuth?.client||null}
  function context(){return window.LBGAccess?.context||window.LBGCheckinV2?.getContext?.()||null}
  async function rpc(name,args={}){const c=auth();if(!c)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');const{data,error}=await c.rpc(name,args);if(error)throw error;return data}
  function vnParts(date=new Date()){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hourCycle:'h23',hour:'2-digit',minute:'2-digit'}).formatToParts(date);return Object.fromEntries(p.map(x=>[x.type,x.value]))}
  function todayKey(){const p=vnParts();return`${p.year}-${p.month}-${p.day}`}
  function addDays(k,n){const d=new Date(`${k}T12:00:00+07:00`);d.setUTCDate(d.getUTCDate()+n);const p=vnParts(d);return`${p.year}-${p.month}-${p.day}`}
  function tomorrowKey(){return addDays(todayKey(),1)}
  function minuteNow(){const p=vnParts();return Number(p.hour)*60+Number(p.minute)}
  function normalizeSession(v){const x=fold(v);return x==='SANG'?'Sáng':x==='CHIEU'?'Chiều':'Khác'}
  function dayPhrase(k){const d=new Date(`${k}T12:00:00+07:00`),x=d.getUTCDay();return x===0?'Chủ nhật':`thứ ${x+1}`}
  function dateLabel(k){const d=new Date(`${k}T12:00:00+07:00`);return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
  function timeLabel(v){if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return'—';return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}).format(d)}

  async function access(force=false){const now=Date.now();if(!force&&accessCache.value&&now-accessCache.at<60000)return accessCache.value;let value='none';try{value=txt(await rpc('my_schedule_ack_monitor_access'))||'none'}catch{}accessCache={value,at:Date.now()};return value}
  async function loadShared(force=false){const now=Date.now();if(!force&&shared.status==='ready'&&now-shared.at<60000)return shared;shared={status:'loading',row:null,workbook:null,at:now};try{const c=auth();const{data,error}=await c.from('tkb_files').select('id,original_name,storage_path,created_at,updated_at').eq('scope','shared').eq('status','ready').eq('is_active',true).order('updated_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(!data){shared={status:'none',row:null,workbook:null,at:Date.now()};return shared}const{data:blob,error:de}=await c.storage.from(cfg.bucket||'tkb-private').download(data.storage_path);if(de)throw de;if(!window.ExcelJS)throw new Error('ExcelJS chưa sẵn sàng.');const wb=new ExcelJS.Workbook();await wb.xlsx.load(await blob.arrayBuffer());shared={status:'ready',row:data,workbook:wb,at:Date.now()}}catch{shared={status:'error',row:null,workbook:null,at:Date.now()}}return shared}
  function scan(code,key){const scanner=window.LBGTeacherIntelligenceV6?.scanSheet,wanted=fold(code),book=shared.workbook;if(shared.status!=='ready'||!scanner||!wanted||!book)return[];const map=new Map();for(const ws of book.worksheets||[]){let groups=[];try{groups=scanner(ws)?.groups||[]}catch{continue}for(const g of groups){if(fold(g.code)!==wanted||txt(g.dateKey)!==key)continue;const school=txt(g.school),session=normalizeSession(g.session);if(!school||!['Sáng','Chiều'].includes(session))continue;const k=`${session}|${fold(school)}`;if(!map.has(k))map.set(k,{school_name:school,session,classes:[],periods:[]});const p=map.get(k),period=Number(g.period);if(Number.isFinite(period)&&period>0&&!p.periods.includes(period))p.periods.push(period);for(const c of g.members||[]){const n=txt(c);if(n&&!p.classes.includes(n))p.classes.push(n)}}}return[...map.values()].map(p=>({...p,periods:p.periods.sort((a,b)=>a-b),classes:p.classes.sort((a,b)=>a.localeCompare(b,'vi'))})).sort((a,b)=>(a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1)||a.school_name.localeCompare(b.school_name,'vi'))}
  function report(points,key){const blocks=[];for(const session of ['Sáng','Chiều']){const items=points.filter(p=>p.session===session);if(!items.length)continue;const lines=[`${session} ${dayPhrase(key)}`];for(const p of items)lines.push(`${p.school_name}: ${p.classes.length?p.classes.join(', '):'Chưa xác định lớp'}.`);blocks.push(lines.join('\n'))}return blocks.join('\n\n')}
  function sig(points,key){return JSON.stringify({key,items:points.map(p=>[p.session,p.school_name,[...p.classes].sort(),[...p.periods].sort((a,b)=>a-b)])})}

  function polishPermissionCopy(){
    const box=q('lbgAckPermissionV2');if(!box)return;
    const desired='Nhóm trưởng mặc định xem nhóm mình. Chủ sở hữu có thể cấp quyền xem toàn hệ thống cho bất kỳ tài khoản hoạt động nào: Trưởng ban chuyên môn, Hành chính/Quản lý, Nhóm trưởng hoặc giáo viên khi cần.';
    const p=box.querySelector('.lbg-tomorrow-head p');
    if(p&&txt(p.textContent)!==txt(desired))p.textContent=desired;
    box.querySelectorAll('.lbg-ack-perm-row > span:last-child').forEach(span=>{
      const input=span.querySelector('input');if(!input)return;
      [...span.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>{if(txt(n.nodeValue)!=='Xem toàn hệ thống')n.nodeValue=' Xem toàn hệ thống'});
    });
    const empty=box.querySelector('.lbg-checkin-empty');
    if(empty&&/Quản lý/.test(empty.textContent||'')&&txt(empty.textContent)!=='Không có tài khoản hoạt động để cấp quyền.')empty.textContent='Không có tài khoản hoạt động để cấp quyền.';
  }

  function queuePolish(){
    if(polishQueued)return;
    polishQueued=true;
    requestAnimationFrame(()=>{polishQueued=false;polishPermissionCopy()});
  }

  async function renderFlexible(force=false){
    const c=context();
    if(!c||c.is_owner||c.is_group_leader||c.is_manager){q('lbgAckMonitorFlexible')?.remove();return}
    if(minuteNow()<=1020){q('lbgAckMonitorFlexible')?.remove();return}
    if(await access(force)!=='all'){q('lbgAckMonitorFlexible')?.remove();return}
    const key=tomorrowKey();let rows=[];try{rows=await rpc('teaching_schedule_ack_dashboard',{p_teaching_date:key})}catch{q('lbgAckMonitorFlexible')?.remove();return}
    await loadShared(force);if(shared.status!=='ready')return;
    const items=[];for(const r of rows||[]){const pts=scan(r.teacher_code,key);if(!pts.length)continue;const current=sig(pts,key),status=!r.acknowledged_at?'missing':r.schedule_signature!==current?'changed':'seen';items.push({...r,status,summary:report(pts,key)})}
    items.sort((a,b)=>{const rank=x=>x.status==='missing'?0:x.status==='changed'?1:2;return rank(a)-rank(b)||txt(a.group_name).localeCompare(txt(b.group_name),'vi')||txt(a.display_name).localeCompare(txt(b.display_name),'vi')});
    const grid=q('lbgCheckinCard')?.querySelector('.lbg-checkin-grid');if(!grid)return;
    let box=q('lbgAckMonitorFlexible');if(!box){box=document.createElement('div');box.id='lbgAckMonitorFlexible';box.className='lbg-checkin-panel lbg-checkin-wide lbg-ack-monitor';grid.appendChild(box)}
    const seen=items.filter(x=>x.status==='seen').length,changed=items.filter(x=>x.status==='changed').length,missing=items.filter(x=>x.status==='missing').length;
    const renderKey=JSON.stringify(items.map(x=>[x.user_id,x.status,x.acknowledged_at,x.schedule_signature,x.summary]));
    if(box.dataset.renderKey===renderKey)return;
    box.dataset.renderKey=renderKey;
    box.innerHTML=`<div class="lbg-tomorrow-head"><div><h4>👥 Theo dõi xác nhận lịch ngày mai</h4><p>${esc(dateLabel(key))} • Quyền xem toàn hệ thống do Chủ sở hữu cấp.</p></div><button class="btn outline mini" id="lbgAckFlexRefresh">Làm mới</button></div><div class="lbg-ack-summary"><span class="lbg-checkin-pill">🔴 Chưa xem: ${missing}</span><span class="lbg-checkin-pill">⚠ Lịch đổi: ${changed}</span><span class="lbg-checkin-pill lbg-checkin-good">✅ Đã xem: ${seen}</span></div><div class="lbg-ack-table-wrap"><table class="lbg-ack-table"><thead><tr><th>Giáo viên</th><th>Nhóm</th><th>Lịch ngày mai</th><th>Trạng thái</th><th>Xác nhận lúc</th></tr></thead><tbody>${items.length?items.map(x=>`<tr class="${x.status==='missing'?'lbg-ack-row-missing':x.status==='changed'?'lbg-ack-row-changed':''}"><td><b>${esc(x.display_name)}</b><div class="lbg-checkin-meta">${esc(x.teacher_code)}${x.is_group_leader?' • Nhóm trưởng':''}</div></td><td>${esc(x.group_name||'—')}</td><td style="white-space:pre-wrap">${esc(x.summary)}</td><td>${x.status==='seen'?'✅ Đã xem':x.status==='changed'?'⚠ Lịch đã đổi':'🔴 Chưa xem'}</td><td>${esc(timeLabel(x.acknowledged_at))}</td></tr>`).join(''):'<tr><td colspan="5">Không có giáo viên nào có lịch ngày mai.</td></tr>'}</tbody></table></div>`;
    q('lbgAckFlexRefresh').onclick=()=>{accessCache.at=0;shared.status='idle';box.dataset.renderKey='';renderFlexible(true).catch(console.error)};
  }

  function apply(force=false){queuePolish();renderFlexible(force).catch(console.error)}
  function start(){
    apply(true);
    observer=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.addedNodes?.length||m.removedNodes?.length))queuePolish();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    timer=setInterval(()=>apply(false),30000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',()=>apply(true));
  window.addEventListener('focus',()=>{accessCache.at=0;shared.status='idle';apply(true)});
  window.addEventListener('beforeunload',()=>{observer?.disconnect();clearInterval(timer)},{once:true});
  window.LBGScheduleAckFlexibleAccessV1={version:VERSION,refresh:()=>apply(true)};
})();