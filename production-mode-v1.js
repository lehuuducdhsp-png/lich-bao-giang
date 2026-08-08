'use strict';
(function(){
  window.LBG_PRODUCTION=true;
  document.documentElement.dataset.lbgProduction='1';
  document.title='Lập Lịch Báo giảng';

  if(!document.getElementById('lbgProductionModeCss')){
    const s=document.createElement('style');
    s.id='lbgProductionModeCss';
    s.textContent='.lbg-finish-test-badge{display:none!important}';
    document.head.appendChild(s);
  }

  function clean(){
    document.querySelectorAll('.lbg-finish-test-badge').forEach(el=>{el.hidden=true;el.setAttribute('aria-hidden','true')});
    const footer=document.querySelector('footer');
    if(footer&&!footer.dataset.productionText){
      footer.dataset.productionText='1';
      footer.textContent='Hệ thống Lịch Báo giảng • Dữ liệu được xử lý và lưu theo cấu hình của hệ thống';
    }
  }
  clean();
  const observer=new MutationObserver(clean);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
})();
