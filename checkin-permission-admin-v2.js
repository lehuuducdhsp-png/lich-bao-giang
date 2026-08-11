'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  const storageKey='lbg-checkin-permission-bucket-v2';
  let rows=[],gate=null,original=new Map(),loading=false,observer=null,queued=false;

  async function rpc(name,args={}){
    const api=window.LBGAuth;
    if(!api?.client)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');
    const{data,error}=await api.client.rpc(name,args);if(error)throw error;return data;
  }

  function style(){
    if(q('lbgCheckinPermissionAdminV2Css'))return;
    const s=document.createElement('style');s.id='lbgCheckinPermissionAdminV2Css';s.textContent=`
      #lbgCheckinPermissionAdminV2{position:relative}
      .lbg-perm-head{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
      .lbg-perm-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.lbg-perm-title h4{margin:0}
      .lbg-perm-pilot{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;background:#fff3e8;color:#9a5b36;font-size:10px;font-weight:900;letter-spacing:.02em}
      .lbg-perm-toolbar{display:grid;grid-template-columns:minmax(190px,280px) minmax(180px,1fr) auto auto;gap:8px;align-items:end;margin-top:12px}
      .lbg-perm-toolbar label{display:grid;gap:4px;font-size:12px;font-weight:800}.lbg-perm-toolbar select,.lbg-perm-toolbar input{width:100%;padding:9px 10px;border:1px solid #e2d2c8;border-radius:10px;background:#fff;box-sizing:border-box}
      .lbg-perm-summary{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 7px}.lbg-perm-summary .meta{margin:0}
      .lbg-perm-list{max-height:520px;overflow:auto;border:1px solid #eee3dc;border-radius:13px;background:#fff}
      .lbg-perm-table{width:100%;border-collapse:collapse}.lbg-perm-table th,.lbg-perm-table td{padding:9px 10px;border-bottom:1px solid #f1e8e2;vertical-align:middle;text-align:left}.lbg-perm-table th{position:sticky;top:0;z-index:2;background:#fff9f5;font-size:11px;color:#806b61}.lbg-perm-table tr:last-child td{border-bottom:0}.lbg-perm-table tr[data-dirty="1"]{background:#fffaf5}.lbg-perm-table td:first-child{min-width:190px}.lbg-perm-table input[type=text]{width:100%;min-width:150px;padding:8px 9px;border:1px solid #e2d2c8;border-radius:9px;background:#fff;box-sizing:border-box}.lbg-perm-table input[type=checkbox]{width:18px;height:18px;accent-color:#f4a261}.lbg-perm-role{font-size:12px;color:#654638}.lbg-perm-sub{font-size:11px;color:#806b61;margin-top:2px}.lbg-perm-empty{padding:18px;text-align:center;color:#806b61}.lbg-perm-unsaved{font-size:11px;font-weight:800;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:999px;padding:4px 7px}
      @media(max-width:850px){.lbg-perm-toolbar{grid-template-columns:1fr 1fr}.lbg-perm-toolbar .btn{width:100%}}
      @media(max-width:680px){.lbg-perm-toolbar{grid-template-columns:1fr}.lbg-perm-list{max-height:none;overflow:visible;border:0;background:transparent}.lbg-perm-table,.lbg-perm-table tbody,.lbg-perm-table tr,.lbg-perm-table td{display:block;width:100%;box-sizing:border-box}.lbg-perm-table thead{display:none}.lbg-perm-table tr{border:1px solid #eee3dc;border-radius:13px;background:#fff;margin:8px 0;overflow:hidden;padding:4px 0}.lbg-perm-table tr[data-dirty="1"]{border-color:#fdba74;background:#fffaf5}.lbg-perm-table td{border:0;padding:7px 11px;display:grid;grid-template-columns:110px minmax(0,1fr);gap:8px;align-items:center}.lbg-perm-table td:first-child{display:block;min-width:0;padding-top:11px}.lbg-perm-table td[data-label]::before{content:attr(data-label);font-size:11px;font-weight:800;color:#806b61}.lbg-perm-table input[type=text]{min-width:0}.lbg-perm-summary{margin-top:9px}}
    `;document.head.appendChild(s)
  }

  function currentContext(){return window.LBGAccess?.context||null}
  function eligibleViewer(){const c=currentContext();return Boolean(c?.is_owner||c?.is_group_leader)}
  function findOldPilotPanel(){
    return [...document.querySelectorAll('.lbg-checkin-panel')].find(p=>{
      if(p.id==='lbgCheckinPermissionAdminV2')return false;
      const h=txt(p.querySelector('h4')?.textContent);
      return h.includes('Nhóm thử nghiệm Check-in')||h.includes('Quản lý quyền Check-in');
    })||null
  }
  function checkinGrid(){return q('lbgCheckinCard')?.querySelector('.lbg-checkin-grid')||null}

  function roleName(r){if(r.is_group_leader)return'Nhóm trưởng';if(r.is_manager)return'Hành chính / Quản lý';return'Giáo viên'}
  function stateOfRow(el){return{can_checkin:Boolean(el.querySelector('[data-perm-checkin]')?.checked),can_review:Boolean(el.querySelector('[data-perm-review]')?.checked),note:txt(el.querySelector('[data-perm-note]')?.value)}}
  function stateKey(x){return JSON.stringify({can_checkin:Boolean(x.can_checkin),can_review:Boolean(x.can_review),note:txt(x.note)})}

  function buckets(){
    const map=new Map();
    for(const r of rows){const key=txt(r.bucket_key)||'ungrouped',name=txt(r.bucket_name)||'Chưa phân nhóm';if(!map.has(key))map.set(key,{key,name,count:0});map.get(key).count++}
    const list=[...map.values()];
    list.sort((a,b)=>{const rank=x=>x.key==='admin'?0:x.key==='ungrouped'?2:1;return rank(a)-rank(b)||a.name.localeCompare(b.name,'vi')});
    return list
  }

  function selectedBucket(){return q('lbgPermBucket')?.value||''}
  function renderRows(){
    const body=q('lbgPermBody');if(!body)return;
    body.innerHTML=rows.map(r=>{
      const checkDisabled=!r.can_edit_checkin,reviewDisabled=!r.can_edit_review;
      const checkTitle=checkDisabled?(r.is_group_leader?'Nhóm trưởng không thuộc đối tượng Check-in.':(!r.teacher_code?'Chưa có mã TKB nên chưa thể bật Check-in.':'Bạn không có quyền chỉnh mục này.')):'';
      const reviewTitle=reviewDisabled?(gate?.is_owner?'Chỉ Nhóm trưởng/Quản lý mới dùng quyền Kiểm tra.':'Quyền Kiểm tra do Chủ sở hữu quản lý; Nhóm trưởng chỉ bật/tắt Check-in cho giáo viên thường.'):'');
      return`<tr data-perm-user="${esc(r.user_id)}" data-bucket="${esc(r.bucket_key)}" data-dirty="0"><td><b>${esc(r.display_name)}</b><div class="lbg-perm-sub">${esc(r.username)}${r.teacher_code?` • Mã ${esc(r.teacher_code)}`:' • Chưa có mã TKB'}</div></td><td data-label="Vai trò"><span class="lbg-perm-role">${esc(roleName(r))}</span></td><td data-label="Check-in" title="${esc(checkTitle)}"><input type="checkbox" data-perm-checkin ${r.can_checkin?'checked':''} ${checkDisabled?'disabled':''}></td><td data-label="Kiểm tra" title="${esc(reviewTitle)}"><input type="checkbox" data-perm-review ${r.can_review?'checked':''} ${reviewDisabled?'disabled':''}></td><td data-label="Ghi chú"><input type="text" data-perm-note maxlength="200" value="${esc(r.note||'')}" placeholder="Tùy chọn"></td></tr>`
    }).join('');
    original=new Map(rows.map(r=>[String(r.user_id),stateKey(r)]));
    body.querySelectorAll('input').forEach(x=>x.addEventListener('input',onChanged));
    body.querySelectorAll('input[type=checkbox]').forEach(x=>x.addEventListener('change',onChanged));
    applyFilter();updateDirty()
  }

  function applyFilter(){
    const bucket=selectedBucket(),needle=txt(q('lbgPermSearch')?.value).toLocaleLowerCase('vi');let visible=0,total=0;
    document.querySelectorAll('#lbgPermBody [data-perm-user]').forEach(tr=>{const same=!bucket||tr.dataset.bucket===bucket;total+=same?1:0;const match=!needle||txt(tr.textContent).toLocaleLowerCase('vi').includes(needle);const show=same&&match;tr.hidden=!show;if(show)visible++});
    if(q('lbgPermVisible'))q('lbgPermVisible').textContent=`Hiển thị ${visible}/${total} tài khoản trong mục đang chọn.`;
    if(q('lbgPermEmpty'))q('lbgPermEmpty').hidden=visible>0
  }

  function dirtyRows(){return [...document.querySelectorAll('#lbgPermBody [data-perm-user]')].filter(tr=>original.get(String(tr.dataset.permUser))!==stateKey(stateOfRow(tr)))}
  function updateDirty(){
    const list=dirtyRows();document.querySelectorAll('#lbgPermBody [data-perm-user]').forEach(tr=>tr.dataset.dirty=list.includes(tr)?'1':'0');
    const save=q('lbgPermSaveAll'),undo=q('lbgPermUndo'),badge=q('lbgPermDirty');
    if(save){save.disabled=list.length===0;save.textContent=list.length?`Lưu tất cả (${list.length} thay đổi)`:'Lưu tất cả thay đổi'}
    if(undo)undo.disabled=list.length===0;
    if(badge){badge.hidden=list.length===0;badge.textContent=`${list.length} chưa lưu`}
  }
  function onChanged(){updateDirty();applyFilter()}

  function renderPanel(){
    const grid=checkinGrid();if(!grid)return false;
    let panel=q('lbgCheckinPermissionAdminV2');if(!panel){panel=document.createElement('div');panel.id='lbgCheckinPermissionAdminV2';panel.className='lbg-checkin-panel lbg-checkin-wide';grid.appendChild(panel)}
    const b=buckets();let remembered=sessionStorage.getItem(storageKey)||'';if(!b.some(x=>x.key===remembered))remembered=b[0]?.key||'';
    const owner=Boolean(gate?.is_owner);
    panel.innerHTML=`<div class="lbg-perm-head"><div><div class="lbg-perm-title"><h4>⚙️ Quản lý quyền Check-in</h4><span class="lbg-perm-pilot" title="PILOT là giai đoạn thử nghiệm giới hạn trước khi mở chính thức">PILOT • THỬ NGHIỆM</span></div><p style="margin:5px 0 0">${owner?'PILOT nghĩa là hệ thống đang thử nghiệm với một nhóm tài khoản giới hạn trước khi mở chính thức. Chủ sở hữu quản lý toàn hệ thống theo từng nhóm.':'Bạn chỉ bật/tắt Check-in cho giáo viên thường thuộc nhóm mình. Quyền “Kiểm tra” và phạm vi ngoài nhóm vẫn do Chủ sở hữu quản lý.'}</p></div><span id="lbgPermDirty" class="lbg-perm-unsaved" hidden></span></div><div class="lbg-checkin-note" style="margin-top:10px"><b>Cách dùng gọn khi có nhiều giáo viên:</b> chọn <b>Nhóm 1, Nhóm 2, Nhóm 3…</b> hoặc <b>Hành chính / Quản lý</b>, tìm tên nếu cần, chỉnh nhiều người rồi bấm <b>Lưu tất cả thay đổi</b> một lần.</div><div class="lbg-perm-toolbar"><label>Phạm vi<select id="lbgPermBucket">${b.map(x=>`<option value="${esc(x.key)}" ${x.key===remembered?'selected':''}>${esc(x.name)} (${x.count})</option>`).join('')}</select></label><label>Tìm giáo viên<input id="lbgPermSearch" type="search" placeholder="Tên, tài khoản hoặc mã TKB"></label><button class="btn outline" id="lbgPermUndo" disabled>Hoàn tác</button><button class="btn primary" id="lbgPermSaveAll" disabled>Lưu tất cả thay đổi</button></div><div class="lbg-perm-summary"><span id="lbgPermVisible" class="meta"></span>${owner?'<span class="meta">• “Kiểm tra” chỉ bật cho Nhóm trưởng/Hành chính phù hợp.</span>':'<span class="meta">• Nhóm trưởng không thể tự cấp quyền “Kiểm tra” cho thành viên.</span>'}</div><div class="lbg-perm-list"><table class="lbg-perm-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Check-in</th><th>Kiểm tra</th><th>Ghi chú</th></tr></thead><tbody id="lbgPermBody"></tbody></table><div id="lbgPermEmpty" class="lbg-perm-empty" hidden>Không có tài khoản phù hợp.</div></div>`;
    q('lbgPermBucket')?.addEventListener('change',e=>{sessionStorage.setItem(storageKey,e.target.value);applyFilter()});q('lbgPermSearch')?.addEventListener('input',applyFilter);q('lbgPermSaveAll')?.addEventListener('click',saveAll);q('lbgPermUndo')?.addEventListener('click',undoAll);
    renderRows();const old=findOldPilotPanel();if(old&&old!==panel)old.style.display='none';return true
  }

  function undoAll(){for(const tr of document.querySelectorAll('#lbgPermBody [data-perm-user]')){const r=rows.find(x=>String(x.user_id)===String(tr.dataset.permUser));if(!r)continue;const c=tr.querySelector('[data-perm-checkin]'),v=tr.querySelector('[data-perm-review]'),n=tr.querySelector('[data-perm-note]');if(c)c.checked=Boolean(r.can_checkin);if(v)v.checked=Boolean(r.can_review);if(n)n.value=r.note||''}updateDirty();applyFilter()}

  async function saveAll(){
    const changed=dirtyRows();if(!changed.length)return;
    const button=q('lbgPermSaveAll'),old=button.textContent;button.disabled=true;button.textContent='Đang lưu hàng loạt…';
    try{const payload=changed.map(tr=>({user_id:tr.dataset.permUser,...stateOfRow(tr)}));const result=await rpc('set_checkin_pilot_access_bulk',{p_changes:payload});button.textContent=`Đã lưu ${Number(result?.changed_count)||payload.length} thay đổi ✓`;await load(true);setTimeout(()=>{const b=q('lbgPermSaveAll');if(b&&!dirtyRows().length)b.textContent='Lưu tất cả thay đổi'},900)}catch(error){button.disabled=false;button.textContent=old;alert('Không lưu được quyền Check-in: '+(error?.message||String(error)))}
  }

  async function load(force=false){
    if(loading||!eligibleViewer()||!window.LBGAuth?.client)return;if(!force&&dirtyRows().length)return;loading=true;
    try{gate=await rpc('checkin_access_context');if(gate?.phase!=='pilot')return;const data=await rpc('checkin_permission_admin_list');rows=Array.isArray(data)?data:[];style();renderPanel()}catch(error){console.warn('Quản lý quyền Check-in V2 chưa sẵn sàng:',error?.message||error)}finally{loading=false}
  }

  function queue(){
    if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const panel=q('lbgCheckinPermissionAdminV2');if(panel){const old=findOldPilotPanel();if(old&&old!==panel)old.style.display='none';return}if(rows.length&&gate?.phase==='pilot')renderPanel();else load().catch(console.error)})
  }
  function start(){style();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});load().catch(console.error)}

  document.addEventListener('lbg-access-ready',()=>load(true).catch(console.error));
  window.LBGAuth?.onReady?.(()=>load(true).catch(console.error));
  window.addEventListener('focus',()=>{if(!dirtyRows().length)load(true).catch(console.error)});
  window.addEventListener('beforeunload',e=>{if(dirtyRows().length){e.preventDefault();e.returnValue=''}observer?.disconnect()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
