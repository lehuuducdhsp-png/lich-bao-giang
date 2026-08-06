'use strict';
(function(){
  if(!window.LBGAuth)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let auth=null,observer=null,desired='';

  function chip(){return document.getElementById('lbgUserBar')?.querySelector('.lbg-userchip')||null}
  function enforce(){const c=chip();if(!c||!desired||c.innerHTML===desired)return;c.innerHTML=desired;c.dataset.lbgAccessHtml=desired}

  async function resolve(){
    const ctx=window.LBGAccess?.context;if(!auth||!ctx||ctx.is_owner)return;
    const {data,error}=await auth.client.rpc('my_group_dashboard');if(error)return console.error(error);
    const groups=data?.groups||[],uid=ctx.user_id;
    const leader=groups.some(g=>(g.managers||[]).some(x=>x.user_id===uid));
    const specialist=groups.some(g=>(g.scoped_access||[]).some(x=>x.user_id===uid));
    let label='Thành viên';
    if(leader&&specialist)label='Nhóm trưởng • Phụ trách chuyên môn';
    else if(leader)label='Nhóm trưởng';
    else if(specialist)label='Phụ trách chuyên môn';
    const name=auth.profile?.display_name||auth.profile?.username||'';
    desired=`<b>${esc(name)}</b> • ${esc(label)}`;enforce();
    observer?.disconnect();observer=new MutationObserver(enforce);
    const c=chip();if(c)observer.observe(c,{childList:true,subtree:true,characterData:true});
  }

  window.LBGAuth.onReady(a=>{auth=a;document.addEventListener('lbg-access-ready',()=>setTimeout(resolve,150));setTimeout(resolve,700)});
  window.LBGAuth.onLogout(()=>{observer?.disconnect();observer=null;auth=null;desired='' });
})();
