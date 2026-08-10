'use strict';
(function(){
  const q=id=>document.getElementById(id);
  function todayKey(){
    try{const x=window.LBGCheckinV2?.today?.();if(/^\d{4}-\d{2}-\d{2}$/.test(String(x||'')))return x}catch{}
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const m=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${m.year}-${m.month}-${m.day}`;
  }
  function meta(key=todayKey()){
    const m=String(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return{key,label:key,weekday:''};
    const d=new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+07:00`);
    const weekday=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'long'}).format(d);
    const pretty=`${m[3]}/${m[2]}/${m[1]}`;
    return{key,label:`${weekday.charAt(0).toUpperCase()+weekday.slice(1)}, ${pretty}`,weekday:weekday.charAt(0).toUpperCase()+weekday.slice(1),pretty};
  }
  function decorate(){
    const card=q('lbgCheckinCard');if(!card)return;
    const d=meta();
    const panels=[...card.querySelectorAll('.lbg-checkin-panel')];
    for(const panel of panels){
      const h4=panel.querySelector('h4');if(!h4)continue;
      const t=String(h4.textContent||'').trim();
      if(t.includes('Hôm nay bạn dạy ở đâu?')){
        if(!panel.querySelector('[data-lbg-today-label]')){
          const badge=document.createElement('div');badge.dataset.lbgTodayLabel='1';badge.className='lbg-checkin-source';badge.style.marginTop='8px';badge.innerHTML=`📅 Ngày đối chiếu TKB: <b>${d.label}</b> • Giờ Việt Nam`;
          h4.insertAdjacentElement('afterend',badge);
        }else panel.querySelector('[data-lbg-today-label]').innerHTML=`📅 Ngày đối chiếu TKB: <b>${d.label}</b> • Giờ Việt Nam`;
        for(const point of panel.querySelectorAll('.lbg-checkin-point')){
          const p=point.querySelector('.lbg-checkin-point-head p');if(!p||p.dataset.lbgDateDecorated==='1')continue;
          p.textContent=`${d.weekday} • ${d.pretty} • ${p.textContent}`;
          p.dataset.lbgDateDecorated='1';
        }
      }
      if(t==='Lịch sử hôm nay'&&!h4.dataset.lbgDateDecorated){h4.textContent=`Lịch sử hôm nay • ${d.label}`;h4.dataset.lbgDateDecorated='1'}
    }
  }
  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}
  const observer=new MutationObserver(queue);
  function start(){decorate();observer.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
})();
