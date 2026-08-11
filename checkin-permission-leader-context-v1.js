'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  let observer=null,queued=false;

  function context(){return window.LBGAccess?.context||null}
  function profile(){return window.LBGAuth?.profile||null}

  function ensureStyle(){
    if(q('lbgCheckinLeaderContextCss'))return;
    const s=document.createElement('style');s.id='lbgCheckinLeaderContextCss';s.textContent=`
      .lbg-p3-leader-context{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin:10px 0;padding:11px 12px;border:1px solid #f2d9c9;border-radius:12px;background:#fffaf5}
      .lbg-p3-leader-context b{color:#5b3828}.lbg-p3-leader-context small{display:block;margin-top:2px;color:#806b61}
      .lbg-p3-leader-right{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.lbg-p3-leader-pill{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;background:#fff3e8;color:#8f5636;font-size:11px;font-weight:800}
      @media(max-width:650px){.lbg-p3-leader-context{display:grid}.lbg-p3-leader-right{justify-content:flex-start}}
    `;document.head.appendChild(s)
  }

  function selectedGroupText(){
    const sel=q('lbgP3Bucket');
    if(!sel)return'';
    const opt=sel.options?.[sel.selectedIndex];
    return txt(opt?.textContent).replace(/\s*\(\d+\)\s*$/,'');
  }

  function apply(){
    const c=context(),p=profile(),panel=q('lbgCheckinPermissionAdminV3');
    if(!panel)return;
    let box=q('lbgP3LeaderContext');
    if(!c?.is_group_leader||c?.is_owner){if(box)box.remove();return}
    ensureStyle();
    if(!box){
      box=document.createElement('div');box.id='lbgP3LeaderContext';box.className='lbg-p3-leader-context';
      const note=panel.querySelector('.lbg-checkin-note');
      if(note)note.insertAdjacentElement('afterend',box);else panel.prepend(box);
    }
    const name=txt(p?.display_name||p?.username)||'Nhóm trưởng';
    const username=txt(p?.username);
    const code=txt(p?.teacher_code);
    const group=selectedGroupText()||'Nhóm đang phụ trách';
    box.innerHTML=`<div><b>👤 Nhóm trưởng phụ trách: ${esc(name)} <span class="lbg-p3-leader-pill">Bạn</span></b><small>${esc(username)}${code?` • Mã ${esc(code)}`:''}</small></div><div class="lbg-p3-leader-right"><span class="lbg-p3-leader-pill">${esc(group)}</span><span class="lbg-p3-leader-pill">Quyền Nhóm trưởng • Chỉ đọc</span></div>`;
  }

  function bindSelect(){const sel=q('lbgP3Bucket');if(sel&&!sel.dataset.lbgLeaderBound){sel.dataset.lbgLeaderBound='1';sel.addEventListener('change',apply)}}
  function run(){apply();bindSelect()}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run()})}
  function start(){ensureStyle();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});run()}
  document.addEventListener('lbg-access-ready',queue);
  window.LBGAuth?.onReady?.(queue);
  window.addEventListener('focus',queue);
  window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
