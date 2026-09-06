'use strict';
(function(){
  const VERSION='20260907.1';
  const PREFIX='hoannang';
  const txt=v=>String(v??'').trim();
  const q=id=>document.getElementById(id);
  let observer=null,queued=false;

  function passwordForUsername(username){
    const m=txt(username).toLowerCase().match(/^gv(\d+)$/);
    return m?PREFIX+m[1]:'';
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
    const api=window.LBGAuth;
    if(!api?.client)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');
    const {data,error}=await api.client.functions.invoke('admin-users',{body:{action:'reset_password',user_id:button.dataset.reset,password}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    alert(`Đã đặt lại mật khẩu tạm: ${password}\nNgười dùng phải đổi mật khẩu sau khi đăng nhập.`);
    return true;
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

  function run(){queued=false;syncSingle();syncBulk();bindResetCapture()}
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
