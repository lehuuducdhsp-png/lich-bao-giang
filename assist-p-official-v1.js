'use strict';
(function(){
  const VERSION='20260911.1';
  function hideTrialBanner(){
    let style=document.getElementById('lbgAssistPOfficialHideTrial');
    if(!style){
      style=document.createElement('style');
      style.id='lbgAssistPOfficialHideTrial';
      style.textContent='#lbgAssistPTrialBanner{display:none!important}';
      document.head.appendChild(style);
    }
    document.getElementById('lbgAssistPTrialBanner')?.remove();
  }
  function load(src,id){
    return new Promise((resolve,reject)=>{
      const old=document.getElementById(id);
      if(old){resolve();return}
      const s=document.createElement('script');
      s.id=id;s.src=src;s.async=false;
      s.onload=resolve;s.onerror=()=>reject(new Error('Không tải được '+src));
      document.body.appendChild(s);
    });
  }
  async function start(){
    hideTrialBanner();
    try{
      await load('assist-p-trial-v1.js?v=20260911.2','lbgAssistPOfficialCore');
      await load('assist-p-preview-position-hotfix-v1.js?v=20260911.1','lbgAssistPOfficialPositionFix');
      hideTrialBanner();
      let tries=0;
      const t=setInterval(()=>{
        tries++;hideTrialBanner();
        if(window.LBGAssistPTrial){
          window.LBGAssistP=window.LBGAssistPTrial;
          window.LBGAssistP.officialVersion=VERSION;
          clearInterval(t);
        }else if(tries>100){clearInterval(t)}
      },100);
    }catch(error){console.error('Trợ giảng (P): không nạp được mô-đun chính thức.',error)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
