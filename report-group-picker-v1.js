'use strict';
(function(){
  const VERSION='20260907.2';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const normCode=v=>txt(v).toUpperCase();
  let auth=null,groups=[],observer=null,applying=false,queued=false,reapplyTimer=null;

  function groupCodes(group,available){
    const allow=available instanceof Set?available:new Set((available||[]).map(normCode).filter(Boolean));
    const seen=new Set(),out=[];
    for(const member of group?.members||[]){
      const code=normCode(member?.teacher_code||member?.code);
      if(!code||seen.has(code)||(allow.size&&!allow.has(code)))continue;
      seen.add(code);out.push(code);
    }
    return out;
  }

  window.LBGReportGroupPickerV1={version:VERSION,normCode,groupCodes};

  function addStyle(){
    if(q('lbgReportGroupPickerCss'))return;
    const s=document.createElement('style');s.id='lbgReportGroupPickerCss';
    s.textContent=`
      .controls.lbg-report-group-controls{grid-template-columns:minmax(160px,1fr) minmax(250px,1.2fr) minmax(185px,.78fr) auto auto auto!important}
      #lbgReportGroupPickerLabel{min-width:0}
      #lbgReportGroupPicker{width:100%;min-height:43px;padding:10px 11px;border:1px solid var(--l,#dbe6eb);border-radius:11px;background:#fff;color:inherit}
      #lbgReportGroupPicker:disabled{opacity:.55;cursor:not-allowed}
      @media(max-width:1180px){.controls.lbg-report-group-controls{grid-template-columns:minmax(160px,1fr) minmax(220px,1.15fr) minmax(175px,.8fr) auto auto!important}#export{grid-column:auto}}
      @media(max-width:950px){.controls.lbg-report-group-controls{grid-template-columns:1fr 1fr!important}}
      @media(max-width:620px){.controls.lbg-report-group-controls{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(s);
  }

  function ensureUi(){
    const analyze=q('analyze'),controls=analyze?.closest('.controls');
    if(!analyze||!controls)return false;
    addStyle();controls.classList.add('lbg-report-group-controls');
    if(!q('lbgReportGroupPickerLabel')){
      const label=document.createElement('label');label.id='lbgReportGroupPickerLabel';
      label.innerHTML='<span>Khối / nhóm</span><select id="lbgReportGroupPicker" disabled><option value="">Đang tải nhóm…</option></select>';
      controls.insertBefore(label,analyze);
      q('lbgReportGroupPicker').addEventListener('change',onGroupChange);
    }
    renderOptions();return true;
  }

  function renderOptions(){
    const select=q('lbgReportGroupPicker');if(!select)return;
    const previous=select.value;
    if(!groups.length){
      select.innerHTML='<option value="">Chưa có khối / nhóm</option>';select.disabled=true;return;
    }
    select.innerHTML='<option value="">Chọn khối / nhóm…</option>'+groups.map(g=>{
      const n=(g.members||[]).filter(x=>normCode(x?.teacher_code||x?.code)).length;
      return `<option value="${String(g.id).replace(/[&<>"']/g,'')}">${escapeHtml(g.name)}${n?` (${n} GV)`:''}</option>`;
    }).join('');
    select.disabled=false;if(groups.some(g=>String(g.id)===previous))select.value=previous;
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function availableCodes(){
    const native=q('teacher'),out=new Set();
    if(native)for(const option of native.options||[]){const code=normCode(option.value);if(code)out.add(code)}
    if(out.size)return out;
    document.querySelectorAll('#multiTeacherList input[type="checkbox"]').forEach(input=>{const code=normCode(input.value);if(code)out.add(code)});
    return out;
  }

  function allTeacherCheckboxes(){return[...document.querySelectorAll('#multiTeacherList input[type="checkbox"]')]}
  function openAllTeacherOptions(){
    const search=q('multiTeacherSearch');
    if(search&&search.value){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}))}
  }
  function toastMessage(message){if(typeof window.toast==='function')window.toast(message);else if(typeof toast==='function')toast(message)}

  function applyGroup(groupId,attempt=0){
    const group=groups.find(g=>String(g.id)===String(groupId));if(!group)return;
    openAllTeacherOptions();
    const boxes=allTeacherCheckboxes();
    if(!boxes.length){
      if(attempt<12)setTimeout(()=>applyGroup(groupId,attempt+1),80);else toastMessage('Danh sách giáo viên chưa sẵn sàng. Hãy chọn lại khối / nhóm.');
      return;
    }
    const available=availableCodes(),wanted=new Set(groupCodes(group,available));
    applying=true;
    try{
      for(const box of boxes){
        const next=wanted.has(normCode(box.value));
        if(box.checked!==next){box.checked=next;box.dispatchEvent(new Event('change',{bubbles:true}))}
      }
    }finally{setTimeout(()=>{applying=false},0)}
    const total=(group.members||[]).filter(x=>normCode(x?.teacher_code||x?.code)).length;
    if(!wanted.size)toastMessage(`Nhóm “${txt(group.name)}” chưa có giáo viên khả dụng trong tuần này.`);
    else if(wanted.size<total)toastMessage(`Đã chọn ${wanted.size}/${total} giáo viên của “${txt(group.name)}” có trong tuần và trong phạm vi quyền.`);
    else toastMessage(`Đã chọn ${wanted.size} giáo viên thuộc “${txt(group.name)}”.`);
  }

  function onGroupChange(event){const id=event.target.value;if(id)applyGroup(id)}
  function manualTeacherChange(event){
    if(applying)return;
    if(event.target?.matches?.('#multiTeacherList input[type="checkbox"]')){
      const select=q('lbgReportGroupPicker');if(select?.value)select.value='';
    }
  }
  function manualTeacherButtons(event){
    if(applying)return;
    if(event.target?.closest?.('#multiSelectAll,#multiClearAll')){const select=q('lbgReportGroupPicker');if(select?.value)select.value=''}
  }
  function weekChanged(event){
    if(event.target?.id!=='week')return;
    const select=q('lbgReportGroupPicker'),id=select?.value;
    if(!id)return;
    clearTimeout(reapplyTimer);reapplyTimer=setTimeout(()=>applyGroup(id),180);
  }

  async function loadGroups(){
    if(!auth?.client)return;
    try{
      const {data,error}=await auth.client.rpc('report_picker_groups');if(error)throw error;
      groups=Array.isArray(data)?data:[];
      groups.sort((a,b)=>txt(a.name).localeCompare(txt(b.name),'vi'));
      ensureUi();renderOptions();
    }catch(error){
      console.error('Không tải được khối / nhóm cho báo giảng:',error);
      groups=[];ensureUi();const s=q('lbgReportGroupPicker');if(s){s.innerHTML='<option value="">Không tải được khối / nhóm</option>';s.disabled=true}
    }
  }

  function queueUi(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensureUi()})}
  function bind(){
    document.addEventListener('change',manualTeacherChange,true);
    document.addEventListener('change',weekChanged,true);
    document.addEventListener('click',manualTeacherButtons,true);
    observer=new MutationObserver(queueUi);observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('lbg-access-ready',()=>{ensureUi();loadGroups()});
    window.addEventListener('beforeunload',()=>{observer?.disconnect();clearTimeout(reapplyTimer)},{once:true});
  }
  function start(){bind();ensureUi();const api=window.LBGAuth;if(api){auth=api;if(api.client&&api.profile&&!api.profile.must_change_password)loadGroups();api.onReady?.(a=>{auth=a;loadGroups()});api.onLogout?.(()=>{groups=[];q('lbgReportGroupPickerLabel')?.remove()})}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
