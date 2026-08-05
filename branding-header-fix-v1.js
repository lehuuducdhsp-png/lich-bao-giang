'use strict';
(function(){
  const q=id=>document.getElementById(id);
  function style(){
    if(q('lbgBrandHeaderFixCss'))return;
    const s=document.createElement('style');s.id='lbgBrandHeaderFixCss';s.textContent=`
      .top .logo.lbg-brand-logo-box:not(.lbg-brand-has-image){width:48px!important;height:48px!important;min-width:48px!important;justify-content:center!important;border-radius:15px!important}
      @media(max-width:620px){.top .logo.lbg-brand-logo-box:not(.lbg-brand-has-image){width:44px!important;height:44px!important;min-width:44px!important}}
    `;document.head.appendChild(s);
  }
  function sync(){
    const box=document.querySelector('header.top .logo.lbg-brand-logo-box');
    if(!box)return;
    box.classList.toggle('lbg-brand-has-image',Boolean(box.querySelector('img')));
  }
  style();sync();
  const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
})();
