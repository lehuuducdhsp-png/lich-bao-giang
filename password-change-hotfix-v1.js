'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  let patchedForm=null;

  function errorText(error){
    const raw=txt(error?.message||error);
    const low=raw.toLowerCase();
    if(low.includes('password should be at least')||low.includes('password must be at least'))return'Mật khẩu chưa đủ độ dài theo yêu cầu của hệ thống.';
    if(low.includes('new password should be different')||low.includes('same password'))return'Mật khẩu mới phải khác mật khẩu đang dùng.';
    if(low.includes('weak password'))return'Mật khẩu này chưa đủ an toàn. Hãy dùng ít nhất 8 ký tự và nên kết hợp chữ hoa, chữ thường, số hoặc ký tự đặc biệt.';
    if(low.includes('session')&&low.includes('missing'))return'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
    return raw||'Không đổi được mật khẩu.';
  }
  function isSamePasswordError(error){const low=txt(error?.message||error).toLowerCase();return low.includes('new password should be different')||low.includes('same password')}

  function markerKey(api){
    const id=api?.session?.user?.id||api?.profile?.id||'';
    return id?`lbg-password-direct:${id}`:'';
  }

  async function savePassword(form){
    const api=window.LBGAuth;
    const p=q('lbgNewPass')?.value||'',p2=q('lbgNewPass2')?.value||'';
    const msg=q('lbgPassMsg'),button=q('lbgSavePass');
    if(!api?.client||!api?.session){if(msg)msg.textContent='Phiên đăng nhập chưa sẵn sàng. Hãy tải lại trang và thử lại.';return}
    if(p.length<8){if(msg)msg.textContent='Mật khẩu phải có ít nhất 8 ký tự.';return}
    if(p!==p2){if(msg)msg.textContent='Hai lần nhập chưa khớp.';return}

    const old=button?.textContent||'Lưu',key=markerKey(api);
    if(button){button.disabled=true;button.textContent='Đang lưu…'}
    if(msg){msg.classList.remove('ok');msg.textContent='Đang cập nhật mật khẩu…'}
    api.passwordChangeInProgress=true;
    try{
      const alreadyUpdated=Boolean(key&&localStorage.getItem(key)==='1');
      if(!alreadyUpdated){
        const {error}=await api.client.auth.updateUser({password:p});
        if(error&&!isSamePasswordError(error))throw error;
        if(key)localStorage.setItem(key,'1');
      }

      if(msg)msg.textContent='Mật khẩu đã cập nhật. Đang xác nhận tài khoản…';
      let lastError=null,done=false;
      for(let i=0;i<3;i++){
        const {error}=await api.client.rpc('complete_password_change');
        if(error){lastError=error;await new Promise(r=>setTimeout(r,250*(i+1)));continue}
        const {data,error:profileError}=await api.client.from('profiles').select('must_change_password').eq('id',api.session.user.id).single();
        if(profileError){lastError=profileError;await new Promise(r=>setTimeout(r,250*(i+1)));continue}
        if(data?.must_change_password===false){done=true;break}
        lastError=new Error('Máy chủ chưa xác nhận trạng thái đổi mật khẩu.');
        await new Promise(r=>setTimeout(r,250*(i+1)));
      }
      if(!done)throw lastError||new Error('Chưa hoàn tất được việc xác nhận đổi mật khẩu.');

      if(key)localStorage.removeItem(key);
      if(api.profile)api.profile.must_change_password=false;
      if(msg){msg.classList.add('ok');msg.textContent='Đổi mật khẩu thành công. Đang mở hệ thống…'}
      setTimeout(()=>location.reload(),450);
    }catch(error){
      const alreadyUpdated=Boolean(key&&localStorage.getItem(key)==='1');
      if(msg)msg.textContent=(alreadyUpdated?'Mật khẩu đã được cập nhật, nhưng bước xác nhận chưa hoàn tất. Hãy bấm Lưu lại. Chi tiết: ':'')+errorText(error);
      if(button){button.disabled=false;button.textContent=old}
      api.passwordChangeInProgress=false;
    }
  }

  function patch(){
    const form=q('lbgPasswordForm'),button=q('lbgSavePass');
    if(!form||!button||form===patchedForm)return;
    patchedForm=form;
    button.type='button';
    button.removeAttribute('disabled');
    button.onclick=e=>{e.preventDefault();e.stopPropagation();savePassword(form)};
    form.onsubmit=e=>{e.preventDefault();savePassword(form)};
    button.dataset.lbgPasswordHotfix='1';
  }

  const observer=new MutationObserver(patch);
  function start(){patch();observer.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
})();
