'use strict';
(function(){
  const label=button=>String(button?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
  function repair(){
    document.querySelectorAll('form[onsubmit]').forEach(form=>{
      if(form.querySelector('button[type="submit"],input[type="submit"]'))return;
      const candidates=[...form.querySelectorAll('button[type="button"]')].filter(button=>{
        if(button.hasAttribute('onclick'))return false;
        return !/(đóng|hủy|huỷ|quay lại|xóa|xoá|bỏ qua)/i.test(label(button));
      });
      const target=candidates.find(button=>button.classList.contains('primary'))||candidates[candidates.length-1];
      if(target)target.type='submit';
    });
  }
  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})}
  function start(){repair();const observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['type']});window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
