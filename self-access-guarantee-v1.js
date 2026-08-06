'use strict';
(function(){
  function ensureSelf(context){
    if(!context)return;
    const self=String(context.teacher_code||'').trim().toUpperCase();
    if(!self)return;
    if(!Array.isArray(context.teacher_codes))context.teacher_codes=[];
    const codes=context.teacher_codes.map(code=>String(code||'').trim().toUpperCase());
    if(!codes.includes(self))context.teacher_codes.push(self);
    const live=window.LBGAccess?.context;
    if(live&&live!==context){
      if(!Array.isArray(live.teacher_codes))live.teacher_codes=[];
      const liveCodes=live.teacher_codes.map(code=>String(code||'').trim().toUpperCase());
      if(!liveCodes.includes(self))live.teacher_codes.push(self);
    }
  }

  document.addEventListener('lbg-access-ready',event=>ensureSelf(event.detail));
  const timer=setInterval(()=>{
    const context=window.LBGAccess?.context;
    if(context)ensureSelf(context);
  },1200);
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
})();
