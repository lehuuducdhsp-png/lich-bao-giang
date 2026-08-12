'use strict';
(function(){
  const VERSION='20260812.1';
  const STORE='lbg-checkin-monitor-compact-ux-v1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toLowerCase();
  let observer=null,queued=false;
  const defaults={search:'',status:'missing',group:'all',size:10,pages:{'Sáng':1,'Chiều':1}};
  let state=loadState();

  function loadState(){
    try{
      const x=JSON.parse(sessionStorage.getItem(STORE)||'{}');
      return{...defaults,...x,pages:{...defaults.pages,...(x.pages||{})},search:''};
    }catch{return JSON.parse(JSON.stringify(defaults))}
  }
  function saveState(){
    try{sessionStorage.setItem(STORE,JSON.stringify({...state,search:''}))}catch{}
  }
  function style(){
    if(q('lbgCheckinMonitorCompactUxCss'))return;
    const s=document.createElement('style');s.id='lbgCheckinMonitorCompactUxCss';s.textContent=`
      .lbg-cdm-ux-toolbar{margin-top:12px;padding:11px 12px;border:1px solid #eadfd8;border-radius:13px;background:#fffaf6;display:flex;gap:8px;align-items:end;flex-wrap:wrap}
      .lbg-cdm-ux-toolbar label{display:grid;gap:4px;color:#6f4b39;font-size:12px;font-weight:850;min-width:145px}.lbg-cdm-ux-toolbar label.search{flex:1;min-width:220px}
      .lbg-cdm-ux-toolbar input,.lbg-cdm-ux-toolbar select{width:100%;min-height:39px;padding:8px 10px;border:1px solid #e3cfc2;border-radius:10px;background:#fff;color:#4b342b;font:inherit}
      .lbg-cdm-ux-hint{flex-basis:100%;font-size:12px;color:#806b61;line-height:1.45}.lbg-cdm-ux-hint b{color:#9a5b36}
      .lbg-cdm-ux-pager{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 12px 11px;border-top:1px solid #f1e8e2;background:#fffdfb;color:#806b61;font-size:12px}
      .lbg-cdm-ux-page-actions{display:flex;gap:6px;align-items:center}.lbg-cdm-ux-page-actions b{min-width:74px;text-align:center;color:#5b3828}
      .lbg-cdm-ux-empty{margin:10px 12px 12px;padding:13px;border:1px dashed #e4cdbf;border-radius:12px;background:#fffaf7;color:#806b61;text-align:center;font-size:13px}
      @media(max-width:760px){.lbg-cdm-ux-toolbar{display:grid;grid-template-columns:1fr 1fr}.lbg-cdm-ux-toolbar label,.lbg-cdm-ux-toolbar label.search{min-width:0}.lbg-cdm-ux-toolbar label.search,.lbg-cdm-ux-hint{grid-column:1/-1}}
      @media(max-width:520px){.lbg-cdm-ux-toolbar{grid-template-columns:1fr}.lbg-cdm-ux-toolbar label.search,.lbg-cdm-ux-hint{grid-column:auto}.lbg-cdm-ux-pager{align-items:flex-start;flex-direction:column}}
    `;document.head.appendChild(s)
  }
  function isOwner(){return Boolean(window.LBGAccess?.context?.is_owner)}
  function sessionKey(section){const t=txt(section.querySelector('.lbg-cdm-session-head h5')?.textContent);return /sáng/i.test(t)?'Sáng':/chiều/i.test(t)?'Chiều':''}
  function cards(section){return[...(section.querySelector('.lbg-cdm-list')?.querySelectorAll(':scope>.lbg-cdm-teacher')||[])]}
  function groupOf(card){
    const sub=txt(card.querySelector('.lbg-cdm-sub')?.textContent);const parts=sub.split('•').map(txt).filter(Boolean);return parts.length>1?parts.slice(1).join(' • '):'Chưa phân nhóm'
  }
  function matches(card){
    const needle=fold(state.search),missing=card.classList.contains('missing'),group=groupOf(card);
    if(state.status==='missing'&&!missing)return false;
    if(state.status==='done'&&missing)return false;
    if(state.group!=='all'&&fold(group)!==fold(state.group))return false;
    if(needle&&!fold(card.textContent).includes(needle))return false;
    return true
  }
  function allCards(monitor){return[...monitor.querySelectorAll('.lbg-cdm-session .lbg-cdm-list>.lbg-cdm-teacher')]}
  function groupOptions(monitor){
    const groups=[...new Set(allCards(monitor).map(groupOf).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
    return groups
  }
  function statusCounts(monitor){
    const all=allCards(monitor).filter(c=>state.group==='all'||fold(groupOf(c))===fold(state.group));
    return{all:all.length,missing:all.filter(c=>c.classList.contains('missing')).length,done:all.filter(c=>!c.classList.contains('missing')).length}
  }
  function ensureToolbar(monitor){
    let bar=monitor.querySelector('[data-lbg-cdm-ux-toolbar]');
    if(!bar){
      bar=document.createElement('div');bar.dataset.lbgCdmUxToolbar='1';bar.className='lbg-cdm-ux-toolbar';
      bar.innerHTML=`
        <label class="search">Tìm nhanh<input type="search" data-lbg-cdm-search placeholder="Tên giáo viên, mã TKB hoặc trường…"></label>
        <label data-lbg-cdm-group-label>Nhóm<select data-lbg-cdm-group><option value="all">Tất cả nhóm</option></select></label>
        <label>Trạng thái<select data-lbg-cdm-status><option value="missing">Cần nhắc</option><option value="all">Tất cả</option><option value="done">Đã hoàn tất</option></select></label>
        <label>Hiển thị<select data-lbg-cdm-size><option value="10">10 GV/trang</option><option value="20">20 GV/trang</option><option value="50">50 GV/trang</option></select></label>
        <div class="lbg-cdm-ux-hint">Mặc định chỉ hiện <b>giáo viên cần nhắc Check-in</b>. Các ô tổng phía trên vẫn luôn tính toàn bộ điểm dạy trong buổi.</div>`;
      const sessions=monitor.querySelector('.lbg-cdm-sessions');sessions?.insertAdjacentElement('beforebegin',bar);
      const search=bar.querySelector('[data-lbg-cdm-search]'),group=bar.querySelector('[data-lbg-cdm-group]'),status=bar.querySelector('[data-lbg-cdm-status]'),size=bar.querySelector('[data-lbg-cdm-size]');
      search.value=state.search;group.value=state.group;status.value=state.status;size.value=String(state.size);
      search.addEventListener('input',()=>{state.search=search.value;state.pages={'Sáng':1,'Chiều':1};queue()});
      group.addEventListener('change',()=>{state.group=group.value;state.pages={'Sáng':1,'Chiều':1};saveState();queue()});
      status.addEventListener('change',()=>{state.status=status.value;state.pages={'Sáng':1,'Chiều':1};saveState();queue()});
      size.addEventListener('change',()=>{state.size=Number(size.value)||10;state.pages={'Sáng':1,'Chiều':1};saveState();queue()});
    }
    const groupLabel=bar.querySelector('[data-lbg-cdm-group-label]');if(groupLabel)groupLabel.hidden=!isOwner();
    const groups=groupOptions(monitor),group=bar.querySelector('[data-lbg-cdm-group]');
    if(group){
      const valid=state.group==='all'||groups.some(g=>fold(g)===fold(state.group));if(!valid)state.group='all';
      const sig=groups.join('|');if(group.dataset.groups!==sig){group.dataset.groups=sig;group.innerHTML='<option value="all">Tất cả nhóm</option>'+groups.map(g=>`<option value="${g.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}">${g.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('')}
      group.value=state.group
    }
    const counts=statusCounts(monitor),status=bar.querySelector('[data-lbg-cdm-status]');if(status){
      status.querySelector('[value="missing"]').textContent=`Cần nhắc (${counts.missing})`;
      status.querySelector('[value="all"]').textContent=`Tất cả (${counts.all})`;
      status.querySelector('[value="done"]').textContent=`Đã hoàn tất (${counts.done})`;
      status.value=state.status
    }
    const search=bar.querySelector('[data-lbg-cdm-search]');if(search&&document.activeElement!==search&&search.value!==state.search)search.value=state.search;
    const size=bar.querySelector('[data-lbg-cdm-size]');if(size)size.value=String(state.size);
    return bar
  }
  function ensurePager(section,key){
    let p=section.querySelector('[data-lbg-cdm-ux-pager]');if(p)return p;
    p=document.createElement('div');p.dataset.lbgCdmUxPager='1';p.className='lbg-cdm-ux-pager';
    p.innerHTML=`<span data-lbg-cdm-range>0 giáo viên</span><span class="lbg-cdm-ux-page-actions"><button type="button" class="btn outline mini" data-prev>‹</button><b data-page>Trang 1/1</b><button type="button" class="btn outline mini" data-next>›</button></span>`;
    const list=section.querySelector('.lbg-cdm-list');list?.insertAdjacentElement('afterend',p);
    p.querySelector('[data-prev]').onclick=()=>{state.pages[key]=Math.max(1,(state.pages[key]||1)-1);saveState();queue()};
    p.querySelector('[data-next]').onclick=()=>{state.pages[key]=(state.pages[key]||1)+1;saveState();queue()};
    return p
  }
  function applySession(section){
    const key=sessionKey(section);if(!key)return;
    const list=section.querySelector('.lbg-cdm-list'),all=cards(section);if(!list||!all.length)return;
    const filtered=all.filter(matches),size=Math.max(1,Number(state.size)||10),pages=Math.max(1,Math.ceil(filtered.length/size));
    let page=Math.max(1,Number(state.pages[key])||1);if(page>pages)page=pages;state.pages[key]=page;
    const start=(page-1)*size,end=start+size,visible=new Set(filtered.slice(start,end));all.forEach(c=>c.hidden=!visible.has(c));
    let empty=section.querySelector('[data-lbg-cdm-ux-empty]');
    if(!filtered.length){if(!empty){empty=document.createElement('div');empty.dataset.lbgCdmUxEmpty='1';empty.className='lbg-cdm-ux-empty';list.insertAdjacentElement('afterend',empty)}empty.textContent=state.status==='missing'?'Không còn giáo viên cần nhắc trong bộ lọc này.':'Không có giáo viên phù hợp với bộ lọc hiện tại.'}
    else empty?.remove();
    const pager=ensurePager(section,key),from=filtered.length?start+1:0,to=Math.min(filtered.length,end);
    pager.querySelector('[data-lbg-cdm-range]').textContent=`${from}–${to}/${filtered.length} giáo viên`;
    pager.querySelector('[data-page]').textContent=`Trang ${page}/${pages}`;
    pager.querySelector('[data-prev]').disabled=page<=1;pager.querySelector('[data-next]').disabled=page>=pages;
    pager.hidden=!filtered.length
  }
  function apply(){
    queued=false;style();const monitor=q('lbgCheckinDailyMonitor');if(!monitor)return;ensureToolbar(monitor);monitor.querySelectorAll('.lbg-cdm-session').forEach(applySession)
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(apply)}
  function start(){style();queue();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('lbg-access-ready',queue);window.addEventListener('focus',queue);window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.LBGCheckinMonitorCompactUxV1={version:VERSION,refresh:queue};
})();
