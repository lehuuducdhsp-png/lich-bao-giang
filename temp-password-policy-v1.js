'use strict';
(function(){
  const VERSION='20260907.2';
  const PREFIX='hoannang';
  const txt=v=>String(v??'').trim();
  const q=id=>document.getElementById(id);
  let observer=null,queued=false;

  function passwordForUsername(username){
    const m=txt(username).toLowerCase().match(/^gv(\d+)$/);
    return m?PREFIX+m[1]:'';
  }

  async function invokeAdmin(body){
    const api=window.LBGAuth;
    if(!api?.client)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');
    const {data,error}=await api.client.functions.invoke('admin-users',{body});
    if(error){
      let message=error?.message||String(error);
      try{
        const response=error?.context;
        if(response){
          const copy=typeof response.clone==='function'?response.clone():response;
          const payload=await copy.json();
          if(payload?.error)message=payload.error;
        }
      }catch{}
      throw new Error(message);
    }
    if(data?.error)throw new Error(data.error);
    return data||{};
  }

  function setPasswordField(field,value){
    if(!field||!value||field.disabled)return;
    if(field.value===value&&field.dataset.lbgTempPolicy==='1')return;
    field.value=value;
    field.dataset.lbgTempPolicy='1';
    field.readOnly=true;
    field.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function syncSingle(){
    const user=q('lbgNewUsername'),pass=q('lbgNewPassword');
    if(!user||!pass)return;
    if(user.dataset.lbgTempPolicyBound!=='1'){
      user.dataset.lbgTempPolicyBound='1';
      const sync=()=>{
        const value=passwordForUsername(user.value);
        if(value){setPasswordField(pass,value);pass.type='text'}
        else if(pass.dataset.lbgTempPolicy==='1'){
          pass.dataset.lbgTempPolicy='0';pass.readOnly=false;pass.value='';pass.type='password';
        }
      };
      user.addEventListener('input',sync);
      user.addEventListener('change',sync);
      sync();
    }
    const label=pass.closest('label');
    if(label&&!label.querySelector('.lbg-temp-password-hint')){
      const hint=document.createElement('small');
      hint.className='lbg-temp-password-hint';
      hint.textContent='Quy tắc GV: GV035 → hoannang035. Sau lần đổi đầu, mật khẩu tạm không còn dùng được.';
      hint.style.cssText='display:block;margin-top:4px;color:#806b61;font-size:11px;line-height:1.35';
      label.appendChild(hint);
    }
  }

  function syncBulk(){
    document.querySelectorAll('#lbgBulkRows tr').forEach(row=>{
      const user=row.querySelector('[data-bulk-user]'),pass=row.querySelector('[data-bulk-pass]');
      if(!user||!pass||user.disabled||pass.disabled)return;
      const apply=()=>{
        const value=passwordForUsername(user.value);
        if(value)setPasswordField(pass,value);
      };
      if(user.dataset.lbgTempPolicyBound!=='1'){
        user.dataset.lbgTempPolicyBound='1';
        user.addEventListener('input',apply);
        user.addEventListener('change',apply);
      }
      apply();
    });
  }

  async function resetWithPolicy(button){
    const row=button.closest('tr');
    const username=txt(row?.querySelector('td:first-child small')?.textContent).toLowerCase();
    const password=passwordForUsername(username);
    if(!password)return false;
    if(!confirm(`Đặt lại mật khẩu tạm của ${username.toUpperCase()} thành ${password}?\n\nNgười dùng sẽ buộc đổi mật khẩu ngay ở lần đăng nhập tiếp theo.`))return true;
    await invokeAdmin({action:'reset_password',user_id:button.dataset.reset,password});
    alert(`Đã đặt lại mật khẩu tạm: ${password}\nNgười dùng phải đổi mật khẩu sau khi đăng nhập.`);
    return true;
  }

  function pendingGvRows(){
    return [...document.querySelectorAll('#lbgOwnerRows tr')].filter(row=>{
      const username=txt(row.querySelector('td:first-child small')?.textContent);
      return Boolean(passwordForUsername(username))&&/Phải đổi mật khẩu/i.test(row.textContent||'');
    });
  }

  function ensurePendingResetButton(){
    const card=q('lbgOwnerCard');
    if(!card||!window.LBGAuth?.isOwner?.())return;
    let box=q('lbgTempPasswordPolicyBox');
    if(!box){
      box=document.createElement('div');
      box.id='lbgTempPasswordPolicyBox';
      box.className='notice';
      box.style.cssText='display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap';
      box.innerHTML='<div><b>🔐 Mật khẩu tạm giáo viên</b><br><small>GV035 → hoannang035. Chỉ áp dụng khi tạo mới hoặc khi Chủ sở hữu đặt lại. Tài khoản đã đổi mật khẩu không bị tác động.</small></div><button class="btn outline" type="button" id="lbgNormalizePendingPasswords">Chuẩn hóa tài khoản chưa đổi</button>';
      const toolbar=card.querySelector('.lbg-owner-toolbar');
      if(toolbar)toolbar.insertAdjacentElement('afterend',box);else card.querySelector('.head')?.insertAdjacentElement('afterend',box);
      q('lbgNormalizePendingPasswords').onclick=async()=>{
        const button=q('lbgNormalizePendingPasswords');
        const count=pendingGvRows().length;
        const detail=count?`Hiện bảng quản lý có ${count} tài khoản GV đang ở trạng thái “Phải đổi mật khẩu”.`:'Hệ thống sẽ tự kiểm tra lại trên máy chủ.';
        if(!confirm(`${detail}\n\nChỉ các tài khoản GV### còn must_change_password=true mới được đưa về mật khẩu tạm hoannang###. Tài khoản đã đổi mật khẩu sẽ được bỏ qua. Tiếp tục?`))return;
        const old=button.textContent;button.disabled=true;button.textContent='Đang chuẩn hóa…';
        try{
          const result=await invokeAdmin({action:'reset_pending_gv_passwords'});
          const reset=Array.isArray(result.reset)?result.reset:[];
          const failed=Array.isArray(result.failed)?result.failed:[];
          const lines=[`Đã chuẩn hóa ${reset.length} tài khoản chưa đổi mật khẩu.`];
          if(reset.length)lines.push('Tài khoản: '+reset.map(x=>String(x).toUpperCase()).join(', '));
          if(failed.length)lines.push(`Có ${failed.length} tài khoản lỗi; chưa thay đổi các tài khoản lỗi.`);
          alert(lines.join('\n'));
        }catch(error){alert('Không chuẩn hóa được mật khẩu tạm: '+(error?.message||String(error)))}
        finally{button.disabled=false;button.textContent=old}
      };
    }
    const button=q('lbgNormalizePendingPasswords');
    if(button){
      const count=pendingGvRows().length;
      button.textContent=count?`Chuẩn hóa ${count} tài khoản chưa đổi`:'Chuẩn hóa tài khoản chưa đổi';
    }
  }

  function bindResetCapture(){
    if(document.documentElement.dataset.lbgTempResetBound==='1')return;
    document.documentElement.dataset.lbgTempResetBound='1';
    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('[data-reset]');
      if(!button)return;
      const row=button.closest('tr');
      const username=txt(row?.querySelector('td:first-child small')?.textContent).toLowerCase();
      if(!passwordForUsername(username))return;
      event.preventDefault();event.stopImmediatePropagation();
      resetWithPolicy(button).catch(error=>alert('Không đặt lại được mật khẩu: '+(error?.message||String(error))));
    },true);
  }

  function run(){queued=false;syncSingle();syncBulk();ensurePendingResetButton();bindResetCapture()}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(run)}
  function start(){
    run();
    observer=new MutationObserver(queue);
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('lbg-access-ready',queue);
    window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.LBGTempPasswordPolicyV1={version:VERSION,passwordForUsername};
})();
