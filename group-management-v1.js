'use strict';
(function(){
  if(!window.LBGAuth)return;
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const escHtml=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let auth=null,ctx=null,dashboard={groups:[],people:[]},notifications=[],searchCache=new Map();

  function style(){
    if(q('lbgGroupsCss'))return;
    const s=document.createElement('style');s.id='lbgGroupsCss';s.textContent=`
      .lbg-groups-card{background:#fff;border:1px solid #dbe6eb;border-radius:20px;padding:19px;box-shadow:0 14px 36px rgba(8,47,73,.09);margin-top:18px}.lbg-groups-toolbar{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.lbg-groups-toolbar label{display:grid;gap:5px;font-size:12px;font-weight:750;min-width:260px}.lbg-groups-toolbar input,.lbg-groups-toolbar select,.lbg-group-box input,.lbg-group-box select{padding:9px 10px;border:1px solid #dbe6eb;border-radius:10px;background:#fff}.lbg-groups-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.lbg-group-box{border:1px solid #dbe6eb;border-radius:16px;padding:14px;background:#fbfdff}.lbg-group-title{display:flex;gap:8px;justify-content:space-between;align-items:flex-start}.lbg-group-title h4{margin:0;color:#082f49}.lbg-group-meta{font-size:12px;color:#64748b;margin-top:3px}.lbg-group-section{margin-top:12px;padding-top:11px;border-top:1px solid #e5edf2}.lbg-group-section h5{margin:0 0 7px}.lbg-chip-list{display:flex;gap:6px;flex-wrap:wrap}.lbg-chip{display:inline-flex;gap:5px;align-items:center;padding:5px 8px;border-radius:999px;background:#eaf7f4;color:#0f766e;font-size:11px;font-weight:750}.lbg-member-list{max-height:220px;overflow:auto;border:1px solid #e5edf2;border-radius:11px;background:#fff}.lbg-member-row{display:grid;grid-template-columns:1fr auto;gap:7px;padding:8px 10px;border-bottom:1px solid #eef2f7;align-items:center}.lbg-member-row:last-child{border-bottom:0}.lbg-member-row small{color:#64748b}.lbg-inline{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.lbg-inline>*{min-width:0}.lbg-transfer-results{margin-top:8px;border:1px solid #e5edf2;border-radius:11px;overflow:hidden;background:#fff}.lbg-transfer-result{display:grid;grid-template-columns:1fr auto;gap:8px;padding:9px 10px;border-bottom:1px solid #eef2f7;align-items:center}.lbg-transfer-result:last-child{border-bottom:0}.lbg-people-table td,.lbg-people-table th{white-space:normal;vertical-align:middle}.lbg-month-result{margin-top:8px;padding:10px 12px;border-radius:11px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a}.lbg-notify-btn{position:relative}.lbg-notify-count{position:absolute;top:-6px;right:-6px;min-width:19px;height:19px;border-radius:999px;background:#dc2626;color:#fff;display:grid;place-items:center;font-size:10px;font-weight:900;padding:0 4px}.lbg-notify-dialog{border:0;border-radius:18px;padding:0;max-width:680px;width:calc(100% - 28px);box-shadow:0 24px 80px rgba(15,23,42,.3)}.lbg-notify-list{max-height:65vh;overflow:auto}.lbg-notify-item{padding:13px 15px;border-bottom:1px solid #e5edf2}.lbg-notify-item.unread{background:#eff6ff}.lbg-notify-item b{display:block;color:#082f49}.lbg-notify-item p{margin:4px 0;color:#334155}.lbg-notify-item small{color:#64748b}@media(max-width:900px){.lbg-groups-grid{grid-template-columns:1fr}}@media(max-width:620px){.lbg-groups-toolbar,.lbg-inline{display:grid}.lbg-groups-toolbar label{min-width:0}.lbg-transfer-result{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  async function rpc(name,args={}){
    const {data,error}=await auth.client.rpc(name,args);if(error)throw error;return data;
  }

  async function refreshAccess(){try{await window.LBGAccess?.refresh?.()}catch{}ctx=window.LBGAccess?.context||ctx}

  async function loadDashboard(){
    const data=await rpc('my_group_dashboard');dashboard=data||{groups:[],people:[]};render();
  }

  function roleText(){
    if(ctx?.is_owner)return'Chủ sở hữu quản lý toàn bộ nhóm và quyền.';
    if(ctx?.is_group_leader)return'Nhóm trưởng quản lý báo giảng trong nhóm; thống kê tuần vẫn xem toàn bộ giáo viên.';
    return'Phạm vi chuyên môn do chủ sở hữu chỉ định theo từng nhóm.';
  }

  function ensureCard(){
    if(q('lbgGroupsCard'))return q('lbgGroupsCard');
    if(!ctx||(!ctx.is_owner&&!(ctx.group_ids||[]).length))return null;
    style();const main=document.querySelector('main.shell');if(!main)return null;
    const card=document.createElement('section');card.id='lbgGroupsCard';card.className='lbg-groups-card';
    card.innerHTML=`<div class="head"><div><h3>7. Quản lý nhóm và phân quyền chuyên môn</h3><p id="lbgGroupsRoleText"></p></div><span class="badge" id="lbgGroupsCount">0 nhóm</span></div><div id="lbgOwnerCreateGroup"></div><div id="lbgGroupsBody"><div class="empty">Đang tải dữ liệu nhóm…</div></div><div id="lbgOwnerPeople"></div>`;
    main.appendChild(card);return card;
  }

  function peopleOptions(selected=''){
    return `<option value="">Chọn tài khoản…</option>`+(dashboard.people||[]).filter(x=>x.is_active).map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${escHtml(p.display_name)} — ${escHtml(p.username)}${p.teacher_code?' — '+escHtml(p.teacher_code):''}</option>`).join('');
  }

  function managerChips(group){
    return (group.managers||[]).length?(group.managers||[]).map(x=>`<span class="lbg-chip">${escHtml(x.display_name)}${x.is_primary?' • chính':''}${ctx?.is_owner?` <button class="btn mini outline danger" data-remove-manager="${group.id}|${x.user_id}">×</button>`:''}</span>`).join(''):'<span class="meta">Chưa phân công nhóm trưởng.</span>';
  }

  function accessChips(group){
    return (group.scoped_access||[]).length?(group.scoped_access||[]).map(x=>`<span class="lbg-chip">${escHtml(x.display_name)} • chuyên môn${ctx?.is_owner?` <button class="btn mini outline danger" data-remove-access="${group.id}|${x.user_id}">×</button>`:''}</span>`).join(''):'<span class="meta">Chưa cấp thêm phạm vi chuyên môn.</span>';
  }

  function memberRows(group){
    return (group.members||[]).length?(group.members||[]).map(x=>`<div class="lbg-member-row"><div><b>${escHtml(x.display_name)}</b><br><small>${escHtml(x.username)}${x.teacher_code?' • Mã '+escHtml(x.teacher_code):' • Chưa gán mã TKB'}</small></div><span class="badge">Từ ${new Date(x.valid_from).toLocaleDateString('vi-VN')}</span></div>`).join(''):'<div class="empty">Chưa có thành viên.</div>';
  }

  function groupBox(group){
    const canManage=Boolean(group.can_manage),owner=Boolean(ctx?.is_owner);
    return `<article class="lbg-group-box" data-group-box="${group.id}"><div class="lbg-group-title"><div><h4>${escHtml(group.name)}</h4><div class="lbg-group-meta">${(group.members||[]).length} thành viên • ${(group.managers||[]).length} nhóm trưởng</div></div>${owner?`<button class="btn outline mini" data-rename-group="${group.id}">Đổi tên</button>`:''}</div>
      <div class="lbg-group-section"><h5>Nhóm trưởng</h5><div class="lbg-chip-list">${managerChips(group)}</div>${owner?`<div class="lbg-inline" style="margin-top:8px"><select id="leader-${group.id}">${peopleOptions()}</select><label><input type="checkbox" id="primary-${group.id}"> Nhóm trưởng chính</label><button class="btn outline mini" data-add-manager="${group.id}">Phân công</button></div>`:''}</div>
      <div class="lbg-group-section"><h5>Trưởng ban/phụ trách chuyên môn được xem nhóm này</h5><div class="lbg-chip-list">${accessChips(group)}</div>${owner?`<div class="lbg-inline" style="margin-top:8px"><select id="access-${group.id}">${peopleOptions()}</select><button class="btn outline mini" data-add-access="${group.id}">Cấp quyền xem</button></div>`:''}</div>
      <div class="lbg-group-section"><h5>Thành viên</h5><div class="lbg-member-list">${memberRows(group)}</div></div>
      <div class="lbg-group-section"><h5>Tổng tiết tháng của nhóm</h5><div class="lbg-inline"><input type="month" id="month-${group.id}" value="${new Date().toISOString().slice(0,7)}"><button class="btn outline mini" data-month-total="${group.id}">Tính tổng</button></div><div id="month-result-${group.id}"></div></div>
      ${canManage?`<div class="lbg-group-section"><h5>Đưa thành viên vào nhóm</h5><div class="lbg-inline"><input id="search-${group.id}" placeholder="Nhập tên, tài khoản hoặc mã GV"><button class="btn primary mini" data-search-transfer="${group.id}">Tìm</button></div><div id="search-result-${group.id}"></div><div class="meta" style="margin-top:6px">Nếu người này đang ở nhóm khác, hệ thống chuyển ngay và gửi thông báo cho chủ sở hữu, nhóm cũ và nhóm mới.</div></div>`:''}
    </article>`;
  }

  function ownerPeople(){
    if(!ctx?.is_owner)return'';
    const rows=(dashboard.people||[]).map(p=>`<tr><td><b>${escHtml(p.display_name)}</b><br><small>${escHtml(p.username)}</small></td><td><input id="code-${p.id}" value="${escHtml(p.teacher_code||'')}" maxlength="24" placeholder="VD: TÂM"></td><td>${p.is_group_leader?'Nhóm trưởng':'Thành viên'}</td><td><label><input type="checkbox" data-payroll="${p.id}" ${p.can_view_payroll_details?'checked':''}> Xem bảng kê người khác</label></td><td><button class="btn outline mini" data-save-code="${p.id}">Lưu mã GV</button></td></tr>`).join('');
    return `<section class="lbg-group-section"><div class="head"><div><h3>Gán mã TKB và quyền nhạy cảm</h3><p>Mã giáo viên dùng để khóa đúng dữ liệu cá nhân. Quyền xem bảng kê người khác mặc định tắt.</p></div></div><div class="wrap lbg-people-table"><table><thead><tr><th>Tài khoản</th><th>Mã trong TKB</th><th>Vai trò nhóm</th><th>Quyền bảng kê</th><th>Thao tác</th></tr></thead><tbody>${rows||'<tr><td colspan="5"><div class="empty">Chưa có tài khoản thành viên.</div></td></tr>'}</tbody></table></div></section>`;
  }

  function render(){
    const card=ensureCard();if(!card)return;
    q('lbgGroupsRoleText').textContent=roleText();q('lbgGroupsCount').textContent=`${(dashboard.groups||[]).length} nhóm`;
    q('lbgOwnerCreateGroup').innerHTML=ctx?.is_owner?`<div class="lbg-groups-toolbar"><label>Tạo nhóm mới<input id="lbgNewGroupName" maxlength="80" placeholder="Ví dụ: Nhóm 1"></label><button class="btn primary" id="lbgCreateGroup">Tạo nhóm</button></div>`:'';
    q('lbgGroupsBody').innerHTML=(dashboard.groups||[]).length?`<div class="lbg-groups-grid">${dashboard.groups.map(groupBox).join('')}</div>`:'<div class="empty">Chưa có nhóm nào trong phạm vi tài khoản.</div>';
    q('lbgOwnerPeople').innerHTML=ownerPeople();bind();
  }

  function bind(){
    q('lbgCreateGroup')?.addEventListener('click',createGroup);
    document.querySelectorAll('[data-rename-group]').forEach(b=>b.onclick=()=>renameGroup(b.dataset.renameGroup));
    document.querySelectorAll('[data-add-manager]').forEach(b=>b.onclick=()=>addManager(b.dataset.addManager));
    document.querySelectorAll('[data-remove-manager]').forEach(b=>b.onclick=()=>removeManager(b.dataset.removeManager));
    document.querySelectorAll('[data-add-access]').forEach(b=>b.onclick=()=>addAccess(b.dataset.addAccess));
    document.querySelectorAll('[data-remove-access]').forEach(b=>b.onclick=()=>removeAccess(b.dataset.removeAccess));
    document.querySelectorAll('[data-search-transfer]').forEach(b=>b.onclick=()=>searchTransfer(b.dataset.searchTransfer));
    document.querySelectorAll('[data-month-total]').forEach(b=>b.onclick=()=>monthTotal(b.dataset.monthTotal));
    document.querySelectorAll('[data-save-code]').forEach(b=>b.onclick=()=>saveCode(b.dataset.saveCode));
    document.querySelectorAll('[data-payroll]').forEach(x=>x.onchange=()=>setPayroll(x.dataset.payroll,x.checked));
  }

  async function act(button,work){
    const old=button?.textContent;if(button){button.disabled=true;button.textContent='Đang xử lý…'}
    try{await work();await refreshAccess();await loadDashboard()}catch(e){alert(e?.message||String(e))}finally{if(button){button.disabled=false;button.textContent=old}}
  }

  async function createGroup(){
    const b=q('lbgCreateGroup'),name=txt(q('lbgNewGroupName')?.value);if(!name)return alert('Hãy nhập tên nhóm.');
    await act(b,async()=>{await rpc('create_teacher_group',{p_name:name})});
  }

  async function renameGroup(id){
    const group=dashboard.groups.find(x=>x.id===id),name=prompt('Tên nhóm mới:',group?.name||'');if(name===null)return;
    const b=document.querySelector(`[data-rename-group="${id}"]`);await act(b,async()=>rpc('rename_teacher_group',{p_group_id:id,p_name:txt(name)}));
  }

  async function addManager(groupId){
    const userId=q(`leader-${groupId}`)?.value;if(!userId)return alert('Hãy chọn tài khoản.');
    const b=document.querySelector(`[data-add-manager="${groupId}"]`),primary=q(`primary-${groupId}`)?.checked;
    await act(b,async()=>rpc('set_group_manager',{p_group_id:groupId,p_user_id:userId,p_enabled:true,p_is_primary:Boolean(primary),p_can_manage_members:true}));
  }

  async function removeManager(value){
    const [groupId,userId]=value.split('|');if(!confirm('Gỡ quyền nhóm trưởng của người này khỏi nhóm?'))return;
    const b=document.querySelector(`[data-remove-manager="${value}"]`);await act(b,async()=>rpc('set_group_manager',{p_group_id:groupId,p_user_id:userId,p_enabled:false,p_is_primary:false,p_can_manage_members:false}));
  }

  async function addAccess(groupId){
    const userId=q(`access-${groupId}`)?.value;if(!userId)return alert('Hãy chọn tài khoản.');
    const b=document.querySelector(`[data-add-access="${groupId}"]`);
    await act(b,async()=>rpc('set_group_scoped_access',{p_group_id:groupId,p_user_id:userId,p_enabled:true,p_can_review_reports:true,p_can_view_month_total:true,p_can_manage_members:false}));
  }

  async function removeAccess(value){
    const [groupId,userId]=value.split('|');if(!confirm('Thu hồi phạm vi chuyên môn ở nhóm này?'))return;
    const b=document.querySelector(`[data-remove-access="${value}"]`);await act(b,async()=>rpc('set_group_scoped_access',{p_group_id:groupId,p_user_id:userId,p_enabled:false,p_can_review_reports:false,p_can_view_month_total:false,p_can_manage_members:false}));
  }

  async function saveCode(userId){
    const b=document.querySelector(`[data-save-code="${userId}"]`),code=txt(q(`code-${userId}`)?.value).toUpperCase();
    await act(b,async()=>rpc('set_profile_teacher_code',{p_user_id:userId,p_teacher_code:code}));
  }

  async function setPayroll(userId,enabled){
    try{await rpc('set_payroll_detail_access',{p_user_id:userId,p_enabled:Boolean(enabled)});await refreshAccess()}catch(e){alert(e?.message||String(e));await loadDashboard()}
  }

  async function searchTransfer(groupId){
    const box=q(`search-result-${groupId}`),term=txt(q(`search-${groupId}`)?.value);if(term.length<2)return alert('Nhập ít nhất 2 ký tự.');
    box.innerHTML='<div class="empty">Đang tìm…</div>';
    try{
      const list=await rpc('search_group_transfer_candidates',{p_query:term});searchCache.set(groupId,list||[]);
      box.innerHTML=(list||[]).length?`<div class="lbg-transfer-results">${list.map((x,i)=>`<div class="lbg-transfer-result"><div><b>${escHtml(x.display_name)}</b> — ${escHtml(x.teacher_code||x.username)}<br><small>Hiện tại: ${escHtml(x.current_group_name||'Chưa phân nhóm')}</small></div><button class="btn primary mini" data-move="${groupId}|${i}">Chuyển vào nhóm</button></div>`).join('')}</div>`:'<div class="empty">Không tìm thấy giáo viên phù hợp.</div>';
      box.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>moveTeacher(b.dataset.move,b));
    }catch(e){box.innerHTML=`<div class="alert warn">${escHtml(e?.message||String(e))}</div>`}
  }

  async function moveTeacher(value,button){
    const [groupId,indexText]=value.split('|'),item=(searchCache.get(groupId)||[])[Number(indexText)],target=dashboard.groups.find(x=>x.id===groupId);if(!item||!target)return;
    const from=item.current_group_name||'Chưa phân nhóm';
    if(!confirm(`Chuyển giáo viên ${item.display_name} từ ${from} sang ${target.name}?\n\nHệ thống sẽ chuyển ngay, chống trùng thành viên và gửi thông báo cho chủ sở hữu, nhóm cũ và nhóm mới.`))return;
    await act(button,async()=>rpc('move_teacher_to_group',{p_user_id:item.user_id,p_new_group_id:groupId,p_effective_at:new Date().toISOString(),p_reason:''}));
  }

  function monthTotal(groupId){
    const group=dashboard.groups.find(x=>x.id===groupId),box=q(`month-result-${groupId}`),month=txt(q(`month-${groupId}`)?.value);if(!group||!month)return;
    try{
      if(typeof wb==='undefined'||!wb)throw new Error('Hãy mở một file TKB trước.');
      const api=window.LBGTeacherIntelligenceV6;if(!api?.scanSheet)throw new Error('Mô-đun thống kê chưa sẵn sàng.');
      const codes=new Set((group.members||[]).map(x=>txt(x.teacher_code).toUpperCase()).filter(Boolean));
      let total=0,morning=0,afternoon=0,makeUp=0,weeks=0;
      for(const ws of wb.worksheets){
        let scan;try{scan=api.scanSheet(ws)}catch{continue}
        const rows=(scan.source||[]).filter(e=>codes.has(txt(e.code).toUpperCase())&&e.dateKey?.startsWith(month));
        if(rows.length)weeks++;
        for(const e of rows){total++;if(e.session==='Sáng')morning++;else afternoon++;if(e.makeUp)makeUp++}
      }
      box.innerHTML=`<div class="lbg-month-result"><b>${escHtml(group.name)} — ${month.split('-').reverse().join('/')}</b><br>Tổng toàn nhóm: <b>${total} tiết</b> • Sáng: ${morning} • Chiều: ${afternoon} • Dạy bù: ${makeUp} • Có dữ liệu ở ${weeks} tuần.<br><small>Không hiển thị bảng kê chi tiết hoặc số tiền của từng cá nhân.</small></div>`;
    }catch(e){box.innerHTML=`<div class="alert warn">${escHtml(e?.message||String(e))}</div>`}
  }

  function ensureNotificationButton(){
    const bar=q('lbgUserBar');if(!bar||q('lbgNotifyButton'))return;
    const b=document.createElement('button');b.id='lbgNotifyButton';b.className='btn outline mini lbg-notify-btn';b.innerHTML='🔔 Thông báo <span class="lbg-notify-count" id="lbgNotifyCount" hidden>0</span>';b.onclick=openNotifications;bar.insertBefore(b,q('lbgChangePass'));
  }

  async function loadNotifications(){
    const {data,error}=await auth.client.from('user_notifications').select('*').order('created_at',{ascending:false}).limit(50);if(error)throw error;notifications=data||[];ensureNotificationButton();const unread=notifications.filter(x=>!x.read_at).length,c=q('lbgNotifyCount');if(c){c.textContent=String(unread);c.hidden=!unread}
  }

  function ensureNotifyDialog(){
    let d=q('lbgNotifyDialog');if(d)return d;
    d=document.createElement('dialog');d.id='lbgNotifyDialog';d.className='lbg-notify-dialog';d.innerHTML='<div style="padding:18px"><div class="head"><div><h3>Thông báo hệ thống</h3><p>Thông báo chuyển nhóm và thay đổi thuộc phạm vi quản lý.</p></div><button class="btn outline" id="lbgNotifyClose">Đóng</button></div><div class="lbg-notify-list" id="lbgNotifyList"></div></div>';document.body.appendChild(d);q('lbgNotifyClose').onclick=()=>d.close();return d;
  }

  async function openNotifications(){
    try{await loadNotifications();const d=ensureNotifyDialog(),box=q('lbgNotifyList');box.innerHTML=notifications.length?notifications.map(x=>`<article class="lbg-notify-item ${x.read_at?'':'unread'}" data-notification="${x.id}"><b>${escHtml(x.title)}</b><p>${escHtml(x.message)}</p><small>${new Date(x.created_at).toLocaleString('vi-VN')}</small></article>`).join(''):'<div class="empty">Chưa có thông báo.</div>';d.showModal();for(const x of notifications.filter(n=>!n.read_at)){rpc('mark_notification_read',{p_notification_id:x.id}).catch(console.error)}setTimeout(loadNotifications,400)}catch(e){alert(e?.message||String(e))}
  }

  async function start(){
    ctx=window.LBGAccess?.context;if(!ctx)return;
    style();ensureNotificationButton();loadNotifications().catch(console.error);
    if(ctx.is_owner||(ctx.group_ids||[]).length){ensureCard();await loadDashboard()}
    clearInterval(window.__lbgNotifyTimer);window.__lbgNotifyTimer=setInterval(()=>loadNotifications().catch(console.error),60000);
  }

  document.addEventListener('lbg-access-ready',()=>start().catch(e=>console.error(e)));
  window.LBGAuth.onReady(a=>{auth=a;if(window.LBGAccess?.context)start().catch(console.error)});
  window.LBGAuth.onLogout(()=>{clearInterval(window.__lbgNotifyTimer);q('lbgGroupsCard')?.remove();q('lbgNotifyButton')?.remove();q('lbgNotifyDialog')?.remove();auth=null;ctx=null;dashboard={groups:[],people:[]}});
})();
