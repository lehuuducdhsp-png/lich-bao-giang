'use strict';
(function(){
  if(!window.LBGAuth)return;
  const q=id=>document.getElementById(id);
  let auth=null,ctx=null,observer=null,queued=false;

  function sharedTabActive(){const b=document.querySelector('#lbgCloudCard [data-scope="shared"]');return Boolean(b?.classList.contains('active'))}
  async function activate(id,button){
    if(!id||!auth)return;
    if(!confirm('Áp dụng phiên bản TKB này làm TKB chung cho hệ thống?'))return;
    const old=button.textContent;button.disabled=true;button.textContent='Đang áp dụng…';
    try{
      const {error}=await auth.client.rpc('set_active_shared_tkb',{p_id:id});if(error)throw error;
      alert('Đã áp dụng TKB chung. Trang sẽ tải lại để cập nhật trạng thái.');location.reload();
    }catch(e){alert('Không áp dụng được TKB chung: '+(e?.message||String(e)));button.disabled=false;button.textContent=old}
  }

  function patch(){
    queued=false;ctx=window.LBGAccess?.context||ctx;
    if(!ctx?.can_activate_shared_tkb||ctx.is_owner||!sharedTabActive())return;
    const tbody=q('lbgCloudRows');if(!tbody)return;
    tbody.querySelectorAll('tr').forEach(row=>{
      if(row.querySelector('[data-personal]')||row.querySelector('[data-shared]')||row.querySelector('[data-manager-shared]'))return;
      const open=row.querySelector('[data-open]'),actions=row.querySelector('.lbg-cloud-actions');if(!open||!actions)return;
      const button=document.createElement('button');button.className='btn outline mini';button.dataset.managerShared=open.dataset.open;button.textContent='Đặt bản chung';
      if(/Đang áp dụng/i.test(row.textContent))button.disabled=true;
      button.onclick=()=>activate(button.dataset.managerShared,button);
      const del=actions.querySelector('[data-delete]');del?actions.insertBefore(button,del):actions.appendChild(button);
    });
    const note=q('lbgCloudQuota');if(note&&!/áp dụng/i.test(note.textContent))note.textContent=ctx.can_upload_shared?'Bạn được tải TKB chung và chọn bản chung đang áp dụng.':'Bạn được chọn bản TKB chung đang áp dụng.';
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(patch)}

  window.LBGAuth.onReady(a=>{
    auth=a;document.addEventListener('lbg-access-ready',()=>{ctx=window.LBGAccess?.context||ctx;queue()});
    observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});setTimeout(queue,700);
  });
  window.LBGAuth.onLogout(()=>{observer?.disconnect();observer=null;auth=null;ctx=null;queued=false});
})();
