'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  let busy=false;

  function isOwner(){return Boolean(window.LBGAccess?.context?.is_owner)}
  async function rpc(name,args={}){
    const api=window.LBGAuth;if(!api?.client)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');
    const{data,error}=await api.client.rpc(name,args);if(error)throw error;return data;
  }
  function installButtons(){
    if(!isOwner())return;
    document.querySelectorAll('[data-group-box]').forEach(box=>{
      const id=box.dataset.groupBox,title=box.querySelector('.lbg-group-title');if(!id||!title||title.querySelector('[data-delete-group]'))return;
      const rename=title.querySelector('[data-rename-group]');
      const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end';
      if(rename){rename.parentElement?.insertBefore(wrap,rename);wrap.appendChild(rename)}else title.appendChild(wrap);
      const b=document.createElement('button');b.className='btn outline danger mini';b.dataset.deleteGroup=id;b.textContent='Xóa nhóm';b.onclick=()=>removeGroup(box,b);wrap.appendChild(b);
    });
  }
  async function removeGroup(box,button){
    if(busy)return;
    const id=box.dataset.groupBox,name=txt(box.querySelector('.lbg-group-title h4')?.textContent)||'nhóm này';
    const ok=confirm(`Xóa ${name}?\n\n• Thành viên hiện tại sẽ được đưa về trạng thái chưa thuộc nhóm.\n• Quyền Nhóm trưởng/phạm vi chuyên môn của riêng nhóm này sẽ được gỡ.\n• Lịch sử nhóm và dữ liệu Check-in cũ KHÔNG bị xóa.\n\nBạn có chắc muốn tiếp tục?`);
    if(!ok)return;
    busy=true;const old=button.textContent;button.disabled=true;button.textContent='Đang xóa…';
    try{
      const result=await rpc('archive_teacher_group',{p_group_id:id});
      alert(`Đã xóa ${result?.group_name||name}.\n${Number(result?.members_released)||0} thành viên đã được đưa về trạng thái chưa phân nhóm.`);
      location.reload();
    }catch(error){alert('Không xóa được nhóm: '+(error?.message||String(error)));button.disabled=false;button.textContent=old;busy=false}
  }

  let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;installButtons()})}
  const observer=new MutationObserver(queue);
  function start(){installButtons();observer.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',installButtons);
  window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
})();
