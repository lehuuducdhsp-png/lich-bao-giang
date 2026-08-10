'use strict';
(function(){
  function attemptNo(el){
    const text=String(el?.querySelector('b')?.textContent||el?.textContent||'');
    const m=text.match(/Lần\s+(\d+)/i);
    return m?Number(m[1]):-1;
  }

  function sortHistory(container){
    const items=[...container.children].filter(el=>el.classList?.contains('lbg-checkin-attempt'));
    if(items.length<2)return;
    const sorted=[...items].sort((a,b)=>attemptNo(b)-attemptNo(a));
    const already=items.every((el,i)=>el===sorted[i]);
    if(already)return;
    const frag=document.createDocumentFragment();
    for(const el of sorted)frag.appendChild(el);
    container.appendChild(frag);
  }

  function apply(){
    document.querySelectorAll('.lbg-checkin-history').forEach(sortHistory);
  }

  let queued=false;
  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  }

  const observer=new MutationObserver(queue);
  function start(){
    apply();
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
})();
