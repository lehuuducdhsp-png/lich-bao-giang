'use strict';
(function(){
  const VERSION='20260814.3';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  const cfg=window.LBG_SUPABASE_CONFIG||{};

  let observer=null,timer=null,queued=false,forceQueued=false,applying=false;
  let shared={status:'idle',row:null,workbook:null,error:null,loadedAt:0};
  let ackCache={key:'',value:null,loadedAt:0};
  let monitorCache={key:'',rows:null,loadedAt:0};
  let permissionCache={rows:null,loadedAt:0};

  function style(){
    if(q('lbgTomorrowReportV2Css'))return;
    const s=document.createElement('style');
    s.id='lbgTomorrowReportV2Css';
    s.textContent=`
      .lbg-tomorrow-own,.lbg-ack-monitor,.lbg-ack-perm{border:1px solid #f0d8c8;border-radius:16px;padding:14px;background:linear-gradient(180deg,#fffdfb,#fff9f5);margin-top:12px}
      .lbg-tomorrow-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
      .lbg-tomorrow-head h4{margin:0;color:#5b3828}.lbg-tomorrow-head p{margin:4px 0 0;color:#806b61;font-size:12px}
      .lbg-tomorrow-preview{margin-top:10px;border:1px dashed #d8b9a6;border-radius:13px;background:#fff;padding:13px 14px;white-space:pre-wrap;font-weight:750;line-height:1.65;color:#3f2c24}
      .lbg-tomorrow-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
      .lbg-tomorrow-actions .lbg-tomorrow-action{min-height:40px!important;height:40px!important;padding:0 14px!important;border-radius:11px!important;font-size:14px!important;font-weight:800!important;line-height:1!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;white-space:nowrap!important}
      .lbg-tomorrow-actions .lbg-tomorrow-copy{background:#f4a261!important;border-color:#f4a261!important;color:#4c3429!important}
      .lbg-tomorrow-actions .lbg-tomorrow-seen.is-seen{background:#ecfdf5!important;border-color:#86efac!important;color:#166534!important;opacity:1!important;cursor:default!important}
      .lbg-tomorrow-actions .lbg-tomorrow-detail-btn{min-height:34px!important;height:34px!important;padding:0 10px!important;font-size:12.5px!important;font-weight:750!important;background:transparent!important;border-color:#ead3c4!important;color:#6f4b39!important}
      .lbg-action-icon{font-family:Arial,"Segoe UI Symbol",sans-serif;font-size:15px;line-height:1;display:inline-block;min-width:15px;text-align:center}
      .lbg-tomorrow-status{margin-top:9px;padding:9px 11px;border-radius:11px;background:#f8fafc;border:1px solid #e5e7eb;color:#64748b;font-size:12px;line-height:1.5}
      .lbg-tomorrow-status.ok{background:#ecfdf5;border-color:#bbf7d0;color:#166534}.lbg-tomorrow-status.warn{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
      .lbg-tomorrow-detail{margin-top:10px;display:grid;gap:8px}.lbg-tomorrow-detail[hidden]{display:none}.lbg-tomorrow-detail article{border:1px solid #eadfd8;border-radius:12px;background:#fff;padding:10px}
      .lbg-ack-summary{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.lbg-ack-table-wrap{overflow:auto;border:1px solid #eee3dc;border-radius:12px;background:#fff}.lbg-ack-table{width:100%;border-collapse:collapse}.lbg-ack-table th,.lbg-ack-table td{padding:9px 10px;border-bottom:1px solid #f1e8e2;text-align:left;vertical-align:top}.lbg-ack-table th{background:#fff9f5;font-size:11px;color:#806b61}.lbg-ack-row-missing{background:#fffaf5}.lbg-ack-row-changed{background:#fff7ed}
      .lbg-ack-perm-list{display:grid;gap:8px;margin-top:10px}.lbg-ack-perm-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 10px;border:1px solid #eee3dc;border-radius:11px;background:#fff}
      @media(max-width:650px){.lbg-tomorrow-actions{display:grid;grid-template-columns:1fr 1fr}.lbg-tomorrow-actions .lbg-tomorrow-copy{grid-column:1/-1;width:100%}.lbg-tomorrow-actions .lbg-tomorrow-seen{width:100%}.lbg-tomorrow-actions .lbg-tomorrow-detail-btn{width:100%}.lbg-ack-perm-row{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(s);
  }

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

  async function loadShared(force=false){
    const now=Date.now();
    if(!force&&shared.status==='ready'&&now-shared.loadedAt<60000)return shared;
    shared={status:'loading',row:null,workbook:null,error:null,loadedAt:now};
    try{
      const c=auth();
      const{data,error}=await c.from('tkb_files').select('id,original_name,storage_path,created_at,updated_at').eq('scope','shared').eq('status','ready').eq('is_active',true).order('updated_at',{ascending:false}).limit(1).maybeSingle();
      if(error)throw error;
      if(!data){shared={status:'none',row:null,workbook:null,error:null,loadedAt:Date.now()};return shared}
      const{data:blob,error:de}=await c.storage.from(cfg.bucket||'tkb-private').download(data.storage_path);if(de)throw de;
      if(!window.ExcelJS)throw new Error('Thư viện Excel chưa sẵn sàng.');
      const wb=new ExcelJS.Workbook();await wb.xlsx.load(await blob.arrayBuffer());
      shared={status:'ready',row:data,workbook:wb,error:null,loadedAt:Date.now()};
    }catch(error){shared={status:'error',row:null,workbook:null,error,loadedAt:Date.now()}}
    return shared;
  }

  function scanDateForCode(code,key){
    const book=shared.workbook,scanner=window.LBGTeacherIntelligenceV6?.scanSheet,wanted=fold(code);
    if(shared.status!=='ready'||!book||!scanner||!wanted)return[];
    const map=new Map();
    for(const ws of book.worksheets||[]){
      let groups=[];try{groups=scanner(ws)?.groups||[]}catch{continue}
      for(const g of groups){
        if(fold(g.code)!==wanted||txt(g.dateKey)!==key)continue;
        const school=txt(g.school),session=normalizeSession(g.session);if(!school||!['Sáng','Chiều'].includes(session))continue;
        const k=`${session}|${fold(school)}`;
        if(!map.has(k))map.set(k,{school_name:school,session,classes:[],periods:[]});
        const p=map.get(k),period=Number(g.period);
        if(Number.isFinite(period)&&period>0&&!p.periods.includes(period))p.periods.push(period);
        for(const c of g.members||[]){const n=txt(c);if(n&&!p.classes.includes(n))p.classes.push(n)}
      }
    }
    const rank=s=>s==='Sáng'?0:1;
    return[...map.values()].map(p=>({...p,periods:p.periods.sort((a,b)=>a-b),classes:p.classes.sort((a,b)=>a.localeCompare(b,'vi'))})).sort((a,b)=>rank(a.session)-rank(b.session)||a.school_name.localeCompare(b.school_name,'vi'));
  }

  function reportText(points,key){const blocks=[];for(const session of ['Sáng','Chiều']){const items=points.filter(p=>p.session===session);if(!items.length)continue;const lines=[`${session} ${dayPhrase(key)}`];for(const p of items)lines.push(`${p.school_name}: ${p.classes.length?p.classes.join(', '):'Chưa xác định lớp'}.`);blocks.push(lines.join('\n'))}return blocks.join('\n\n')}
  function signature(points,key){return JSON.stringify({key,items:points.map(p=>[p.session,p.school_name,[...p.classes].sort(),[...p.periods].sort((a,b)=>a-b)])})}
  function detailHtml(points,key){return points.map(p=>`<article><b>${esc(p.session)} • ${esc(p.school_name)}</b><div class="lbg-checkin-meta">${esc(dateLabel(key))}${p.periods.length?` • Tiết ${esc(p.periods.join(', '))}`:''}${p.classes.length?` • Lớp ${esc(p.classes.join(', '))}`:''}</div></article>`).join('')}
  async function copyText(value){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(value);const ta=document.createElement('textarea');ta.value=value;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}

  function findSelfHost(){
    const card=q('lbgCheckinCard');if(!card)return null;
    const existing=[...card.querySelectorAll('.lbg-checkin-panel')].find(p=>/Ngày mai bạn dạy ở đâu\?/i.test(txt(p.querySelector('h4')?.textContent)));
    if(existing)return existing;
    let panel=q('lbgTomorrowSelfPanelV2');
    if(!panel){panel=document.createElement('div');panel.id='lbgTomorrowSelfPanelV2';panel.className='lbg-checkin-panel lbg-checkin-wide';const grid=card.querySelector('.lbg-checkin-grid');if(grid)grid.prepend(panel)}
    return panel;
  }

  function ackStatus(ack,sig){
    if(!ack)return'<div class="lbg-tomorrow-status">Chưa xác nhận đã xem lịch ngày mai.</div>';
    if(ack.schedule_signature!==sig)return'<div class="lbg-tomorrow-status warn"><b>⚠ Lịch đã thay đổi sau lần xác nhận trước.</b> Vui lòng xem lại và xác nhận lại.</div>';
    return`<div class="lbg-tomorrow-status ok"><b>✓ Đã xem lịch ngày mai</b> • ${esc(timeLabel(ack.acknowledged_at))}</div>`;
  }

  async function loadMyAck(key,force=false){
    const now=Date.now();
    if(!force&&ackCache.key===key&&now-ackCache.loadedAt<15000)return ackCache.value;
    let value=null;try{value=await rpc('my_teaching_schedule_ack',{p_teaching_date:key})}catch{}
    ackCache={key,value,loadedAt:Date.now()};return value;
  }

  async function renderSelf(force=false){
    const c=context(),code=txt(c?.teacher_code);
    if(!code){q('lbgTomorrowSelfPanelV2')?.remove();return}
    const key=tomorrowKey(),host=findSelfHost();if(!host)return;
    await loadShared(force);
    if(shared.status!=='ready'){
      if(host.id==='lbgTomorrowSelfPanelV2'&&host.dataset.renderKey!=='shared-error'){host.dataset.renderKey='shared-error';host.innerHTML='<div class="lbg-checkin-empty">Chưa đọc được TKB chung đang áp dụng.</div>'}
      return;
    }
    const points=scanDateForCode(code,key);
    let box=q('lbgTomorrowReportV2');
    if(!points.length){
      const renderKey=`empty|${key}|${shared.row?.id||''}|${shared.row?.updated_at||''}`;
      if(!box){box=document.createElement('div');box.id='lbgTomorrowReportV2';box.className='lbg-tomorrow-own';host.appendChild(box)}
      if(box.dataset.renderKey!==renderKey){box.dataset.renderKey=renderKey;box.innerHTML=`<div class="lbg-tomorrow-head"><div><h4>📅 Lịch dạy ngày mai</h4><p>${esc(dateLabel(key))}</p></div></div><div class="lbg-tomorrow-status ok">Ngày mai bạn không có lịch dạy theo TKB chung đang áp dụng.</div>`}
      return;
    }

    const text=reportText(points,key),sig=signature(points,key),ack=await loadMyAck(key,force);
    const ackSig=txt(ack?.schedule_signature),ackTime=txt(ack?.acknowledged_at);
    const seen=Boolean(ack&&ackSig===sig),changed=Boolean(ack&&ackSig!==sig);
    const renderKey=JSON.stringify([sig,ackSig,ackTime,shared.row?.id||'',shared.row?.updated_at||'']);
    if(!box){box=document.createElement('div');box.id='lbgTomorrowReportV2';box.className='lbg-tomorrow-own';const preview=host.querySelector('.lbg-member-window-preview');preview?preview.insertAdjacentElement('afterend',box):host.appendChild(box)}
    if(box.dataset.renderKey===renderKey)return;
    box.dataset.renderKey=renderKey;
    box.innerHTML=`<div class="lbg-tomorrow-head"><div><h4>📣 BÁO LỊCH NGÀY MAI</h4><p>Nội dung ngắn gọn để báo vào nhóm sau khi đã kiểm tra TKB chung.</p></div><span class="lbg-checkin-pill">${esc(dateLabel(key))}</span></div><div class="lbg-tomorrow-preview">${esc(text)}</div><div class="lbg-tomorrow-actions"><button class="btn primary lbg-tomorrow-action lbg-tomorrow-copy" id="lbgTomorrowCopyV2"><span class="lbg-action-icon">⧉</span><span>Sao chép báo nhóm</span></button><button class="btn outline lbg-tomorrow-action lbg-tomorrow-seen ${seen?'is-seen':''}" id="lbgTomorrowSeenV2" ${seen?'disabled':''}><span class="lbg-action-icon">✓</span><span>${seen?'Đã xem lịch':changed?'Xác nhận đã xem lại':'Đã xem lịch'}</span></button><button class="btn outline mini lbg-tomorrow-action lbg-tomorrow-detail-btn" id="lbgTomorrowDetailBtnV2"><span class="lbg-action-icon">⌄</span><span>Xem chi tiết</span></button></div><div id="lbgTomorrowDetailV2" class="lbg-tomorrow-detail" hidden>${detailHtml(points,key)}</div><div id="lbgTomorrowStatusV2">${ackStatus(ack,sig)}</div>`;

    q('lbgTomorrowCopyV2').onclick=async()=>{const b=q('lbgTomorrowCopyV2'),label=b?.querySelector('span:last-child');if(!b||!label)return;const old=label.textContent;b.disabled=true;try{await copyText(text);label.textContent='Đã sao chép';setTimeout(()=>{b.disabled=false;label.textContent=old},1000)}catch(e){b.disabled=false;label.textContent=old;alert('Không sao chép được: '+(e?.message||String(e)))}};
    q('lbgTomorrowDetailBtnV2').onclick=()=>{const d=q('lbgTomorrowDetailV2'),b=q('lbgTomorrowDetailBtnV2'),icon=b?.querySelector('.lbg-action-icon'),label=b?.querySelector('span:last-child');if(!d||!b)return;d.hidden=!d.hidden;if(icon)icon.textContent=d.hidden?'⌄':'⌃';if(label)label.textContent=d.hidden?'Xem chi tiết':'Thu gọn'};
    if(!seen)q('lbgTomorrowSeenV2').onclick=async()=>{const b=q('lbgTomorrowSeenV2'),label=b?.querySelector('span:last-child');if(!b||!label)return;const old=label.textContent;b.disabled=true;label.textContent='Đang xác nhận…';try{const r=await rpc('acknowledge_teaching_schedule',{p_teaching_date:key,p_schedule_signature:sig,p_schedule_summary:text,p_source_tkb_id:shared.row?.id||null,p_source_tkb_updated_at:shared.row?.updated_at||shared.row?.created_at||null});ackCache={key,value:{schedule_signature:sig,acknowledged_at:r?.acknowledged_at},loadedAt:Date.now()};monitorCache.loadedAt=0;await renderSelf(true);await renderMonitor(true)}catch(e){b.disabled=false;label.textContent=old;alert('Không xác nhận được: '+(e?.message||String(e)))}};
  }

  async function loadMonitorRows(key,force=false){
    const now=Date.now();
    if(!force&&monitorCache.key===key&&Array.isArray(monitorCache.rows)&&now-monitorCache.loadedAt<15000)return monitorCache.rows;
    const rows=await rpc('teaching_schedule_ack_dashboard',{p_teaching_date:key});
    monitorCache={key,rows:rows||[],loadedAt:Date.now()};return monitorCache.rows;
  }

  async function renderMonitor(force=false){
    const c=context();
    if(!c||(!c.is_owner&&!c.is_group_leader&&!c.is_manager)){q('lbgAckMonitorV2')?.remove();return}
    const key=tomorrowKey();let rows;
    try{rows=await loadMonitorRows(key,force)}catch{q('lbgAckMonitorV2')?.remove();return}
    await loadShared(force);if(shared.status!=='ready')return;
    const items=[];
    for(const r of rows){const pts=scanDateForCode(r.teacher_code,key);if(!pts.length)continue;const sig=signature(pts,key),status=!r.acknowledged_at?'missing':r.schedule_signature!==sig?'changed':'seen';items.push({...r,status,summary:reportText(pts,key)})}
    items.sort((a,b)=>{const rank=x=>x.status==='missing'?0:x.status==='changed'?1:2;return rank(a)-rank(b)||txt(a.group_name).localeCompare(txt(b.group_name),'vi')||txt(a.display_name).localeCompare(txt(b.display_name),'vi')});
    const card=q('lbgCheckinCard'),grid=card?.querySelector('.lbg-checkin-grid');if(!grid)return;
    let box=q('lbgAckMonitorV2');if(!box){box=document.createElement('div');box.id='lbgAckMonitorV2';box.className='lbg-checkin-panel lbg-checkin-wide lbg-ack-monitor';grid.appendChild(box)}
    const seen=items.filter(x=>x.status==='seen').length,changed=items.filter(x=>x.status==='changed').length,missing=items.filter(x=>x.status==='missing').length;
    const renderKey=JSON.stringify(items.map(x=>[x.user_id,x.status,x.acknowledged_at,x.schedule_signature,x.summary]));
    if(box.dataset.renderKey===renderKey)return;
    box.dataset.renderKey=renderKey;
    box.innerHTML=`<div class="lbg-tomorrow-head"><div><h4>👥 Theo dõi xác nhận lịch ngày mai</h4><p>${esc(dateLabel(key))} • Chỉ hiển thị giáo viên có lịch dạy theo TKB chung.</p></div><button class="btn outline mini" id="lbgAckRefreshV2">Làm mới</button></div><div class="lbg-ack-summary"><span class="lbg-checkin-pill">🔴 Chưa xem: ${missing}</span><span class="lbg-checkin-pill">⚠ Lịch đổi: ${changed}</span><span class="lbg-checkin-pill lbg-checkin-good">✅ Đã xem: ${seen}</span></div><div class="lbg-ack-table-wrap"><table class="lbg-ack-table"><thead><tr><th>Giáo viên</th><th>Nhóm</th><th>Lịch ngày mai</th><th>Trạng thái</th><th>Xác nhận lúc</th></tr></thead><tbody>${items.length?items.map(x=>`<tr class="${x.status==='missing'?'lbg-ack-row-missing':x.status==='changed'?'lbg-ack-row-changed':''}"><td><b>${esc(x.display_name)}</b><div class="lbg-checkin-meta">${esc(x.teacher_code)}${x.is_group_leader?' • Nhóm trưởng':''}</div></td><td>${esc(x.group_name||'—')}</td><td style="white-space:pre-wrap">${esc(x.summary)}</td><td>${x.status==='seen'?'✅ Đã xem':x.status==='changed'?'⚠ Lịch đã đổi':'🔴 Chưa xem'}</td><td>${esc(timeLabel(x.acknowledged_at))}</td></tr>`).join(''):'<tr><td colspan="5">Không có giáo viên nào trong phạm vi có lịch ngày mai.</td></tr>'}</tbody></table></div>`;
    q('lbgAckRefreshV2').onclick=()=>{monitorCache.loadedAt=0;renderMonitor(true).catch(e=>alert(e?.message||String(e)))};
  }

  async function loadPermissionRows(force=false){
    const now=Date.now();if(!force&&Array.isArray(permissionCache.rows)&&now-permissionCache.loadedAt<60000)return permissionCache.rows;
    const rows=await rpc('schedule_ack_monitor_people');permissionCache={rows:rows||[],loadedAt:Date.now()};return permissionCache.rows;
  }

  async function renderPermission(force=false){
    const c=context();if(!c?.is_owner){q('lbgAckPermissionV2')?.remove();return}
    let people;try{people=await loadPermissionRows(force)}catch{return}
    const card=q('lbgCheckinCard'),grid=card?.querySelector('.lbg-checkin-grid');if(!grid)return;
    let box=q('lbgAckPermissionV2');if(!box){box=document.createElement('div');box.id='lbgAckPermissionV2';box.className='lbg-checkin-panel lbg-checkin-wide lbg-ack-perm';grid.appendChild(box)}
    const renderKey=JSON.stringify(people.map(p=>[p.user_id,p.display_name,p.username,p.enabled]));if(box.dataset.renderKey===renderKey)return;box.dataset.renderKey=renderKey;
    box.innerHTML=`<div class="lbg-tomorrow-head"><div><h4>🔐 Quyền theo dõi xác nhận lịch dạy</h4><p>Nhóm trưởng tự thấy nhóm mình. Chủ sở hữu thấy toàn hệ thống. Tài khoản Quản lý chỉ thấy khi được cấp quyền riêng này.</p></div></div><div class="lbg-ack-perm-list">${people.length?people.map(p=>`<label class="lbg-ack-perm-row"><span><b>${esc(p.display_name)}</b><div class="lbg-checkin-meta">${esc(p.username)}</div></span><span><input type="checkbox" data-ack-perm-v2="${p.user_id}" ${p.enabled?'checked':''}> Cho phép theo dõi</span></label>`).join(''):'<div class="lbg-checkin-empty">Chưa có tài khoản Quản lý để cấp quyền.</div>'}</div>`;
    box.querySelectorAll('[data-ack-perm-v2]').forEach(el=>el.onchange=async()=>{el.disabled=true;try{await rpc('set_schedule_ack_monitor_permission',{p_user_id:el.dataset.ackPermV2,p_enabled:el.checked});const row=permissionCache.rows.find(x=>x.user_id===el.dataset.ackPermV2);if(row)row.enabled=el.checked;box.dataset.renderKey=''}catch(e){el.checked=!el.checked;alert('Không lưu được quyền: '+(e?.message||String(e)))}finally{el.disabled=false}});
  }

  async function apply(force=false){
    if(applying)return;applying=true;
    try{
      style();
      if(minuteNow()<=1020){q('lbgTomorrowReportV2')?.remove();q('lbgTomorrowSelfPanelV2')?.remove();q('lbgAckMonitorV2')?.remove();q('lbgAckPermissionV2')?.remove();return}
      await renderSelf(force);await renderMonitor(force);await renderPermission(force);
    }finally{applying=false}
  }

  function queue(force=false){forceQueued=forceQueued||force;if(queued)return;queued=true;setTimeout(()=>{const f=forceQueued;forceQueued=false;queued=false;apply(f).catch(console.error)},80)}
  function start(){style();queue(true);observer=new MutationObserver(()=>queue(false));observer.observe(document.body,{childList:true,subtree:true});timer=setInterval(()=>queue(false),30000)}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',()=>queue(true));
  document.addEventListener('lbg-cloud-file-opened',e=>{if(e?.detail?.scope==='shared'){shared.status='idle';ackCache.loadedAt=0;monitorCache.loadedAt=0;queue(true)}});
  window.addEventListener('focus',()=>{shared.status='idle';ackCache.loadedAt=0;monitorCache.loadedAt=0;queue(true)});
  window.addEventListener('beforeunload',()=>{observer?.disconnect();clearInterval(timer)},{once:true});
  window.LBGCheckinTomorrowReportV2={version:VERSION,refresh:()=>queue(true)};
})();