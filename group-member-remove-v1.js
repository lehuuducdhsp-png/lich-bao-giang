'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  let auth=null,dashboard={groups:[],people:[]},loading=false,queued=false,observer=null;

  function style(){
    if(q('lbgGroupMemberRemoveCss'))return;
    const s=document.createElement('style');s.id='lbgGroupMemberRemoveCss';s.textContent=`
      .lbg-member-remove-actions{display:flex;gap:7px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
      .lbg-member-remove-actions .btn{white-space:nowrap}
      @media(max-width:620px){
        .lbg-member-row:has([data-remove-member]){grid-template-columns:1fr!important}
        .lbg-member-remove-actions{justify-content:flex-start;width:100%}
        .lbg-member-remove-actions .btn{width:100%}
      }
    `;document.head.appendChild(s)
  }

  async function rpc(name,args={}){
    const api=window.LBGAuth;if(!api?.client)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');
    const{data,error}=await api.client.rpc(name,args);if(error)throw error;return data
  }

  function rowForMember(box,member){
    const username=txt(member?.username).toLowerCase();
    const rows=[...box.querySelectorAll('.lbg-member-list .lbg-member-row')];
    if(username){const exact=rows.find(row=>txt(row.textContent).toLowerCase().includes(username));if(exact)return exact}
    const name=txt(member?.display_name).toLowerCase();
    return name?rows.find(row=>txt(row.textContent).toLowerCase().includes(name))||null:null
  }

  function install(){
    style();
    for(const group of dashboard.groups||[]){
      if(!group?.can_manage)continue;
      const box=document.querySelector(`[data-group-box="${CSS.escape(String(group.id))}"]`);if(!box)continue;
      const leaders=new Set((group.managers||[]).map(x=>String(x.user_id)));
      for(const member of group.members||[]){
        const row=rowForMember(box,member);if(!row||row.querySelector(`[data-remove-member="${CSS.escape(String(member.user_id))}"]`))continue;
        const badge=row.querySelector('.badge');
        let actions=document.createElement('div');actions.className='lbg-member-remove-actions';
        if(badge){badge.parentElement?.insertBefore(actions,badge);actions.appendChild(badge)}else row.appendChild(actions);
        const b=document.createElement('button');b.type='button';b.className='btn outline danger mini';b.dataset.removeMember=String(member.user_id);b.dataset.groupId=String(group.id);b.textContent='Xóa khỏi nhóm';
        if(leaders.has(String(member.user_id)))b.title='Người này đang là Nhóm trưởng. Cần gỡ vai trò Nhóm trưởng trước.';
        b.onclick=()=>removeMember(group,member,b,leaders.has(String(member.user_id)));
        actions.appendChild(b)
      }
    }
  }

  async function removeMember(group,member,button,isLeader){
    if(isLeader){
      alert(`${member.display_name} đang là Nhóm trưởng của ${group.name}.\n\nHãy bấm dấu × ở phần Nhóm trưởng để gỡ vai trò Nhóm trưởng trước, sau đó mới dùng “Xóa khỏi nhóm”.\n\nCách làm hai bước này giúp tránh vô tình thu hồi vai trò quản lý.`);return
    }
    const ok=confirm(`Đưa ${member.display_name} ra khỏi ${group.name}?\n\n• Tài khoản vẫn được giữ.\n• Mã TKB không bị xóa.\n• Lịch sử báo giảng và Check-in cũ vẫn được giữ.\n• Người này sẽ trở về trạng thái “Chưa phân nhóm”.\n\nBạn có chắc muốn tiếp tục?`);
    if(!ok)return;
    const old=button.textContent;button.disabled=true;button.textContent='Đang xóa khỏi nhóm…';
    try{
      const result=await rpc('remove_teacher_from_group',{p_group_id:group.id,p_user_id:member.user_id,p_reason:'Chủ động xóa khỏi nhóm từ giao diện'});
      alert(`Đã đưa ${result?.display_name||member.display_name} ra khỏi ${result?.group_name||group.name}.\n\nTài khoản, mã TKB và dữ liệu lịch sử vẫn được giữ.`);
      location.reload()
    }catch(error){
      alert('Không thể xóa khỏi nhóm: '+(error?.message||String(error)));button.disabled=false;button.textContent=old
    }
  }

  async function load(){
    if(loading||!window.LBGAuth?.client)return;loading=true;
    try{dashboard=await rpc('my_group_dashboard')||{groups:[],people:[]};install()}
    catch(error){console.warn('Không tải được chức năng Xóa khỏi nhóm:',error?.message||error)}
    finally{loading=false}
  }

  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})}
  function start(){
    style();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});load().catch(console.error)
  }

  window.LBGAuth?.onReady?.(a=>{auth=a;load().catch(console.error)});
  document.addEventListener('lbg-access-ready',()=>load().catch(console.error));
  window.addEventListener('focus',()=>{if(auth||window.LBGAuth?.profile)load().catch(console.error)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true})
})();
