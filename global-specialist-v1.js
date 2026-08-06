'use strict';
(function(){
  if(!window.LBGAuth)return;
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let auth=null,observer=null,timer=null,loading=false,people=[];

  function style(){
    if(q('lbgGlobalSpecialistCss'))return;
    const s=document.createElement('style');s.id='lbgGlobalSpecialistCss';s.textContent=`
      .lbg-global-specialist{margin:14px 0;padding:15px;border:1px solid #99d5c9;border-radius:16px;background:linear-gradient(135deg,#f0fdfa,#f8fafc)}
      .lbg-global-specialist h4{margin:0;color:#0f5f5a;font-size:16px}.lbg-global-specialist p{margin:5px 0 12px;color:#475569;font-size:12px}
      .lbg-global-specialist-row{display:flex;gap:9px;align-items:end;flex-wrap:wrap}.lbg-global-specialist-row label{display:grid;gap:5px;min-width:310px;font-size:12px;font-weight:800}.lbg-global-specialist-row select{padding:10px 11px;border:1px solid #cbdde2;border-radius:11px;background:#fff}
      .lbg-global-specialist-status{margin-top:10px;padding:9px 11px;border-radius:11px;background:#fff;border:1px solid #dbe6eb;color:#334155;font-size:12px}.lbg-global-specialist-status.on{border-color:#86efac;background:#f0fdf4;color:#166534}
      @media(max-width:700px){.lbg-global-specialist-row{display:grid}.lbg-global-specialist-row label{min-width:0}}
    `;document.head.appendChild(s);
  }

  function isOwner(){return Boolean(window.LBGAccess?.context?.is_owner)}

  function hideLegacyPerGroupControls(){
    document.querySelectorAll('.lbg-group-section').forEach(section=>{
      const heading=txt(section.querySelector('h5,h4,h3')?.textContent);
      if(/Trưởng ban|phụ trách chuyên môn được xem nhóm/i.test(heading))section.remove();
    });
    q('lbgScopeBulkTools')?.remove();
  }

  async function loadPeople(){
    if(!auth||!isOwner()||loading)return;
    loading=true;
    try{
      const {data,error}=await auth.client.from('profiles')
        .select('id,username,display_name,teacher_code,is_active,can_review_all_reports')
        .neq('role','owner')
        .order('display_name',{ascending:true});
      if(error)throw error;
      people=data||[];renderOwnerControl();
    }catch(error){
      const message=error?.message||String(error);
      if(/can_review_all_reports|column/i.test(message))showSetupWarning();
      else console.error('Không tải được danh sách Trưởng ban chuyên môn:',error);
    }finally{loading=false}
  }

  function showSetupWarning(){
    if(q('lbgGlobalSpecialistWarning'))return;
    const main=document.querySelector('main.shell');if(!main)return;
    const box=document.createElement('div');box.id='lbgGlobalSpecialistWarning';box.className='lbg-setup-warning';
    box.innerHTML='<b>Chưa kích hoạt quyền Trưởng ban chuyên môn:</b> hãy chạy tệp <code>20260806_global_head_specialist.sql</code> trong Supabase SQL Editor.';
    main.prepend(box);
  }

  function options(){
    return '<option value="">Chọn tài khoản…</option>'+people.filter(p=>p.is_active).map(p=>`<option value="${p.id}">${esc(p.display_name)} — ${esc(p.username)}${p.teacher_code?' — '+esc(p.teacher_code):''}</option>`).join('');
  }

  function renderOwnerControl(){
    if(!isOwner())return;
    const card=q('lbgGroupsCard');if(!card)return;
    let box=q('lbgGlobalSpecialistCard');
    if(!box){
      box=document.createElement('section');box.id='lbgGlobalSpecialistCard';box.className='lbg-global-specialist';
      const host=q('lbgOwnerCreateGroup')||card.querySelector('.head');host.insertAdjacentElement('afterend',box);
    }
    const selected=q('lbgGlobalSpecialistPerson')?.value||'';
    box.innerHTML=`<h4>🎓 Phân quyền Trưởng ban chuyên môn</h4><p>Trưởng ban chuyên môn được chọn, kiểm tra, đối chiếu và xuất báo giảng của toàn bộ giáo viên trong TKB. Quyền này không cho xem bảng kê cá nhân, số tiền, tài khoản hoặc Google Sheets.</p><div class="lbg-global-specialist-row"><label>Tài khoản<select id="lbgGlobalSpecialistPerson">${options()}</select></label><button class="btn primary" id="lbgEnableGlobalSpecialist">Bật quyền</button><button class="btn outline danger" id="lbgDisableGlobalSpecialist">Thu hồi quyền</button></div><div class="lbg-global-specialist-status" id="lbgGlobalSpecialistStatus">Chọn tài khoản để xem trạng thái.</div>`;
    if(selected&&people.some(p=>p.id===selected))q('lbgGlobalSpecialistPerson').value=selected;
    q('lbgGlobalSpecialistPerson').onchange=updateStatus;
    q('lbgEnableGlobalSpecialist').onclick=()=>setPermission(true);
    q('lbgDisableGlobalSpecialist').onclick=()=>setPermission(false);
    updateStatus();
  }

  function selectedPerson(){const id=q('lbgGlobalSpecialistPerson')?.value;return people.find(p=>p.id===id)||null}

  function updateStatus(){
    const person=selectedPerson(),box=q('lbgGlobalSpecialistStatus');if(!box)return;
    if(!person){box.className='lbg-global-specialist-status';box.textContent='Chọn tài khoản để xem trạng thái.';return}
    if(person.can_review_all_reports){box.className='lbg-global-specialist-status on';box.innerHTML=`<b>${esc(person.display_name)}</b> đang là Trưởng ban chuyên môn và được kiểm tra toàn bộ giáo viên.`}
    else{box.className='lbg-global-specialist-status';box.innerHTML=`<b>${esc(person.display_name)}</b> chưa có quyền Trưởng ban chuyên môn.`}
  }

  async function setPermission(enabled){
    const person=selectedPerson();if(!person)return alert('Hãy chọn tài khoản.');
    const message=enabled?`Bật quyền Trưởng ban chuyên môn toàn hệ thống cho ${person.display_name}?`:`Thu hồi quyền Trưởng ban chuyên môn của ${person.display_name}?`;
    if(!confirm(message))return;
    const buttons=[q('lbgEnableGlobalSpecialist'),q('lbgDisableGlobalSpecialist')];buttons.forEach(b=>b&&(b.disabled=true));
    try{
      const {error}=await auth.client.rpc('set_global_specialist_access',{p_user_id:person.id,p_enabled:enabled});
      if(error)throw error;
      person.can_review_all_reports=enabled;updateStatus();
      alert(enabled?'Đã bật quyền Trưởng ban chuyên môn. Tài khoản cần đăng nhập lại để nhận phạm vi mới.':'Đã thu hồi quyền Trưởng ban chuyên môn. Tài khoản cần đăng nhập lại để cập nhật.');
    }catch(error){alert('Không cập nhật được quyền: '+(error?.message||String(error)))}
    finally{buttons.forEach(b=>b&&(b.disabled=false))}
  }

  function scan(){hideLegacyPerGroupControls();if(isOwner()&&!q('lbgGlobalSpecialistCard'))loadPeople()}

  window.LBGAuth.onReady(a=>{
    auth=a;style();
    document.addEventListener('lbg-access-ready',()=>setTimeout(()=>{scan();loadPeople()},150));
    observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});
    timer=setInterval(scan,1500);setTimeout(()=>{scan();loadPeople()},700);
  });
  window.LBGAuth.onLogout(()=>{observer?.disconnect();observer=null;clearInterval(timer);timer=null;auth=null;people=[];q('lbgGlobalSpecialistCard')?.remove();q('lbgGlobalSpecialistWarning')?.remove()});
})();
