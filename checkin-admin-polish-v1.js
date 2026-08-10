'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]||c));
  let groups=[],loaded=false,loading=false;
  const storageKey='lbg-checkin-review-group';

  async function rpc(name,args={}){
    const api=window.LBGAuth;
    if(!api?.client)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');
    const{data,error}=await api.client.rpc(name,args);if(error)throw error;return data;
  }

  function attemptNo(el){
    const m=txt(el?.querySelector('b')?.textContent||el?.textContent).match(/Lần\s+(\d+)/i);
    return m?Number(m[1]):-1;
  }
  function sortChildren(parent,selector){
    if(!parent)return;
    const items=[...parent.children].filter(el=>el.matches?.(selector));
    if(items.length<2)return;
    const sorted=[...items].sort((a,b)=>attemptNo(b)-attemptNo(a));
    if(items.every((el,i)=>el===sorted[i]))return;
    const frag=document.createDocumentFragment();for(const el of sorted)frag.appendChild(el);parent.appendChild(frag);
  }
  function sortNewestFirst(){
    document.querySelectorAll('.lbg-checkin-history').forEach(x=>sortChildren(x,'.lbg-checkin-attempt'));
    const parents=new Set();document.querySelectorAll('.lbg-checkin-manager-attempt').forEach(x=>x.parentElement&&parents.add(x.parentElement));
    parents.forEach(x=>sortChildren(x,'.lbg-checkin-manager-attempt'));
  }

  function pilotWording(){
    document.querySelectorAll('.lbg-checkin-panel').forEach(panel=>{
      const h=panel.querySelector('h4');if(!h||!txt(h.textContent).includes('Nhóm thử nghiệm Check-in'))return;
      h.textContent='⚙️ Quản lý quyền Check-in';
      const p=h.parentElement?.querySelector('p');
      if(p)p.textContent='Chỉ Chủ sở hữu cấu hình tài khoản được tham gia. Nhãn PILOT cho biết hệ thống vẫn đang giới hạn người dùng để kiểm tra an toàn trước khi mở chính thức.';
    });
  }

  function managerPanel(){
    return [...document.querySelectorAll('.lbg-checkin-panel')].find(panel=>txt(panel.querySelector('h4')?.textContent)==='Kiểm tra Check-in')||null;
  }
  function codeOfSlot(slot){
    const t=txt(slot?.querySelector('.lbg-checkin-manager-head h4')?.textContent);
    const m=t.match(/—\s*([A-Z0-9._-]{1,24})\s*$/i);return m?m[1].toUpperCase():'';
  }
  function selectedId(){return q('lbgCheckinGroupFilter')?.value||''}
  function applyFilter(){
    const box=q('lbgCheckinManagerResult'),select=q('lbgCheckinGroupFilter');if(!box||!select)return;
    const group=groups.find(g=>g.id===select.value),codes=new Set((group?.member_codes||[]).map(x=>txt(x).toUpperCase()));
    const slots=[...box.querySelectorAll('.lbg-checkin-manager-slot')];let visible=0;
    for(const slot of slots){const show=!group||codes.has(codeOfSlot(slot));slot.hidden=!show;if(show)visible++}
    q('lbgCheckinGroupEmpty')?.remove();
    if(group&&slots.length&&visible===0){const d=document.createElement('div');d.id='lbgCheckinGroupEmpty';d.className='lbg-checkin-empty';d.textContent=`${group.name} chưa có lượt Check-in nào trong ngày đang chọn.`;box.appendChild(d)}
  }
  function optionsHtml(){
    return groups.map(g=>`<option value="${esc(g.id)}">${esc(g.name)} (${Number(g.member_count)||0} GV)</option>`).join('')+'<option value="">Tất cả nhóm</option>';
  }
  function ensureGroupFilter(){
    const panel=managerPanel(),toolbar=panel?.querySelector('.lbg-checkin-toolbar');if(!toolbar||!groups.length)return;
    let select=q('lbgCheckinGroupFilter');
    if(!select){
      const label=document.createElement('label');label.id='lbgCheckinGroupFilterWrap';label.innerHTML='<span>Nhóm</span><select id="lbgCheckinGroupFilter" style="min-width:190px;padding:9px 10px;border:1px solid #e2d2c8;border-radius:10px;background:#fff"></select>';
      const refresh=q('lbgCheckinManagerRefresh');if(refresh)toolbar.insertBefore(label,refresh);else toolbar.appendChild(label);select=q('lbgCheckinGroupFilter');
      select.addEventListener('change',()=>{sessionStorage.setItem(storageKey,select.value);applyFilter()});
    }
    const signature=groups.map(g=>`${g.id}:${g.name}:${g.member_count}`).join('|');
    if(select.dataset.signature!==signature){
      const old=sessionStorage.getItem(storageKey);select.innerHTML=optionsHtml();
      const valid=old!==null&&(old===''||groups.some(g=>g.id===old));select.value=valid?old:groups[0].id;
      select.dataset.signature=signature;
    }
    applyFilter();
  }

  async function loadGroups(force=false){
    if(loading||(!force&&loaded))return;loading=true;
    try{const data=await rpc('checkin_review_groups');groups=Array.isArray(data)?data:[];loaded=true;ensureGroupFilter()}
    catch(error){console.warn('Check-in group filter chưa sẵn sàng:',error?.message||error)}
    finally{loading=false}
  }

  function apply(){pilotWording();sortNewestFirst();ensureGroupFilter()}
  let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
  const observer=new MutationObserver(queue);
  function start(){observer.observe(document.body,{childList:true,subtree:true});apply();loadGroups().catch(console.error)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',()=>loadGroups(true).catch(console.error));
  window.addEventListener('focus',()=>{if(window.LBGAuth?.profile)loadGroups(true).catch(console.error)});
  window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
})();
