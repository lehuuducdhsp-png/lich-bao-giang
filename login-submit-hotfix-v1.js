'use strict';
(function(){
  const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();

  function fixLogin(){
    const form=document.getElementById('lbgLoginForm')||document.querySelector('.lbg-login-box form');
    if(!form)return;

    const buttons=[...form.querySelectorAll('button')];
    const loginButton=buttons.find(button=>/^(đăng nhập|dang nhap)$/.test(text(button)))
      || buttons.find(button=>button.classList.contains('primary'));

    if(loginButton){
      loginButton.type='submit';
      loginButton.removeAttribute('aria-disabled');
    }
  }

  let queued=false;
  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;fixLogin()});
  }

  function start(){
    fixLogin();
    const observer=new MutationObserver(queue);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['type','class','disabled']});
    window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
