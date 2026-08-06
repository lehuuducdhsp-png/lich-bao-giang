'use strict';
(function(){
  if(!window.LBGAuth)return;
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let auth=null,dashboard={groups:[]},timer=null,busy=false,lastSignature='';

  function style(){
    if(q('lbgRosterCss'))return;
    const s=document.createElement('style');s.id='lbgRosterCss';s.textContent=`
      .lbg-roster-section{margin-top:12px;padding-top:11px;border-top:1px solid #e5edf2}.lbg-roster-section h5{margin:0 0 7px}.lbg-roster-list{max-height:230px;overflow:auto;border:1px solid #dbe6eb;border-radius:11px;background:#fff}.lbg-roster-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid #eef2f7}.lbg-roster-row:last-child{border-bottom:0}.lbg-roster-row small{color:#64748b}.lbg-roster-add{display:grid;grid-template-columns:minmax(230px,1fr) auto;gap:8px;margin-top:9px;align-items:end}.lbg-roster-add label{display:grid;gap:5px;font-size:12px;font-weight:750}.lbg-roster-add select{width:100%;padding:9px 10px;border:1px solid #dbe6eb;border-radius:10px;background:#fff}.lbg-roster-summary{font-size:12px;color:#64748b;margin:5px 0 8px}.lbg-roster-empty{padding:14px;text-align:center;color:#64748b}.lbg-roster-status{margin-top:6px;font-size:11px;color:#0f766e}@media(max-width:650px){.lbg-roster-add{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  async function rpc(name,args={}){const {data,error}=await auth.client.rpc(name,args);if(error)throw error;return data}
  function teacherSource(){
    let book=null;try{book=wb}catch{}
    if(!book?.worksheets?.length)return[];
    const selected=q('week')?.value;
    const ws=(selected&&book.getWorksheet(selected))||book.worksheets.find(x=>/\d{1,2}\s*[Tt]\s*\d{1,2}|tuần/i.test(x.name))||book.worksheets[0];
    const fn=typeof window.LBGAllTeachers==='function'?window.LBGAllTeachers:window.teachers;
    if(typeof fn!=='function')return[];
    const map=new Map();
    for(const item of fn(ws)||[]){
      const code=txt(item?.code).toUpperCase(),name=txt(item?.name||item?.teacherName||code);
      if(!code||code==='OFF'||!name||/^Mã\s+/i.test(name))continue;
      if(!map.has(code))map.set(code,{code,name});
    }
    return[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  }

  function currentGroupMap(){
    const map=new Map();
    for(const group of dashboard.groups||[])for(const member of group.members||[])map.set(txt(member.teacher_code).toUpperCase(),group);
    return map;
  }

  function rosterRows(group){
    const members=group.members||[];
    return members.length?members.map(m=>`<div class="lbg-roster-row"><div><b>${esc(m.teacher_name||m.teacher_code)}</b><br><small>Mã TKB: ${esc(m.teacher_code)}${m.linked_user_id?' • Đã có tài khoản':' • Chưa cần tài khoản'}</small></div><span class="badge">${new Date(m.valid_from).toLocaleDateString('vi-VN')}</span></div>`).join(''):'<div class="lbg-roster-empty">Nhóm chưa có giáo viên nào từ TKB.</div>';
  }

  function optionsFor(group){
    const teachers=teacherSource(),current=currentGroupMap();
    return '<option value="">Chọn giáo viên trong TKB…</option>'+teachers.map(t=>{
      const old=current.get(t.code),suffix=old?(old.id===group.id?' • đang ở nhóm này':' • hiện ở '+old.name):' • chưa phân nhóm';
      return `<option value="${esc(t.code)}" data-name="${esc(t.name)}">${esc(t.name)} — ${esc(t.code)}${esc(suffix)}</option>`;
    }).join('');
  }

  function hideLegacyMemberSection(box){
    [...box.querySelectorAll('.lbg-group-section')].forEach(section=>{
      const title=txt(section.querySelector('h5')?.textContent);
      if(title==='Thành viên'){section.hidden=true;section.dataset.lbgLegacyMembers='1'}
    });
  }

  function installGroup(group){
    const box=document.querySelector(`[data-group-box="${group.id}"]`);if(!box)return;
    hideLegacyMemberSection(box);
    let section=box.querySelector(`[data-roster-group="${group.id}"]`);
    if(!section){section=document.createElement('div');section.className='lbg-roster-section';section.dataset.rosterGroup=group.id;const firstTransfer=[...box.querySelectorAll('.lbg-group-section')].find(x=>/Đưa thành viên vào nhóm/i.test(txt(x.querySelector('h5')?.textContent)));(firstTransfer||box).insertAdjacentElement(firstTransfer?'beforebegin':'beforeend',section)}
    section.innerHTML=`<h5>Giáo viên trong nhóm theo TKB</h5><div class="lbg-roster-summary"><b>${(group.members||[]).length}</b> giáo viên. Danh sách này quyết định phạm vi báo giảng; không phụ thuộc đã tạo tài khoản hay chưa.</div><div class="lbg-roster-list">${rosterRows(group)}</div>${group.can_manage?`<div class="lbg-roster-add"><label>Đưa/chuyển giáo viên vào ${esc(group.name)}<select id="roster-select-${group.id}">${optionsFor(group)}</select></label><button class="btn primary" data-roster-move="${group.id}">Đưa vào nhóm</button></div><div class="lbg-roster-status" id="roster-status-${group.id}">Chuyển nhóm sẽ có hiệu lực ngay và gửi thông báo cho chủ sở hữu, nhóm cũ và nhóm mới.</div>`:''}`;
    section.querySelector(`[data-roster-move="${group.id}"]`)?.addEventListener('click',()=>moveTeacher(group));
  }

  async function moveTeacher(group){
    if(busy)return;
    const select=q(`roster-select-${group.id}`);if(!select?.value)return alert('Hãy chọn giáo viên trong TKB.');
    const option=select.options[select.selectedIndex],code=select.value,name=option?.dataset.name||code;
    const old=currentGroupMap().get(code);
    const question=old&&old.id!==group.id?`Chuyển ${name} (${code}) từ ${old.name} sang ${group.name}?`:`Đưa ${name} (${code}) vào ${group.name}?`;
    if(!confirm(question))return;
    busy=true;const button=document.querySelector(`[data-roster-move="${group.id}"]`),oldText=button?.textContent;if(button){button.disabled=true;button.textContent='Đang lưu…'}
    try{
      const result=await rpc('move_teacher_code_to_group',{p_group_id:group.id,p_teacher_code:code,p_teacher_name:name,p_effective_at:new Date().toISOString(),p_reason:''});
      q(`roster-status-${group.id}`).textContent=result?.message||'Đã cập nhật nhóm.';
      await window.LBGAccess?.refresh?.();
      await load(true);
    }catch(e){alert('Không cập nhật được nhóm: '+(e?.message||String(e)))}finally{busy=false;if(button){button.disabled=false;button.textContent=oldText}}
  }

  async function load(force=false){
    if(!auth||busy)return;
    try{
      const data=await rpc('my_group_roster_dashboard');
      const signature=JSON.stringify({groups:data?.groups,teachers:teacherSource().map(x=>x.code)});
      if(!force&&signature===lastSignature)return;
      lastSignature=signature;dashboard=data||{groups:[]};
      for(const group of dashboard.groups||[])installGroup(group);
      document.dispatchEvent(new CustomEvent('lbg-roster-ready',{detail:dashboard}));
    }catch(e){
      if(!/function .* does not exist|Could not find the function|my_group_roster_dashboard/i.test(e?.message||''))console.error('Không tải được danh sách nhóm theo TKB:',e);
    }
  }

  window.LBGAuth.onReady(a=>{auth=a;style();document.addEventListener('lbg-access-ready',()=>setTimeout(()=>load(true),160));q('week')?.addEventListener('change',()=>setTimeout(()=>load(true),120));timer=setInterval(load,1800);setTimeout(()=>load(true),700)});
  window.LBGAuth.onLogout(()=>{clearInterval(timer);timer=null;auth=null;dashboard={groups:[]};lastSignature='';document.querySelectorAll('[data-roster-group]').forEach(x=>x.remove());document.querySelectorAll('[data-lbg-legacy-members="1"]').forEach(x=>x.hidden=false)});
})();
