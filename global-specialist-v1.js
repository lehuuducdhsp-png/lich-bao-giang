'use strict';
(function(){
  if(!window.LBGAuth)return;
  const q=id=>document.getElementById(id),txt=v=>String(v??'').trim(),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let auth=null,observer=null,loading=false,people=[],queued=false;

  function style(){if(q('lbgGlobalSpecialistCss'))return;const s=document.createElement('style');s.id='lbgGlobalSpecialistCss';s.textContent=`.lbg-global-specialist{margin:14px 0;padding:15px;border:1px solid #99d5c9;border-radius:16px;background:linear-gradient(135deg,#f0fdfa,#f8fafc)}.lbg-global-specialist h4{margin:0;color:#0f5f5a;font-size:16px}.lbg-global-specialist p{margin:5px 0 12px;color:#475569;font-size:12px}.lbg-global-specialist-row{display:flex;gap:9px;align-items:end;flex-wrap:wrap}.lbg-global-specialist-row label{display:grid;gap:5px;min-width:310px;font-size:12px;font-weight:800}.lbg-global-specialist-row select{padding:10px 11px;border:1px solid #cbdde2;border-radius:11px;background:#fff}.lbg-global-specialist-status{margin-top:10px;padding:9px 11px;border-radius:11px;background:#fff;border:1px solid #dbe6eb;color:#334155;font-size:12px}.lbg-global-specialist-status.on{border-color:#86efac;background:#f0fdf4;color:#166534}@media(max-width:700px){.lbg-global-specialist-row{display:grid}.lbg-global-specialist-row label{min-width:0}}`;document.head.appendChild(s)}
  const context=()=>window.LBGAccess?.context||null,isOwner=()=>Boolean(context()?.is_owner);

  function cleanLegacy(){
    document.querySelectorAll('.lbg-group-section').forEach(section=>{const heading=txt(section.querySelector('h5,h4,h3')?.textContent);if(/Trưởng ban|phụ trách chuyên môn được xem nhóm/i.test(heading))section.remove()});
    q('lbgScopeBulkTools')?.remove();
    const card=q('lbgGroupsCard'),title=card?.querySelector('.head h3'),desc=q('lbgGroupsRoleText');
    if(title&&title.textContent!=='7. Quản lý nhóm và phân quyền')title.textContent='7. Quản lý nhóm và phân quyền';
    if(desc){
      const ctx=context();
      let value='Quyền nhóm do chủ sở hữu phân công.';
      if(ctx?.is_owner)value='Chủ sở hữu quản lý nhóm, nhóm trưởng, tài khoản Quản lý và quyền Trưởng ban chuyên môn.';
      else if(ctx?.is_manager&&ctx?.can_manage_groups&&ctx?.can_transfer_group_members)value='Quản lý được tạo/đổi tên nhóm và chuyển thành viên theo quyền Chủ sở hữu đã cấp.';
      else if(ctx?.is_manager&&ctx?.can_manage_groups)value='Quản lý được tạo và đổi tên nhóm; không có quyền chuyển thành viên.';
      else if(ctx?.is_manager&&ctx?.can_transfer_group_members)value='Quản lý được chuyển thành viên giữa các nhóm; không có quyền tạo/đổi tên nhóm.';
      else if(ctx?.is_manager)value='Tài khoản Quản lý chỉ sử dụng các quyền đã được Chủ sở hữu bật.';
      else if(ctx?.is_head_specialist&&ctx?.is_group_leader)value='Bạn là Nhóm trưởng và Trưởng ban chuyên môn; báo giảng được xem toàn hệ thống, quản lý thành viên chỉ trong nhóm mình.';
      else if(ctx?.is_head_specialist)value='Bạn là Trưởng ban chuyên môn; được kiểm tra báo giảng toàn bộ giáo viên nhưng không quản lý thành viên nhóm.';
      else if(ctx?.is_group_leader)value='Nhóm trưởng quản lý thành viên và báo giảng trong nhóm mình.';
      if(desc.textContent!==value)desc.textContent=value;
    }
  }

  async function loadPeople(){
    if(!auth||!isOwner()||loading)return;loading=true;
    try{const {data,error}=await auth.client.from('profiles').select('id,username,display_name,teacher_code,is_active,can_review_all_reports').neq('role','owner').order('display_name',{ascending:true});if(error)throw error;people=data||[];renderOwnerControl()}
    catch(error){const message=error?.message||String(error);if(/can_review_all_reports|column/i.test(message))showSetupWarning();else console.error('Không tải được danh sách Trưởng ban chuyên môn:',error)}
    finally{loading=false}
  }
  function showSetupWarning(){if(q('lbgGlobalSpecialistWarning'))return;const main=document.querySelector('main.shell');if(!main)return;const box=document.createElement('div');box.id='lbgGlobalSpecialistWarning';box.className='lbg-setup-warning';box.innerHTML='<b>Chưa kích hoạt quyền Trưởng ban chuyên môn:</b> chạy migration quyền mới trong Supabase SQL Editor.';main.prepend(box)}
  function options(){return'<option value="">Chọn tài khoản…</option>'+people.filter(p=>p.is_active).map(p=>`<option value="${p.id}">${esc(p.display_name)} — ${esc(p.username)}${p.teacher_code?' — '+esc(p.teacher_code):''}</option>`).join('')}
  function selectedPerson(){const id=q('lbgGlobalSpecialistPerson')?.value;return people.find(p=>p.id===id)||null}
  function updateStatus(){const person=selectedPerson(),box=q('lbgGlobalSpecialistStatus');if(!box)return;if(!person){box.className='lbg-global-specialist-status';box.textContent='Chọn tài khoản để xem trạng thái.';return}if(person.can_review_all_reports){box.className='lbg-global-specialist-status on';box.innerHTML=`<b>${esc(person.display_name)}</b> đang là Trưởng ban chuyên môn và được kiểm tra báo giảng của toàn bộ giáo viên.`}else{box.className='lbg-global-specialist-status';box.innerHTML=`<b>${esc(person.display_name)}</b> chưa có quyền Trưởng ban chuyên môn.`}}

  function renderOwnerControl(){
    if(!isOwner())return;const card=q('lbgGroupsCard');if(!card)return;
    let box=q('lbgGlobalSpecialistCard');if(!box){box=document.createElement('section');box.id='lbgGlobalSpecialistCard';box.className='lbg-global-specialist';(q('lbgOwnerCreateGroup')||card.querySelector('.head')).insertAdjacentElement('afterend',box)}
    const selected=q('lbgGlobalSpecialistPerson')?.value||'';
    box.innerHTML=`<h4>🎓 Trưởng ban chuyên môn toàn hệ thống</h4><p>Được chọn, kiểm tra, đối chiếu phiên bản và xuất báo giảng của toàn bộ giáo viên trong TKB. Không tự động có quyền xem bảng kê cá nhân, số tiền, quản lý tài khoản hoặc Google Sheets.</p><div class="lbg-global-specialist-row"><label>Tài khoản<select id="lbgGlobalSpecialistPerson">${options()}</select></label><button class="btn primary" id="lbgEnableGlobalSpecialist">Bật quyền</button><button class="btn outline danger" id="lbgDisableGlobalSpecialist">Thu hồi quyền</button></div><div class="lbg-global-specialist-status" id="lbgGlobalSpecialistStatus">Chọn tài khoản để xem trạng thái.</div>`;
    if(selected&&people.some(p=>p.id===selected))q('lbgGlobalSpecialistPerson').value=selected;
    q('lbgGlobalSpecialistPerson').onchange=updateStatus;q('lbgEnableGlobalSpecialist').onclick=()=>setPermission(true);q('lbgDisableGlobalSpecialist').onclick=()=>setPermission(false);updateStatus();
  }
  async function setPermission(enabled){
    const person=selectedPerson();if(!person)return alert('Hãy chọn tài khoản.');
    if(!confirm(enabled?`Bật quyền Trưởng ban chuyên môn toàn hệ thống cho ${person.display_name}?`:`Thu hồi quyền Trưởng ban chuyên môn của ${person.display_name}?`))return;
    const buttons=[q('lbgEnableGlobalSpecialist'),q('lbgDisableGlobalSpecialist')];buttons.forEach(b=>b&&(b.disabled=true));
    try{const {error}=await auth.client.rpc('set_global_specialist_access',{p_user_id:person.id,p_enabled:enabled});if(error)throw error;person.can_review_all_reports=enabled;updateStatus();alert(enabled?'Đã bật quyền Trưởng ban chuyên môn. Tài khoản cần đăng nhập lại để nhận phạm vi mới.':'Đã thu hồi quyền Trưởng ban chuyên môn. Tài khoản cần đăng nhập lại để cập nhật.')}
    catch(error){alert('Không cập nhật được quyền: '+(error?.message||String(error)))}finally{buttons.forEach(b=>b&&(b.disabled=false))}
  }

  function scan(){queued=false;cleanLegacy();if(isOwner()&&!q('lbgGlobalSpecialistCard'))loadPeople()}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(scan)}

  window.LBGAuth.onReady(a=>{auth=a;style();document.addEventListener('lbg-access-ready',()=>setTimeout(()=>{queue();loadPeople()},80));observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{queue();loadPeople()},400)});
  window.LBGAuth.onLogout(()=>{observer?.disconnect();observer=null;auth=null;people=[];queued=false;q('lbgGlobalSpecialistCard')?.remove();q('lbgGlobalSpecialistWarning')?.remove()});
})();
