'use strict';
(function(){
  if(!window.LBGAuth)return;
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let auth=null,lastSignature='',timer=null,busy=false;

  function style(){
    if(q('lbgScopeAuditCss'))return;
    const s=document.createElement('style');s.id='lbgScopeAuditCss';s.textContent=`
      .lbg-scope-audit{margin:10px 0;padding:11px 13px;border:1px solid #99d5c9;background:#f0fdfa;color:#115e59;border-radius:12px;font-size:12px;display:grid;gap:5px}
      .lbg-scope-audit.warn{border-color:#fdba74;background:#fff7ed;color:#9a3412}.lbg-scope-audit b{color:inherit}.lbg-scope-tags{display:flex;gap:6px;flex-wrap:wrap}.lbg-scope-tag{padding:4px 8px;border-radius:999px;background:#fff;border:1px solid currentColor;font-size:11px;font-weight:750}
      .lbg-scope-tools{margin:12px 0;padding:13px;border:1px solid #bfdbfe;background:#f8fbff;border-radius:14px}.lbg-scope-tools-row{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.lbg-scope-tools label{display:grid;gap:5px;min-width:280px;font-size:12px;font-weight:750}.lbg-scope-tools select{padding:9px 10px;border:1px solid #dbe6eb;border-radius:10px;background:#fff}.lbg-scope-tools-result{margin-top:9px;color:#475569;font-size:12px}
      @media(max-width:700px){.lbg-scope-tools-row{display:grid}.lbg-scope-tools label{min-width:0}}
    `;document.head.appendChild(s);
  }

  async function rpc(name,args={}){const {data,error}=await auth.client.rpc(name,args);if(error)throw error;return data}
  function context(){return window.LBGAccess?.context||null}
  function reportCard(){return [...document.querySelectorAll('section.card,section.lbg-ui-section,section')].find(x=>/^3\.\s*Kiểm tra và lập báo giảng/i.test(txt(x.querySelector('h3,h2')?.textContent)))||null}
  function groupCard(){return q('lbgGroupsCard')}

  function rolesFor(dashboard,ctx){
    const uid=ctx?.user_id;
    const groups=dashboard?.groups||[];
    const leader=groups.filter(g=>(g.managers||[]).some(x=>x.user_id===uid));
    const specialist=groups.filter(g=>(g.scoped_access||[]).some(x=>x.user_id===uid));
    return{groups,leader,specialist};
  }

  function updateUserLabel(ctx,roles){
    const chip=q('lbgUserBar')?.querySelector('.lbg-userchip');if(!chip||ctx?.is_owner)return;
    const name=auth?.profile?.display_name||auth?.profile?.username||'';
    let label='Thành viên';
    if(roles.leader.length&&roles.specialist.length)label='Nhóm trưởng • Phụ trách chuyên môn';
    else if(roles.leader.length)label='Nhóm trưởng';
    else if(roles.specialist.length)label='Phụ trách chuyên môn';
    chip.innerHTML=`<b>${esc(name)}</b> • ${esc(label)}`;
    chip.dataset.lbgAccessHtml=chip.innerHTML;
  }

  function renderAudit(ctx,roles){
    if(ctx?.is_owner)return;
    const card=reportCard();if(!card)return;
    let box=q('lbgScopeAudit');
    if(!box){box=document.createElement('div');box.id='lbgScopeAudit';box.className='lbg-scope-audit';const note=card.querySelector('.lbg-access-note');(note||card.querySelector('.head'))?.insertAdjacentElement('afterend',box)}
    const own=txt(ctx.teacher_code).toUpperCase();
    const codes=[...new Set((ctx.teacher_codes||[]).map(x=>txt(x).toUpperCase()).filter(Boolean))];
    const others=codes.filter(x=>x!==own);
    const visibleNames=[...new Set(roles.groups.map(g=>g.name))];
    const tags=[];
    if(roles.leader.length)tags.push(`<span class="lbg-scope-tag">Nhóm trưởng: ${esc(roles.leader.map(g=>g.name).join(', '))}</span>`);
    if(roles.specialist.length)tags.push(`<span class="lbg-scope-tag">Chuyên môn: ${esc(roles.specialist.map(g=>g.name).join(', '))}</span>`);
    if(!tags.length)tags.push('<span class="lbg-scope-tag">Chỉ dữ liệu cá nhân</span>');
    const warn=visibleNames.length>0&&others.length===0;
    box.className='lbg-scope-audit'+(warn?' warn':'');
    box.innerHTML=`<b>Phạm vi thực tế của tài khoản</b><div class="lbg-scope-tags">${tags.join('')}</div><div>Được xem ${codes.length} mã giáo viên: ${esc(codes.join(', ')||'chưa có mã nào')}.</div>${warn?'<div><b>Lưu ý:</b> tài khoản có phạm vi nhóm nhưng chưa có thêm giáo viên hiển thị. Hãy kiểm tra thành viên đã được đưa vào đúng nhóm và đã liên kết mã TKB hay chưa.</div>':''}`;
  }

  function ownerOptions(people){return '<option value="">Chọn tài khoản…</option>'+people.filter(p=>p.is_active).map(p=>`<option value="${p.id}">${esc(p.display_name)} — ${esc(p.username)}${p.teacher_code?' — '+esc(p.teacher_code):''}</option>`).join('')}

  function summaryForPerson(dashboard,userId){
    const groups=dashboard?.groups||[];
    const leader=groups.filter(g=>(g.managers||[]).some(x=>x.user_id===userId));
    const specialist=groups.filter(g=>(g.scoped_access||[]).some(x=>x.user_id===userId));
    return{leader,specialist};
  }

  function installOwnerTools(dashboard){
    const ctx=context();if(!ctx?.is_owner)return;
    const card=groupCard();if(!card||q('lbgScopeBulkTools'))return;
    const host=q('lbgOwnerCreateGroup')||card.querySelector('.head');
    const box=document.createElement('div');box.id='lbgScopeBulkTools';box.className='lbg-scope-tools';
    box.innerHTML=`<div class="lbg-scope-tools-row"><label>Kiểm tra/cấp quyền chuyên môn<select id="lbgScopePerson">${ownerOptions(dashboard.people||[])}</select></label><button class="btn outline" id="lbgScopeInspect">Xem phạm vi</button><button class="btn primary" id="lbgScopeGrantAll">Cấp chuyên môn tất cả nhóm</button><button class="btn outline danger" id="lbgScopeRemoveAll">Gỡ chuyên môn tất cả nhóm</button></div><div class="lbg-scope-tools-result" id="lbgScopeResult">Quyền chuyên môn vẫn được lưu riêng theo từng nhóm; hai nút trên chỉ giúp thao tác nhanh.</div>`;
    host.insertAdjacentElement('afterend',box);
    q('lbgScopeInspect').onclick=()=>inspectPerson(dashboard);
    q('lbgScopeGrantAll').onclick=()=>bulkSpecialist(dashboard,true);
    q('lbgScopeRemoveAll').onclick=()=>bulkSpecialist(dashboard,false);
  }

  function inspectPerson(dashboard){
    const userId=q('lbgScopePerson')?.value;if(!userId)return alert('Hãy chọn tài khoản.');
    const person=(dashboard.people||[]).find(p=>p.id===userId),s=summaryForPerson(dashboard,userId);
    q('lbgScopeResult').innerHTML=`<b>${esc(person?.display_name||'Tài khoản')}</b><br>Nhóm trưởng: ${esc(s.leader.map(g=>g.name).join(', ')||'Không có')}<br>Phụ trách chuyên môn: ${esc(s.specialist.map(g=>g.name).join(', ')||'Không có')}`;
  }

  async function bulkSpecialist(dashboard,enabled){
    if(busy)return;
    const userId=q('lbgScopePerson')?.value;if(!userId)return alert('Hãy chọn tài khoản.');
    const person=(dashboard.people||[]).find(p=>p.id===userId);const groups=dashboard.groups||[];
    if(!groups.length)return alert('Chưa có nhóm nào.');
    const verb=enabled?'cấp quyền chuyên môn cho tất cả':'gỡ quyền chuyên môn khỏi tất cả';
    if(!confirm(`${verb} nhóm đối với ${person?.display_name||'tài khoản này'}?`))return;
    busy=true;const buttons=[q('lbgScopeGrantAll'),q('lbgScopeRemoveAll')];buttons.forEach(b=>b&&(b.disabled=true));
    let ok=0,fail=0;
    try{
      for(const g of groups){
        try{await rpc('set_group_scoped_access',{p_group_id:g.id,p_user_id:userId,p_enabled:enabled,p_can_review_reports:true,p_can_view_month_total:true,p_can_manage_members:false});ok++}catch(e){console.error(e);fail++}
      }
      await window.LBGAccess?.refresh?.().catch(()=>{});
      q('lbgScopeResult').textContent=`Hoàn tất: ${ok} nhóm thành công, ${fail} nhóm lỗi. Trang sẽ tải lại để cập nhật.`;
      setTimeout(()=>location.reload(),700);
    }finally{busy=false;buttons.forEach(b=>b&&(b.disabled=false))}
  }

  async function refresh(){
    if(!auth||busy)return;
    try{
      const ctx=context();if(!ctx)return;
      const dashboard=await rpc('my_group_dashboard');
      const signature=JSON.stringify({uid:ctx.user_id,codes:ctx.teacher_codes,groups:(dashboard.groups||[]).map(g=>({id:g.id,m:g.managers,a:g.scoped_access,n:g.name})),people:ctx.is_owner?(dashboard.people||[]).map(p=>p.id):[]});
      if(signature===lastSignature){installOwnerTools(dashboard);return}
      lastSignature=signature;const roles=rolesFor(dashboard,ctx);updateUserLabel(ctx,roles);renderAudit(ctx,roles);installOwnerTools(dashboard);
    }catch(e){console.error('Không đọc được phạm vi quyền:',e)}
  }

  window.LBGAuth.onReady(a=>{auth=a;style();setTimeout(refresh,500);document.addEventListener('lbg-access-ready',()=>setTimeout(refresh,100));timer=setInterval(refresh,2500)});
  window.LBGAuth.onLogout(()=>{clearInterval(timer);timer=null;auth=null;lastSignature='';q('lbgScopeAudit')?.remove();q('lbgScopeBulkTools')?.remove()});
})();
