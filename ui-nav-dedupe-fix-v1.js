'use strict';
(function(){
  const norm=value=>String(value??'').replace(/\s+/g,' ').trim().toLowerCase();

  function addStyle(){
    if(document.getElementById('lbgNavDedupeFixCss'))return;
    const style=document.createElement('style');
    style.id='lbgNavDedupeFixCss';
    style.textContent=`
      main.shell > section.grid.lbg-ui-section{
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
        padding:0!important;
        overflow:visible!important;
      }
      main.shell > section.grid.lbg-ui-section:before{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function repairGridIds(){
    document.querySelectorAll('main.shell > section.grid.lbg-ui-section[id]').forEach(outer=>{
      const same=[...outer.querySelectorAll(':scope > article.card.lbg-ui-section[id]')].find(inner=>inner.id===outer.id);
      if(!same)return;
      const base=outer.id+'-group';
      let next=base,index=2;
      while(document.getElementById(next))next=base+'-'+index++;
      outer.id=next;
    });
  }

  function preferredButton(buttons){
    return buttons.find(button=>{
      const target=document.getElementById(button.dataset.target||'');
      return target?.matches('article.card,.card')&&!target?.matches('section.grid');
    })||buttons[0];
  }

  function cleanNav(){
    const nav=document.getElementById('lbgUiNav');
    if(!nav)return;
    const groups=[...nav.querySelectorAll('.lbg-ui-nav-group')];
    groups.forEach(group=>{
      const buckets=new Map();
      group.querySelectorAll('.lbg-ui-nav-link').forEach(button=>{
        const text=norm(button.querySelector('.lbg-ui-nav-text')?.textContent||button.textContent);
        if(!text)return;
        if(!buckets.has(text))buckets.set(text,[]);
        buckets.get(text).push(button);
      });
      buckets.forEach(buttons=>{
        if(buttons.length<2)return;
        const keep=preferredButton(buttons);
        buttons.forEach(button=>{if(button!==keep)button.remove()});
      });
      if(!group.querySelector('.lbg-ui-nav-link'))group.remove();
    });
  }

  let queued=false;
  function repair(){
    queued=false;
    addStyle();
    repairGridIds();
    cleanNav();
  }
  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(repair);
  }

  function start(){
    repair();
    const observer=new MutationObserver(queue);
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
