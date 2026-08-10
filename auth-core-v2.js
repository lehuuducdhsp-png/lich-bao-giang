'use strict';
(function(){
  const cfg=window.LBG_SUPABASE_CONFIG;
  if(!cfg||!cfg.enabled)return;

  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const api={
    client:null,session:null,profile:null,readyHandlers:[],logoutHandlers:[],readyNotified:false,passwordChangeInProgress:false,
    onReady(fn){this.readyHandlers.push(fn);if(this.profile&&!this.profile.must_change_password&&this.readyNotified)fn(this)},
    onLogout(fn){this.logoutHandlers.push(fn)},
    isOwner(){return this.profile?.role==='owner'},
    canUploadShared(){return this.isOwner()||this.profile?.role==='uploader'||this.profile?.can_upload_shared}
  };
  window.LBGAuth=api;

  function load(src,id){return new Promise((ok,no)=>{if(q(id))return ok();const s=document.createElement('script');s.id=id;s.src=src;s.onload=ok;s.onerror=()=>no(new Error('Không tải được thư viện đăng nhập.'));document.head.appendChild(s)})}
  function style(){
    if(q('lbgAuthCoreStyle'))return;
    const s=document.createElement('style');s.id='lbgAuthCoreStyle';s.textContent=`
      body.lbg-auth-locked{overflow:hidden}.lbg-auth-gate,.lbg-password-gate{position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#082f49,#0f766e 65%,#16a34a);display:grid;place-items:center;padding:18px}.lbg-login-box{width:min(440px,100%);background:#fff;border-radius:24px;padding:26px;box-shadow:0 24px 80px #001a}.lbg-login-box h2{margin:0 0 6px;color:#082f49}.lbg-login-box p{margin:0 0 18px;color:#64748b}.lbg-login-box label{display:grid;gap:6px;margin:12px 0;font-size:13px;font-weight:750}.lbg-login-box input{padding:11px 12px;border:1px solid #dbe6eb;border-radius:11px;font:inherit}.lbg-auth-actions{display:flex;gap:9px;margin-top:16px;flex-wrap:wrap}.lbg-auth-msg{min-height:22px;margin-top:10px;font-size:12px;color:#b91c1c}.lbg-auth-msg.ok{color:#166534}.lbg-pass-help{font-size:11px;color:#64748b;margin-top:-6px}.lbg-userbar{position:sticky;top:73px;z-index:9;max-width:1450px;margin:auto;padding:8px 24px;display:flex;gap:8px;justify-content:flex-end;align-items:center}.lbg-userchip{background:#fff;border:1px solid #dbe6eb;border-radius:999px;padding:7px 11px;font-size:12px;box-shadow:0 8px 24px #082f4912}.lbg-role-hidden{display:none!important}@media(max-width:760px){.lbg-userbar{top:65px;padding:7px 13px;flex-wrap:wrap}}
    `;document.head.appendChild(s)
  }
  function emailOf(username){return`${txt(username).toLowerCase()}@${cfg.usernameDomain||'users.lichbaogiang.internal'}`}
  function roleName(role){return role==='owner'?'Chủ sở hữu':role==='uploader'?'Được tải TKB chung':'Người dùng'}
  function markerKey(){return api.session?.user?.id?`lbg-password-updated:${api.session.user.id}`:''}
  function translateAuthError(error){
    const raw=txt(error?.message||error);
    const low=raw.toLowerCase();
    if(low.includes('invalid login credentials'))return'Sai mã đăng nhập hoặc mật khẩu.';
    if(low.includes('password should be at least')||low.includes('password must be at least'))return'Mật khẩu chưa đủ độ dài theo yêu cầu của hệ thống.';
    if(low.includes('new password should be different')||low.includes('same password'))return'Mật khẩu mới phải khác mật khẩu đang dùng.';
    if(low.includes('weak password'))return'Mật khẩu này chưa đủ an toàn. Hãy dùng ít nhất 8 ký tự và nên kết hợp chữ hoa, chữ thường, số hoặc ký tự đặc biệt.';
    if(low.includes('session')&&low.includes('missing'))return'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
    return raw||'Không thực hiện được thao tác.';
  }

  function gate(){
    if(q('lbgAuthGate'))return;
    document.body.classList.add('lbg-auth-locked');
    const d=document.createElement('div');d.id='lbgAuthGate';d.className='lbg-auth-gate';
    d.innerHTML=`<form class="lbg-login-box" id="lbgLoginForm"><h2>🔐 Đăng nhập Lịch Báo giảng</h2><p>Nhập mã tài khoản và mật khẩu do chủ sở hữu cấp.</p><label>Mã đăng nhập<input id="lbgLoginUser" maxlength="32" autocomplete="username" placeholder="Ví dụ: GV001" required></label><label>Mật khẩu<input id="lbgLoginPass" type="password" autocomplete="current-password" required></label><div class="lbg-auth-actions"><button class="btn primary" id="lbgLoginBtn">Đăng nhập</button><button class="btn outline" type="button" id="lbgShowPass">Hiện mật khẩu</button></div><div id="lbgLoginMsg" class="lbg-auth-msg"></div></form>`;
    document.body.appendChild(d);
    q('lbgShowPass').onclick=()=>{const p=q('lbgLoginPass');p.type=p.type==='password'?'text':'password';q('lbgShowPass').textContent=p.type==='password'?'Hiện mật khẩu':'Ẩn mật khẩu'};
    q('lbgLoginForm').onsubmit=login
  }
  function closeGate(){q('lbgAuthGate')?.remove();if(!q('lbgPasswordGate'))document.body.classList.remove('lbg-auth-locked')}

  async function login(e){
    e.preventDefault();
    const b=q('lbgLoginBtn'),old=b.textContent,msg=q('lbgLoginMsg');b.disabled=true;b.textContent='Đang đăng nhập…';msg.textContent='';
    try{
      const username=txt(q('lbgLoginUser').value).toLowerCase();if(!/^[a-z0-9._-]{3,32}$/.test(username))throw new Error('Mã đăng nhập không hợp lệ.');
      const{data,error}=await api.client.auth.signInWithPassword({email:emailOf(username),password:q('lbgLoginPass').value});if(error)throw error;await accept(data.session)
    }catch(error){msg.textContent=translateAuthError(error)}finally{b.disabled=false;b.textContent=old}
  }
  async function profileFor(session){
    const{data,error}=await api.client.from('profiles').select('*').eq('id',session.user.id).single();if(error)throw error;
    if(!data.is_active)throw new Error('Tài khoản đã bị khóa.');if(data.expires_at&&new Date(data.expires_at)<=new Date())throw new Error('Tài khoản đã hết hạn.');return data
  }
  function notifyReady(){
    if(api.readyNotified||!api.profile||api.profile.must_change_password)return;
    api.readyNotified=true;api.readyHandlers.forEach(fn=>{try{fn(api)}catch(e){console.error(e)}})
  }
  async function accept(session){
    api.session=session;
    if(!session){
      api.profile=null;api.readyNotified=false;gate();api.logoutHandlers.forEach(fn=>{try{fn(api)}catch(e){console.error(e)}});return
    }
    try{
      api.profile=await profileFor(session);await api.client.rpc('mark_login');closeGate();userbar();roleVisibility();
      if(api.profile.must_change_password){passwordGate(true);return}
      q('lbgPasswordGate')?.remove();document.body.classList.remove('lbg-auth-locked');notifyReady()
    }catch(error){
      await api.client.auth.signOut();api.session=null;api.profile=null;api.readyNotified=false;gate();const m=q('lbgLoginMsg');if(m)m.textContent=translateAuthError(error)
    }
  }
  function userbar(){
    let b=q('lbgUserBar');if(!b){b=document.createElement('div');b.id='lbgUserBar';b.className='lbg-userbar';document.querySelector('header.top')?.insertAdjacentElement('afterend',b)}
    b.innerHTML=`<span class="lbg-userchip"><b>${esc(api.profile.display_name||api.profile.username)}</b> • ${esc(roleName(api.profile.role))}</span><button class="btn outline mini" id="lbgChangePass">Đổi mật khẩu</button><button class="btn outline danger mini" id="lbgLogout">Đăng xuất</button>`;
    q('lbgChangePass').onclick=()=>passwordGate(false);q('lbgLogout').onclick=()=>api.client.auth.signOut()
  }
  function roleVisibility(){const owner=api.isOwner();document.querySelectorAll('button,a').forEach(el=>{if(/Google Sheets/i.test(txt(el.textContent)))el.classList.toggle('lbg-role-hidden',!owner)});document.documentElement.dataset.lbgRole=api.profile.role}

  async function finalizePasswordFlag(){
    let lastError=null;
    for(let i=0;i<3;i++){
      const{error}=await api.client.rpc('complete_password_change');
      if(!error){
        const session=(await api.client.auth.getSession()).data.session;if(!session)throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
        const p=await profileFor(session);if(!p.must_change_password){api.session=session;api.profile=p;return true}
        lastError=new Error('Máy chủ chưa xác nhận trạng thái đổi mật khẩu.');
      }else lastError=error;
      await sleep(250*(i+1))
    }
    throw lastError||new Error('Chưa hoàn tất được việc xác nhận đổi mật khẩu.')
  }
  async function recoverPendingPasswordCompletion(required,d,msg){
    const key=markerKey();if(!required||!key||localStorage.getItem(key)!=='1')return false;
    msg.classList.remove('ok');msg.textContent='Mật khẩu đã được cập nhật ở lần trước. Đang hoàn tất xác nhận…';
    try{
      await finalizePasswordFlag();localStorage.removeItem(key);d.remove();document.body.classList.remove('lbg-auth-locked');msg.textContent='';notifyReady();alert('Đã hoàn tất đổi mật khẩu thành công.');return true
    }catch(error){msg.textContent='Mật khẩu đã đổi nhưng chưa hoàn tất xác nhận: '+translateAuthError(error)+' Hãy bấm Lưu lại.';return false}
  }
  function passwordGate(required){
    if(q('lbgPasswordGate'))return;
    document.body.classList.add('lbg-auth-locked');
    const d=document.createElement('div');d.id='lbgPasswordGate';d.className='lbg-password-gate';
    d.innerHTML=`<form class="lbg-login-box" id="lbgPasswordForm"><h2>Đổi mật khẩu</h2><p>${required?'Bạn phải đổi mật khẩu tạm trước khi tiếp tục.':'Nhập mật khẩu mới cho tài khoản.'}</p><label>Mật khẩu mới<input id="lbgNewPass" type="password" minlength="8" autocomplete="new-password" required></label><div class="lbg-pass-help">Tối thiểu 8 ký tự. Không chia sẻ mật khẩu cho người khác.</div><label>Nhập lại mật khẩu<input id="lbgNewPass2" type="password" minlength="8" autocomplete="new-password" required></label><div class="lbg-auth-actions"><button class="btn primary" id="lbgSavePass">Lưu</button><button class="btn outline" type="button" id="lbgToggleNewPass">Hiện mật khẩu</button>${required?'':'<button class="btn outline" type="button" id="lbgCancelPass">Hủy</button>'}</div><div id="lbgPassMsg" class="lbg-auth-msg"></div></form>`;
    document.body.appendChild(d);
    q('lbgCancelPass')?.addEventListener('click',()=>{d.remove();document.body.classList.remove('lbg-auth-locked')});
    q('lbgToggleNewPass').onclick=()=>{const a=q('lbgNewPass'),b=q('lbgNewPass2'),show=a.type==='password';a.type=show?'text':'password';b.type=show?'text':'password';q('lbgToggleNewPass').textContent=show?'Ẩn mật khẩu':'Hiện mật khẩu'};
    const msg=q('lbgPassMsg');recoverPendingPasswordCompletion(required,d,msg).catch(console.error);
    q('lbgPasswordForm').onsubmit=async e=>{
      e.preventDefault();
      const p=q('lbgNewPass').value,p2=q('lbgNewPass2').value,m=q('lbgPassMsg'),b=q('lbgSavePass'),old=b.textContent,key=markerKey();
      m.classList.remove('ok');m.textContent='';
      if(p.length<8){m.textContent='Mật khẩu phải có ít nhất 8 ký tự.';return}
      if(p!==p2){m.textContent='Hai lần nhập chưa khớp.';return}
      b.disabled=true;b.textContent='Đang lưu…';api.passwordChangeInProgress=true;
      try{
        const alreadyUpdated=Boolean(key&&localStorage.getItem(key)==='1');
        if(!alreadyUpdated){
          const{error}=await api.client.auth.updateUser({password:p});if(error)throw error;if(key)localStorage.setItem(key,'1')
        }
        await finalizePasswordFlag();if(key)localStorage.removeItem(key);api.profile.must_change_password=false;d.remove();document.body.classList.remove('lbg-auth-locked');notifyReady();alert('Đã đổi mật khẩu thành công.')
      }catch(error){
        const alreadyUpdated=Boolean(key&&localStorage.getItem(key)==='1');
        m.textContent=(alreadyUpdated?'Mật khẩu đã được cập nhật nhưng chưa hoàn tất xác nhận. Hãy bấm Lưu lại. Chi tiết: ':'')+translateAuthError(error)
      }finally{api.passwordChangeInProgress=false;b.disabled=false;b.textContent=old}
    }
  }

  async function init(){
    style();gate();
    try{
      await load('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','lbgSupabaseJs');
      api.client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      const{data}=await api.client.auth.getSession();if(data.session)await accept(data.session);
      api.client.auth.onAuthStateChange((_event,next)=>{
        if(api.passwordChangeInProgress)return;
        if(next?.access_token===api.session?.access_token&&next?.user?.id===api.session?.user?.id)return;
        setTimeout(()=>accept(next),0)
      })
    }catch(error){const m=q('lbgLoginMsg');if(m)m.textContent='Không kết nối được hệ thống đăng nhập: '+translateAuthError(error)}
  }
  init();
})();
