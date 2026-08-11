'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  const storeKey='lbg-checkin-permission-bucket-v3';
  let gate=null,rows=[],original=new Map(),loading=false,observer=null,retryTimer=null;

  async function rpc(name,args={}){
    const api=window.LBGAuth;
    if(!api?.client)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');
    const {data,error}=await api.client.rpc(name,args);
    if(error)throw error;
    return data;
  }

  function style(){
    if(q('lbgCheckinPermissionAdminV3Css'))return;
    const s=document.createElement('style');
    s.id='lbgCheckinPermissionAdminV3Css';
    s.textContent=`
      #lbgCheckinPermissionAdminV3{position:relative}
      .lbg-p3-head{display:flex;gap:10px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
      .lbg-p3-title{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lbg-p3-title h4{margin:0}
      .lbg-p3-pilot{display:inline-flex;padding:5px 8px;border-radius:999px;background:#fff3e8;color:#9a5b36;font-size:10px;font-weight:900}
      .lbg-p3-tools{display:grid;grid-template-columns:minmax(190px,260px) minmax(180px,1fr) auto auto;gap:8px;align-items:end;margin:12px 0 8px}
      .lbg-p3-tools label{display:grid;gap:4px;font-size:12px;font-weight:800}.lbg-p3-tools select,.lbg-p3-tools input{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #e2d2c8;border-radius:10px;background:#fff}
      .lbg-p3-wrap{max-height:520px;overflow:auto;border:1px solid #eee3dc;border-radius:13px;background:#fff}
      .lbg-p3-table{width:100%;border-collapse:collapse}.lbg-p3-table th,.lbg-p3-table td{padding:9px 10px;border-bottom:1px solid #f1e8e2;text-align:left;vertical-align:middle}.lbg-p3-table th{position:sticky;top:0;z-index:2;background:#fff9f5;font-size:11px;color:#806b61}.lbg-p3-table tr:last-child td{border-bottom:0}.lbg-p3-table tr[data-dirty="1"]{background:#fffaf5}.lbg-p3-table input[type=checkbox]{width:18px;height:18px;accent-color:#f4a261}.lbg-p3-table input[type=text]{width:100%;min-width:140px;box-sizing:border-box;padding:8px 9px;border:1px solid #e2d2c8;border-radius:9px;background:#fff}.lbg-p3-sub{font-size:11px;color:#806b61;margin-top:2px}.lbg-p3-meta{font-size:11px;color:#806b61}.lbg-p3-dirty{font-size:11px;font-weight:800;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:999px;padding:4px 7px}
      @media(max-width:760px){.lbg-p3-tools{grid-template-columns:1fr 1fr}.lbg-p3-tools .btn{width:100%}}
      @media(max-width:650px){.lbg-p3-tools{grid-template-columns:1fr}.lbg-p3-wrap{max-height:none;overflow:visible;border:0;background:transparent}.lbg-p3-table,.lbg-p3-table tbody,.lbg-p3-table tr,.lbg-p3-table td{display:block;width:100%;box-sizing:border-box}.lbg-p3-table thead{display:none}.lbg-p3-table tr{border:1px solid #eee3dc;border-radius:13px;background:#fff;margin:8px 0;padding:4px 0}.lbg-p3-table td{border:0;padding:7px 11px;display:grid;grid-template-columns:105px minmax(0,1fr);gap:8px;align-items:center}.lbg-p3-table td:first-child{display:block}.lbg-p3-table td[data-label]::before{content:attr(data-label);font-size:11px;font-weight:800;color:#806b61}.lbg-p3-table input[type=text]{min-width:0}}
    `;
    document.head.appendChild(s);
  }

  function grid(){return q('lbgCheckinCard')?.querySelector('.lbg-checkin-grid')||null}
  function role(r){return r.is_group_leader?'Nhóm trưởng':r.is_manager?'Hành chính / Quản lý':'Giáo viên'}
  function buckets(){
    const m=new Map();
    rows.forEach(r=>{const key=txt(r.bucket_key)||'ungrouped',name=txt(r.bucket_name)||'Chưa phân nhóm';if(!m.has(key))m.set(key,{key,name,count:0});m.get(key).count++});
    return [...m.values()].sort((a,b)=>{const rank=x=>x.key==='admin'?0:x.key==='ungrouped'?2:1;return rank(a)-rank(b)||a.name.localeCompare(b.name,'vi')});
  }
  function rowState(tr){return{can_checkin:Boolean(tr.querySelector('[data-p3-check]')?.checked),can_review:Boolean(tr.querySelector('[data-p3-review]')?.checked),note:txt(tr.querySelector('[data-p3-note]')?.value)}}
  function keyState(x){return JSON.stringify({can_checkin:Boolean(x.can_checkin),can_review:Boolean(x.can_review),note:txt(x.note)})}
  function dirtyRows(){return [...document.querySelectorAll('#lbgP3Body [data-p3-user]')].filter(tr=>original.get(String(tr.dataset.p3User))!==keyState(rowState(tr)))}

  function hideLegacy(){
    document.querySelectorAll('.lbg-checkin-panel').forEach(p=>{
      if(p.id==='lbgCheckinPermissionAdminV3')return;
      const h=txt(p.querySelector('h4')?.textContent);
      if(h.includes('Nhóm thử nghiệm Check-in')||h.includes('Quản lý quyền Check-in'))p.style.display='none';
    });
    const v2=q('lbgCheckinPermissionAdminV2');if(v2)v2.style.display='none';
  }

  function applyFilter(){
    const bucket=q('lbgP3Bucket')?.value||'',needle=txt(q('lbgP3Search')?.value).toLocaleLowerCase('vi');let visible=0,total=0;
    document.querySelectorAll('#lbgP3Body [data-p3-user]').forEach(tr=>{const same=!bucket||tr.dataset.bucket===bucket;if(same)total++;const match=!needle||txt(tr.textContent).toLocaleLowerCase('vi').includes(needle);const show=same&&match;tr.hidden=!show;if(show)visible++});
    if(q('lbgP3Visible'))q('lbgP3Visible').textContent=`Hiển thị ${visible}/${total} tài khoản trong mục đang chọn.`;
  }
  function updateDirty(){
    const dirty=dirtyRows();document.querySelectorAll('#lbgP3Body [data-p3-user]').forEach(tr=>tr.dataset.dirty=dirty.includes(tr)?'1':'0');
    const save=q('lbgP3SaveAll'),undo=q('lbgP3Undo'),badge=q('lbgP3Dirty');
    if(save){save.disabled=!dirty.length;save.textContent=dirty.length?`Lưu tất cả (${dirty.length} thay đổi)`:'Lưu tất cả thay đổi'}
    if(undo)undo.disabled=!dirty.length;
    if(badge){badge.hidden=!dirty.length;badge.textContent=`${dirty.length} chưa lưu`}
  }

  function renderRows(){
    const body=q('lbgP3Body');if(!body)return;
    body.innerHTML=rows.map(r=>`<tr data-p3-user="${esc(r.user_id)}" data-bucket="${esc(r.bucket_key)}" data-dirty="0"><td><b>${esc(r.display_name)}</b><div class="lbg-p3-sub">${esc(r.username)}${r.teacher_code?` • Mã ${esc(r.teacher_code)}`:' • Chưa có mã TKB'}</div></td><td data-label="Vai trò">${esc(role(r))}</td><td data-label="Check-in"><input type="checkbox" data-p3-check ${r.can_checkin?'checked':''} ${r.can_edit_checkin?'':'disabled'}></td><td data-label="Kiểm tra"><input type="checkbox" data-p3-review ${r.can_review?'checked':''} ${r.can_edit_review?'':'disabled'}></td><td data-label="Ghi chú"><input type="text" data-p3-note maxlength="200" value="${esc(r.note||'')}" placeholder="Tùy chọn"></td></tr>`).join('');
    original=new Map(rows.map(r=>[String(r.user_id),keyState(r)]));
    body.querySelectorAll('input').forEach(x=>{x.addEventListener('input',()=>{updateDirty();applyFilter()});x.addEventListener('change',()=>{updateDirty();applyFilter()})});
    applyFilter();updateDirty();
  }

  function render(){
    const g=grid();if(!g)return false;style();
    let p=q('lbgCheckinPermissionAdminV3');if(!p){p=document.createElement('div');p.id='lbgCheckinPermissionAdminV3';p.className='lbg-checkin-panel lbg-checkin-wide';g.appendChild(p)}
    const bs=buckets();let selected=sessionStorage.getItem(storeKey)||'';if(!bs.some(x=>x.key===selected))selected=bs[0]?.key||'';
    p.innerHTML=`<div class="lbg-p3-head"><div><div class="lbg-p3-title"><h4>⚙️ Quản lý quyền Check-in</h4><span class="lbg-p3-pilot">PILOT • THỬ NGHIỆM</span></div><p style="margin:5px 0 0">${gate?.is_owner?'PILOT là giai đoạn thử nghiệm giới hạn trước khi mở chính thức. Chủ sở hữu quản lý toàn hệ thống theo từng nhóm.':'Bạn chỉ bật/tắt Check-in cho giáo viên thường thuộc nhóm mình; quyền Kiểm tra vẫn do Chủ sở hữu quản lý.'}</p></div><span id="lbgP3Dirty" class="lbg-p3-dirty" hidden></span></div><div class="lbg-checkin-note"><b>Quản lý gọn:</b> chọn Nhóm/Hành chính, tìm tên nếu cần, chỉnh nhiều tài khoản rồi bấm <b>Lưu tất cả thay đổi</b> một lần.</div><div class="lbg-p3-tools"><label>Phạm vi<select id="lbgP3Bucket">${bs.map(x=>`<option value="${esc(x.key)}" ${x.key===selected?'selected':''}>${esc(x.name)} (${x.count})</option>`).join('')}</select></label><label>Tìm giáo viên<input id="lbgP3Search" type="search" placeholder="Tên, tài khoản hoặc mã TKB"></label><button class="btn outline" id="lbgP3Undo" disabled>Hoàn tác</button><button class="btn primary" id="lbgP3SaveAll" disabled>Lưu tất cả thay đổi</button></div><div class="lbg-p3-meta" id="lbgP3Visible"></div><div class="lbg-p3-wrap"><table class="lbg-p3-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Check-in</th><th>Kiểm tra</th><th>Ghi chú</th></tr></thead><tbody id="lbgP3Body"></tbody></table></div>`;
    q('lbgP3Bucket').onchange=e=>{sessionStorage.setItem(storeKey,e.target.value);applyFilter()};q('lbgP3Search').oninput=applyFilter;q('lbgP3Undo').onclick=undo;q('lbgP3SaveAll').onclick=saveAll;
    renderRows();hideLegacy();return true;
  }

  function undo(){renderRows()}
  async function saveAll(){
    const changed=dirtyRows();if(!changed.length)return;const b=q('lbgP3SaveAll'),old=b.textContent;b.disabled=true;b.textContent='Đang lưu hàng loạt…';
    try{const payload=changed.map(tr=>({user_id:tr.dataset.p3User,...rowState(tr)}));const result=await rpc('set_checkin_pilot_access_bulk',{p_changes:payload});b.textContent=`Đã lưu ${Number(result?.changed_count)||payload.length} thay đổi ✓`;await load(true)}catch(e){b.disabled=false;b.textContent=old;alert('Không lưu được quyền Check-in: '+(e?.message||String(e)))}
  }

  function showError(e){
    const g=grid();if(!g)return;let p=q('lbgCheckinPermissionAdminV3');if(!p){p=document.createElement('div');p.id='lbgCheckinPermissionAdminV3';p.className='lbg-checkin-panel lbg-checkin-wide';g.appendChild(p)}
    p.innerHTML=`<h4 style="margin-top:0">⚙️ Quản lý quyền Check-in</h4><div class="lbg-checkin-note lbg-checkin-warn"><b>Chưa tải được bảng quyền mới.</b><br>${esc(e?.message||String(e))}</div>`;hideLegacy();
  }

  async function load(force=false){
    if(loading||!window.LBGAuth?.client)return;if(!force&&dirtyRows().length)return;loading=true;
    try{gate=await rpc('checkin_access_context');if(gate?.phase!=='pilot'||(!gate?.is_owner&&!gate?.is_group_leader))return;rows=await rpc('checkin_permission_admin_list')||[];render()}catch(e){console.error('Check-in permission V3:',e);showError(e)}finally{loading=false}
  }

  function start(){
    style();load(true);observer=new MutationObserver(()=>{hideLegacy();if(!q('lbgCheckinPermissionAdminV3')&&rows.length)render();});observer.observe(document.body,{childList:true,subtree:true});
    let tries=0;retryTimer=setInterval(()=>{tries++;if(!q('lbgCheckinPermissionAdminV3'))load(true);else hideLegacy();if(tries>=30)clearInterval(retryTimer)},1000);
  }
  document.addEventListener('lbg-access-ready',()=>load(true));window.LBGAuth?.onReady?.(()=>load(true));window.addEventListener('focus',()=>load(true));window.addEventListener('beforeunload',()=>{observer?.disconnect();clearInterval(retryTimer)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
