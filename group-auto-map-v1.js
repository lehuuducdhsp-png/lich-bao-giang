'use strict';
(function(){
  if(!window.LBGAuth)return;
  const q=id=>document.getElementById(id),txt=v=>String(v??'').trim();
  const norm=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'');
  let auth=null;
  async function rpc(name,args={}){const {data,error}=await auth.client.rpc(name,args);if(error)throw error;return data}
  function teacherSource(){
    if(typeof wb==='undefined'||!wb)throw new Error('Hãy mở một file TKB trước.');
    const ws=wb.getWorksheet(q('week')?.value)||wb.worksheets[0];
    const fn=window.LBGAllTeachers||window.teachers;if(typeof fn!=='function')throw new Error('Bộ đọc giáo viên chưa sẵn sàng.');
    return(fn(ws)||[]).filter(x=>txt(x.code)&&txt(x.code).toUpperCase()!=='OFF');
  }
  async function mapCodes(button){
    const old=button.textContent;button.disabled=true;button.textContent='Đang ghép mã…';
    try{
      const data=await rpc('my_group_dashboard'),people=data?.people||[],teachers=teacherSource(),byName=new Map();
      for(const t of teachers){const key=norm(t.name);if(!key)continue;if(!byName.has(key))byName.set(key,[]);byName.get(key).push(t)}
      let mapped=0,ambiguous=0,unmatched=0;
      for(const p of people){
        if(txt(p.teacher_code))continue;
        const matches=byName.get(norm(p.display_name))||[];
        if(matches.length===1){await rpc('set_profile_teacher_code',{p_user_id:p.id,p_teacher_code:txt(matches[0].code).toUpperCase()});mapped++}
        else if(matches.length>1)ambiguous++;else unmatched++;
      }
      await window.LBGAccess?.refresh?.();
      alert(`Đã tự ghép ${mapped} mã giáo viên.\nChưa ghép do trùng tên: ${ambiguous}.\nChưa tìm thấy tên khớp: ${unmatched}.\n\nTrang sẽ tải lại để cập nhật danh sách.`);
      location.reload();
    }catch(e){alert('Không tự ghép được mã giáo viên: '+(e?.message||String(e)))}finally{button.disabled=false;button.textContent=old}
  }
  function install(){
    if(!window.LBGAccess?.context?.is_owner||q('lbgAutoMapCodes'))return;
    const host=q('lbgOwnerCreateGroup');if(!host)return;
    const b=document.createElement('button');b.id='lbgAutoMapCodes';b.className='btn outline';b.textContent='🔗 Tự ghép mã GV từ TKB';b.onclick=()=>mapCodes(b);
    const toolbar=host.querySelector('.lbg-groups-toolbar')||host;toolbar.appendChild(b);
  }
  document.addEventListener('lbg-access-ready',install);
  window.LBGAuth.onReady(a=>{auth=a;setInterval(install,1000)});
})();
