'use strict';
(function(){
  if(!window.LBGAuth)return;
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let auth=null,ctx=null,people=[],observer=null,queued=false,loading=false;

  const PERMS=[
    ['weekly_stats','Xem thống kê tuần','Xem thống kê tuần của toàn bộ giáo viên.'],
    ['manage_groups','Quản lý nhóm','Tạo nhóm và đổi tên nhóm; không tự bao gồm quyền chuyển thành viên.'],
    ['transfer_members','Chuyển thành viên','Đưa/chuyển thành viên giữa các nhóm và ghi nhật ký thay đổi.'],
    ['upload_shared','Tải TKB chung','Được tải phiên bản TKB lên kho chung.'],
    ['activate_shared_tkb','Áp dụng TKB chung','Được chọn phiên bản TKB chung đang áp dụng cho hệ thống.'],
    ['review_all_reports','Xem báo giảng toàn hệ thống','Được chọn, kiểm tra và xuất báo giảng của toàn bộ giáo viên trong TKB.'],
    ['view_other_payroll','Xem bảng kê người khác','Được xem bảng kê chi tiết của người khác.'],
    ['view_payroll_amounts','Xem số tiền/lương','Được xem thông tin tiền trong bảng kê; chỉ có hiệu lực khi đã bật quyền xem bảng kê người khác.']
  ];

  function style(){
    if(q('lbgManagerPermCss'))return;
    const s=document.createElement('style');s.id='lbgManagerPermCss';s.textContent=`
      .lbg-manager-card{background:#fff;border:1px solid #dbe6eb;border-radius:20px;padding:19px;box-shadow:0 14px 36px rgba(8,47,73,.09);margin-top:18px}.lbg-manager-grid{display:grid;grid-template-columns:minmax(240px,320px) 1fr;gap:14px;margin-top:13px}.lbg-manager-person{display:grid;gap:7px;align-content:start}.lbg-manager-person select{width:100%;padding:10px 11px;border:1px solid #dbe6eb;border-radius:11px;background:#fff}.lbg-manager-role{padding:11px;border-radius:13px;background:#f8fafc;border:1px solid #dbe6eb}.lbg-manager-perms{display:grid;grid-template-columns:1fr 1fr;gap:8px}.lbg-manager-perm{display:grid;grid-template-columns:auto 1fr;gap:9px;align-items:start;padding:10px 11px;border:1px solid #dbe6eb;border-radius:12px;background:#fbfdff}.lbg-manager-perm input{width:18px;height:18px;margin-top:2px}.lbg-manager-perm b{display:block;color:#082f49}.lbg-manager-perm small{display:block;color:#64748b;line-height:1.35;margin-top:2px}.lbg-manager-safe{margin-top:12px;padding:10px 12px;border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;color:#9a3412;font-size:12px}.lbg-manager-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}.lbg-manager-group-toolbar{margin:12px 0;padding:11px 12px;border:1px solid #bfdbfe;border-radius:13px;background:#eff6ff;display:flex;gap:8px;align-items:end;flex-wrap:wrap}.lbg-manager-group-toolbar label{display:grid;gap:5px;min-width:260px;font-size:12px;font-weight:800}.lbg-manager-group-toolbar input{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff}.lbg-payroll-money-hidden{display:none!important}@media(max-width:820px){.lbg-manager-grid{grid-template-columns:1fr}.lbg-manager-perms{grid-template-columns:1fr}}@media(max-width:620px){.lbg-manager-card{padding:13px}.lbg-manager-group-toolbar{display:grid}.lbg-manager-group-toolbar label{min-width:0}.lbg-manager-actions{display:grid}.lbg-manager-actions .btn{width:100%}}
    `;document.head.appendChild(s);
  }

  function context(){return window.LBGAccess?.context||ctx||null}
  function isOwner(){return Boolean(context()?.is_owner)}
  function currentPerson(){const id=q('lbgManagerPerson')?.value;return people.find(p=>p.id===id)||null}
  function permValue(person,key){return Boolean(person?.[`manager_can_${key}`])}

  async function loadPeople(){
    if(!auth||!isOwner()||loading)return;
    loading=true;
    try{
      const fields=['id','username','display_name','teacher_code','is_active','is_manager',...PERMS.map(([k])=>`manager_can_${k}`)].join(',');
      const {data,error}=await auth.client.from('profiles').select(fields).neq('role','owner').order('display_name',{ascending:true});
      if(error)throw error;
      people=data||[];renderOwnerCard();
    }catch(error){
      const message=error?.message||String(error);
      if(/is_manager|manager_can_/i.test(message))showSetupWarning();
      else console.error('Không tải được quyền Quản lý:',error);
    }finally{loading=false}
  }

  function showSetupWarning(){
    if(q('lbgManagerSetupWarning'))return;
    const main=document.querySelector('main.shell');if(!main)return;
    const n=document.createElement('div');n.id='lbgManagerSetupWarning';n.className='lbg-setup-warning';n.innerHTML='<b>Chưa kích hoạt vai trò Quản lý:</b> hãy chạy tệp <code>20260808_manager_permissions.sql</code> trong Supabase SQL Editor.';main.prepend(n);
  }

  function ownerHost(){return q('lbgGroupsCard')||document.querySelector('main.shell')}
  function renderOwnerCard(){
    if(!isOwner())return;
    let card=q('lbgManagerPermissionsCard');
    if(!card){card=document.createElement('section');card.id='lbgManagerPermissionsCard';card.className='lbg-manager-card';ownerHost()?.insertAdjacentElement('afterend',card)}
    const selected=q('lbgManagerPerson')?.value||'';
    card.innerHTML=`<div class="head"><div><h3>🧭 Tài khoản Quản lý và quyền chi tiết</h3><p>Quản lý có thể không có mã TKB. Mỗi quyền dưới đây được cấp độc lập bởi Chủ sở hữu.</p></div><span class="badge">Chủ sở hữu cấp quyền</span></div><div class="lbg-manager-grid"><div class="lbg-manager-person"><label><b>Tài khoản</b><select id="lbgManagerPerson"><option value="">Chọn tài khoản…</option>${people.filter(p=>p.is_active).map(p=>`<option value="${p.id}">${esc(p.display_name)} — ${esc(p.username)}${p.teacher_code?' — '+esc(p.teacher_code):' — không có mã TKB'}</option>`).join('')}</select></label><label class="lbg-manager-role"><input type="checkbox" id="lbgManagerEnabled"> <b>Đặt là tài khoản Quản lý</b><small>Không bắt buộc liên kết mã giáo viên.</small></label><div id="lbgManagerStatus" class="notice">Chọn tài khoản để xem quyền.</div></div><div><div class="lbg-manager-perms">${PERMS.map(([key,label,desc])=>`<label class="lbg-manager-perm"><input type="checkbox" data-manager-perm="${key}"><span><b>${esc(label)}</b><small>${esc(desc)}</small></span></label>`).join('')}</div><div class="lbg-manager-safe"><b>Luôn chỉ Chủ sở hữu:</b> quản lý tài khoản/mật khẩu, Google Sheets và cài đặt thương hiệu/logo. Các quyền này không xuất hiện để cấp cho Quản lý.</div><div class="lbg-manager-actions"><button class="btn outline" id="lbgManagerClear">Bỏ vai trò Quản lý</button><button class="btn primary" id="lbgManagerSave">Lưu quyền Quản lý</button></div></div></div>`;
    if(selected&&people.some(p=>p.id===selected))q('lbgManagerPerson').value=selected;
    q('lbgManagerPerson').onchange=fillPerson;
    q('lbgManagerEnabled').onchange=syncEnabled;
    q('lbgManagerClear').onclick=()=>save(false);
    q('lbgManagerSave').onclick=()=>save(Boolean(q('lbgManagerEnabled')?.checked));
    q('lbgManagerPerson').value?fillPerson():syncEnabled();
  }

  function fillPerson(){
    const p=currentPerson(),status=q('lbgManagerStatus');
    q('lbgManagerEnabled').checked=Boolean(p?.is_manager);
    PERMS.forEach(([key])=>{const el=document.querySelector(`[data-manager-perm="${key}"]`);if(el)el.checked=permValue(p,key)});
    if(status){
      if(!p)status.textContent='Chọn tài khoản để xem quyền.';
      else status.innerHTML=`<b>${esc(p.display_name)}</b> • ${p.is_manager?'Quản lý':'Chưa phải Quản lý'} • ${p.teacher_code?'Mã TKB '+esc(p.teacher_code):'Không có mã TKB'}`;
    }
    syncEnabled();
  }

  function syncEnabled(){
    const enabled=Boolean(q('lbgManagerEnabled')?.checked)&&Boolean(currentPerson());
    document.querySelectorAll('[data-manager-perm]').forEach(x=>x.disabled=!enabled);
    const payroll=document.querySelector('[data-manager-perm="view_other_payroll"]');
    const money=document.querySelector('[data-manager-perm="view_payroll_amounts"]');
    if(money){money.disabled=!enabled||!payroll?.checked;if(!payroll?.checked)money.checked=false}
    if(payroll&&!payroll.dataset.managerBound){payroll.dataset.managerBound='1';payroll.addEventListener('change',syncEnabled)}
    if(q('lbgManagerSave'))q('lbgManagerSave').disabled=!currentPerson();
    if(q('lbgManagerClear'))q('lbgManagerClear').disabled=!currentPerson();
  }

  function collect(){const out={};PERMS.forEach(([key])=>out[key]=Boolean(document.querySelector(`[data-manager-perm="${key}"]`)?.checked));if(!out.view_other_payroll)out.view_payroll_amounts=false;return out}

  async function save(asManager){
    const p=currentPerson();if(!p)return alert('Hãy chọn tài khoản.');
    const button=asManager?q('lbgManagerSave'):q('lbgManagerClear'),old=button?.textContent;
    if(!confirm(asManager?`Lưu quyền Quản lý cho ${p.display_name}?`:`Bỏ vai trò Quản lý của ${p.display_name}?`))return;
    if(button){button.disabled=true;button.textContent='Đang lưu…'}
    try{
      const permissions=asManager?collect():{};
      const {error}=await auth.client.rpc('set_manager_permissions',{p_user_id:p.id,p_is_manager:asManager,p_permissions:permissions});
      if(error)throw error;
      Object.assign(p,{is_manager:asManager});PERMS.forEach(([key])=>p[`manager_can_${key}`]=asManager&&Boolean(permissions[key]));
      fillPerson();
      alert(asManager?'Đã lưu quyền Quản lý. Tài khoản đó cần đăng nhập lại để nhận quyền mới.':'Đã bỏ vai trò Quản lý và thu hồi các quyền Quản lý.');
    }catch(error){alert('Không lưu được quyền Quản lý: '+(error?.message||String(error)))}
    finally{if(button){button.disabled=false;button.textContent=old}}
  }

  function roleLabel(){
    const c=context(),chip=q('lbgUserBar')?.querySelector('.lbg-userchip');if(!c||!chip||c.is_owner||!c.is_manager)return;
    const name=auth?.profile?.display_name||auth?.profile?.username||'';
    const roles=['Quản lý'];if(c.is_group_leader)roles.push('Nhóm trưởng');if(c.is_head_specialist)roles.push('Trưởng ban chuyên môn');
    const html=`<b>${esc(name)}</b> • ${roles.join(' • ')}`;
    if(chip.innerHTML!==html){chip.innerHTML=html;chip.dataset.lbgAccessHtml=html}
  }

  function enhanceManagerGroups(){
    const c=context();if(!c?.is_manager||c.is_owner)return;
    const card=q('lbgGroupsCard');if(!card)return;
    const role=q('lbgGroupsRoleText');if(role)role.textContent=c.can_manage_groups&&c.can_transfer_group_members?'Quản lý được tạo/đổi tên nhóm và chuyển thành viên theo quyền Chủ sở hữu đã cấp.':c.can_manage_groups?'Quản lý được tạo và đổi tên nhóm; không có quyền chuyển thành viên.':c.can_transfer_group_members?'Quản lý được chuyển thành viên giữa các nhóm; không có quyền tạo/đổi tên nhóm.':'Tài khoản Quản lý đang xem phạm vi được cấp.';

    if(c.can_manage_groups&&!q('lbgManagerGroupToolbar')){
      const host=q('lbgOwnerCreateGroup');if(host){
        const d=document.createElement('div');d.id='lbgManagerGroupToolbar';d.className='lbg-manager-group-toolbar';d.innerHTML='<label>Tạo nhóm mới<input id="lbgManagerNewGroup" maxlength="80" placeholder="Nhập tên nhóm"></label><button class="btn primary" id="lbgManagerCreateGroup">Tạo nhóm</button>';host.appendChild(d);
        q('lbgManagerCreateGroup').onclick=async()=>{const name=txt(q('lbgManagerNewGroup')?.value);if(!name)return alert('Hãy nhập tên nhóm.');const b=q('lbgManagerCreateGroup'),old=b.textContent;b.disabled=true;b.textContent='Đang tạo…';try{const {error}=await auth.client.rpc('create_teacher_group',{p_name:name});if(error)throw error;location.reload()}catch(e){alert(e?.message||String(e));b.disabled=false;b.textContent=old}};
      }
    }
    if(c.can_manage_groups){
      card.querySelectorAll('[data-group-box]').forEach(box=>{
        if(box.querySelector('[data-manager-rename]'))return;
        const title=box.querySelector('.lbg-group-title'),groupId=box.dataset.groupBox;if(!title||!groupId)return;
        const b=document.createElement('button');b.className='btn outline mini';b.dataset.managerRename=groupId;b.textContent='Đổi tên';title.appendChild(b);
        b.onclick=async()=>{const oldName=txt(box.querySelector('h4')?.textContent),name=prompt('Tên nhóm mới:',oldName);if(name===null||!txt(name))return;try{const {error}=await auth.client.rpc('rename_teacher_group',{p_group_id:groupId,p_name:txt(name)});if(error)throw error;location.reload()}catch(e){alert(e?.message||String(e))}};
      });
    }
  }

  function payrollCard(){return[...document.querySelectorAll('section.card,section.lbg-ui-section,section')].find(x=>/Bảng kê tiết dạy tháng/i.test(txt(x.querySelector('h3,h2')?.textContent)))||null}
  function protectPayrollMoney(){
    const c=context();if(!c||c.is_owner||c.can_view_payroll_amounts)return;
    if(!c.can_view_payroll_details)return;
    const card=payrollCard();if(!card)return;
    let note=card.querySelector('.lbg-manager-money-note');if(!note){note=document.createElement('div');note.className='lbg-access-note lbg-manager-money-note';note.innerHTML='<b>Quyền Quản lý:</b> được xem bảng kê nhưng không được xem số tiền/lương. Chủ sở hữu có thể cấp riêng quyền này.';card.querySelector('.head')?.insertAdjacentElement('afterend',note)}
    card.querySelectorAll('table').forEach(table=>{
      const heads=[...table.querySelectorAll('thead tr:last-child th')];
      heads.forEach((th,index)=>{if(/tiền|lương|đơn\s*giá|thành\s*tiền|số\s*tiền|vnd|vnđ/i.test(txt(th.textContent))){table.querySelectorAll('tr').forEach(row=>row.children[index]?.classList.add('lbg-payroll-money-hidden'))}});
    });
    card.querySelectorAll('.sum,.badge,.notice').forEach(el=>{if(/₫|vnđ|vnd|đồng|tiền|lương/i.test(txt(el.textContent)))el.classList.add('lbg-payroll-money-hidden')});
    card.querySelectorAll('button').forEach(button=>{if(/xuất|export/i.test(txt(button.textContent))){button.disabled=true;button.title='Cần quyền xem số tiền/lương để xuất bảng kê của người khác.'}});
  }

  function sweep(){roleLabel();enhanceManagerGroups();protectPayrollMoney();if(isOwner()&&!q('lbgManagerPermissionsCard'))loadPeople()}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sweep()})}

  window.LBGAuth.onReady(a=>{
    auth=a;style();
    document.addEventListener('lbg-access-ready',()=>{ctx=context();queue();if(isOwner())loadPeople()});
    observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>{ctx=context();queue();if(isOwner())loadPeople()},650);
  });
  window.LBGAuth.onLogout(()=>{observer?.disconnect();observer=null;auth=null;ctx=null;people=[];queued=false;q('lbgManagerPermissionsCard')?.remove();q('lbgManagerSetupWarning')?.remove()});
})();
