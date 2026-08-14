'use strict';
(function(){
  const VERSION='20260814.5';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const states={permission:{query:'',status:'all',size:10,page:1},monitorV2:{query:'',group:'all',status:'all',size:10,page:1},monitorFlexible:{query:'',group:'all',status:'all',size:10,page:1}};
  let observer=null,queued=false,groups=[],groupsAt=0;

  function auth(){return window.LBGAuth?.client||null}
  async function loadGroups(force=false){
    if(!force&&groupsAt&&Date.now()-groupsAt<60000)return groups;
    const c=auth();if(!c)return groups;
    try{const{data,error}=await c.rpc('schedule_ack_monitor_groups');if(error)throw error;groups=(data||[]).map(x=>txt(x.group_name)).filter(Boolean);groupsAt=Date.now()}catch{}
    return groups;
  }
  function style(){
    if(q('lbgScheduleAckListUxV3Css'))return;
    const s=document.createElement('style');s.id='lbgScheduleAckListUxV3Css';s.textContent=`
      .lbg-ack-ux-toolbar{display:flex;gap:9px;align-items:end;flex-wrap:wrap;margin:12px 0 10px}.lbg-ack-ux-toolbar .grow{flex:1 1 300px}
      #lbgAppLayout main.shell .lbg-ack-ux-toolbar label{display:grid;gap:5px;font-size:12.5px!important;font-weight:800!important;line-height:1.3!important;color:#674737!important}
      #lbgAppLayout main.shell .lbg-ack-ux-toolbar input,#lbgAppLayout main.shell .lbg-ack-ux-toolbar select,#lbgAppLayout main.shell .lbg-ack-ux-pager select{height:40px!important;min-height:40px!important;padding:7px 11px!important;border:1px solid #ead3c4!important;border-radius:11px!important;background:#fff!important;color:#4b342b!important;font:700 13.5px/1.2 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif!important;box-shadow:none!important}
      #lbgAppLayout main.shell .lbg-ack-ux-toolbar input{width:100%!important;box-sizing:border-box!important}#lbgAppLayout main.shell .lbg-ack-ux-toolbar select{min-width:165px!important}
      .lbg-ack-ux-count{display:inline-flex;align-items:center;min-height:40px;padding:0 12px;border:1px solid #e8ddd6;border-radius:11px;background:#fff;color:#6f4b39;font-size:12.5px;font-weight:800;white-space:nowrap}
      .lbg-ack-ux-help{margin:7px 0 10px;padding:8px 10px;border:1px solid #fde2bc;border-radius:10px;background:#fffaf2;color:#7a563f;font-size:12px;line-height:1.45}
      .lbg-ack-ux-pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #f0e5de;color:#806b61;font-size:12.5px}
      #lbgAppLayout main.shell .lbg-ack-ux-pager label{display:flex;align-items:center;gap:7px;font-size:12.5px!important;font-weight:800!important;color:#6f4b39!important}.lbg-ack-ux-pageinfo{font-weight:800;color:#6f4b39}.lbg-ack-ux-nav{min-width:38px!important;width:38px!important;height:38px!important;padding:0!important;border-radius:10px!important}
      .lbg-ack-ux-no-result{margin:9px 0 0;padding:11px 12px;border:1px dashed #e2d2c8;border-radius:11px;background:#fff;color:#806b61;font-size:12.5px;text-align:center}.lbg-ack-perm-row[hidden],.lbg-ack-table tbody tr[hidden]{display:none!important}
      @media(max-width:720px){.lbg-ack-ux-toolbar{display:grid;grid-template-columns:1fr 1fr}.lbg-ack-ux-toolbar .grow{grid-column:1/-1}.lbg-ack-ux-pager{justify-content:flex-start}}
      @media(max-width:480px){.lbg-ack-ux-toolbar{grid-template-columns:1fr}.lbg-ack-ux-toolbar .grow{grid-column:auto}}
    `;document.head.appendChild(s);
  }
  function clamp(state,total){const pages=Math.max(1,Math.ceil(total/state.size));state.page=Math.min(Math.max(1,state.page),pages);return pages}
  function range(state,total){if(!total)return'0–0/0';return`${(state.page-1)*state.size+1}–${Math.min(total,state.page*state.size)}/${total}`}
  function ensurePager(box,anchor,prefix,state,applyFn){
    let p=box.querySelector(`[data-ack-pager="${prefix}"]`);if(!p){p=document.createElement('div');p.className='lbg-ack-ux-pager';p.dataset.ackPager=prefix;p.innerHTML=`<label>Hiển thị <select data-size><option value="10">10 dòng/trang</option><option value="20">20 dòng/trang</option><option value="50">50 dòng/trang</option></select></label><span data-range></span><button class="btn outline mini lbg-ack-ux-nav" data-prev>‹</button><span class="lbg-ack-ux-pageinfo" data-page></span><button class="btn outline mini lbg-ack-ux-nav" data-next>›</button>`;anchor.insertAdjacentElement('afterend',p);p.querySelector('[data-size]').onchange=e=>{state.size=Number(e.target.value)||10;state.page=1;applyFn()};p.querySelector('[data-prev]').onclick=()=>{state.page=Math.max(1,state.page-1);applyFn()};p.querySelector('[data-next]').onclick=()=>{state.page+=1;applyFn()}}
    return p;
  }
  function updatePager(p,state,total,pages){p.querySelector('[data-size]').value=String(state.size);p.querySelector('[data-range]').textContent=range(state,total);p.querySelector('[data-page]').textContent=`Trang ${state.page}/${pages}`;p.querySelector('[data-prev]').disabled=state.page<=1;p.querySelector('[data-next]').disabled=state.page>=pages}

  function ensurePermission(){
    const box=q('lbgAckPermissionV2'),list=box?.querySelector('.lbg-ack-perm-list');if(!box||!list)return;
    const state=states.permission;let t=box.querySelector('[data-ack-toolbar="permission"]');if(!t){t=document.createElement('div');t.className='lbg-ack-ux-toolbar';t.dataset.ackToolbar='permission';t.innerHTML='<label class="grow">Tìm tài khoản<input data-query placeholder="Tên hoặc tài khoản..."></label><label>Trạng thái<select data-status><option value="all">Tất cả</option><option value="enabled">Đã cấp quyền</option><option value="disabled">Chưa cấp quyền</option></select></label><span class="lbg-ack-ux-count" data-count></span>';list.insertAdjacentElement('beforebegin',t);t.querySelector('[data-query]').oninput=e=>{state.query=e.target.value;state.page=1;applyPermission()};t.querySelector('[data-status]').onchange=e=>{state.status=e.target.value;state.page=1;applyPermission()}}
    t.querySelector('[data-query]').value=state.query;t.querySelector('[data-status]').value=state.status;applyPermission();
  }
  function applyPermission(){
    const box=q('lbgAckPermissionV2'),list=box?.querySelector('.lbg-ack-perm-list');if(!box||!list)return;const state=states.permission,rows=[...list.querySelectorAll('.lbg-ack-perm-row')];
    const enabled=rows.filter(r=>r.querySelector('input[type=checkbox]')?.checked).length,ct=box.querySelector('[data-count]');if(ct)ct.textContent=`Đã cấp: ${enabled}/${rows.length}`;
    const w=fold(state.query),filtered=rows.filter(r=>{const on=Boolean(r.querySelector('input[type=checkbox]')?.checked);if(state.status==='enabled'&&!on)return false;if(state.status==='disabled'&&on)return false;return!w||fold(r.textContent).includes(w)});const pages=clamp(state,filtered.length),start=(state.page-1)*state.size,visible=new Set(filtered.slice(start,start+state.size));rows.forEach(r=>r.hidden=!visible.has(r));
    let empty=box.querySelector('[data-ack-empty="permission"]');if(!filtered.length){if(!empty){empty=document.createElement('div');empty.className='lbg-ack-ux-no-result';empty.dataset.ackEmpty='permission';list.insertAdjacentElement('afterend',empty)}empty.textContent='Không có tài khoản phù hợp bộ lọc.'}else empty?.remove();
    const anchor=box.querySelector('[data-ack-empty="permission"]')||list,p=ensurePager(box,anchor,'permission',state,applyPermission);if(p.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',p);updatePager(p,state,filtered.length,pages);
    rows.forEach(r=>{const cb=r.querySelector('input[type=checkbox]');if(cb&&!cb.dataset.ackUx3){cb.dataset.ackUx3='1';cb.addEventListener('change',()=>setTimeout(applyPermission,250))}});
  }

  function mState(box){return box.id==='lbgAckMonitorFlexible'?states.monitorFlexible:states.monitorV2}function mPrefix(box){return box.id==='lbgAckMonitorFlexible'?'monitorFlexible':'monitorV2'}
  function statusOf(r){if(r.classList.contains('lbg-ack-row-missing'))return'missing';if(r.classList.contains('lbg-ack-row-changed'))return'changed';const s=fold(r.cells?.[3]?.textContent);if(s.includes('CHUA XEM'))return'missing';if(s.includes('LICH DA DOI')||s.includes('CAN XEM LAI'))return'changed';return'seen'}
  function polishMonitor(box){
    [...box.querySelectorAll('.lbg-ack-summary .lbg-checkin-pill')].forEach(s=>{if(/Lịch đổi|Cần xem lại/i.test(s.textContent||'')){const n=(s.textContent||'').match(/\d+/)?.[0]||'0',v=`⚠ Cần xem lại: ${n}`;if(s.textContent!==v)s.textContent=v}});
    box.querySelectorAll('.lbg-ack-table tbody tr').forEach(r=>{if(statusOf(r)==='changed'&&r.cells?.[3]&&r.cells[3].textContent!=='⚠ Cần xem lại')r.cells[3].textContent='⚠ Cần xem lại'});
    if(!box.querySelector('.lbg-ack-ux-help')){const h=document.createElement('div');h.className='lbg-ack-ux-help';h.textContent='“Cần xem lại” = giáo viên đã xác nhận trước đó nhưng lịch hiện tại trong TKB chung đã thay đổi ở buổi, trường, lớp hoặc tiết. Giáo viên cần xem và xác nhận lại.';box.querySelector('.lbg-ack-summary')?.insertAdjacentElement('afterend',h)}
  }
  function ensureMonitor(box){
    const wrap=box.querySelector('.lbg-ack-table-wrap'),tbody=wrap?.querySelector('.lbg-ack-table')?.tBodies?.[0];if(!wrap||!tbody)return;polishMonitor(box);const state=mState(box),prefix=mPrefix(box),rows=[...tbody.rows].filter(r=>!r.querySelector('td[colspan]'));
    const allGroups=[...new Set([...groups,...rows.map(r=>txt(r.cells?.[1]?.textContent)).filter(x=>x&&x!=='—')])].sort((a,b)=>a.localeCompare(b,'vi'));if(state.group!=='all'&&!allGroups.includes(state.group))state.group='all';
    let t=box.querySelector(`[data-ack-toolbar="${prefix}"]`),gkey=JSON.stringify(allGroups);if(!t){t=document.createElement('div');t.className='lbg-ack-ux-toolbar';t.dataset.ackToolbar=prefix;(box.querySelector('.lbg-ack-ux-help')||box.querySelector('.lbg-ack-summary')||wrap).insertAdjacentElement('afterend',t)}
    if(t.dataset.gkey!==gkey){t.dataset.gkey=gkey;t.innerHTML=`<label class="grow">Tìm giáo viên<input data-query placeholder="Tên, mã GV hoặc trường..."></label><label>Nhóm<select data-group><option value="all">Tất cả nhóm</option>${allGroups.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('')}</select></label><label>Trạng thái<select data-status><option value="all">Tất cả</option><option value="missing">Chưa xem</option><option value="changed">Cần xem lại</option><option value="seen">Đã xem</option></select></label>`;t.querySelector('[data-query]').oninput=e=>{state.query=e.target.value;state.page=1;applyMonitor(box)};t.querySelector('[data-group]').onchange=e=>{state.group=e.target.value;state.page=1;applyMonitor(box)};t.querySelector('[data-status]').onchange=e=>{state.status=e.target.value;state.page=1;applyMonitor(box)}}
    t.querySelector('[data-query]').value=state.query;t.querySelector('[data-group]').value=state.group;t.querySelector('[data-status]').value=state.status;applyMonitor(box);
  }
  function applyMonitor(box){
    const wrap=box?.querySelector('.lbg-ack-table-wrap'),tbody=wrap?.querySelector('.lbg-ack-table')?.tBodies?.[0];if(!wrap||!tbody)return;const state=mState(box),prefix=mPrefix(box),rows=[...tbody.rows].filter(r=>!r.querySelector('td[colspan]')),w=fold(state.query);
    const filtered=rows.filter(r=>{if(state.status!=='all'&&statusOf(r)!==state.status)return false;if(state.group!=='all'&&txt(r.cells?.[1]?.textContent)!==state.group)return false;return!w||fold(r.textContent).includes(w)}),pages=clamp(state,filtered.length),start=(state.page-1)*state.size,visible=new Set(filtered.slice(start,start+state.size));rows.forEach(r=>r.hidden=!visible.has(r));
    let empty=box.querySelector(`[data-ack-empty="${prefix}"]`);if(!filtered.length){if(!empty){empty=document.createElement('div');empty.className='lbg-ack-ux-no-result';empty.dataset.ackEmpty=prefix;wrap.insertAdjacentElement('afterend',empty)}empty.textContent=state.group!=='all'?`Nhóm ${state.group} hiện không có giáo viên có lịch ngày mai hoặc không có kết quả phù hợp bộ lọc.`:'Không có giáo viên phù hợp bộ lọc.'}else empty?.remove();
    const anchor=box.querySelector(`[data-ack-empty="${prefix}"]`)||wrap,p=ensurePager(box,anchor,prefix,state,()=>applyMonitor(box));if(p.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',p);updatePager(p,state,filtered.length,pages);
  }

  function observe(){if(!observer)observer=new MutationObserver(()=>queue(false));observer.observe(document.body,{childList:true,subtree:true})}
  async function apply(forceGroups=false){await loadGroups(forceGroups);observer?.disconnect();try{style();ensurePermission();const a=q('lbgAckMonitorV2');if(a)ensureMonitor(a);const b=q('lbgAckMonitorFlexible');if(b)ensureMonitor(b)}finally{observe()}}
  function queue(force=false){if(force)groupsAt=0;if(queued)return;queued=true;setTimeout(()=>{queued=false;apply(force).catch(console.error)},120)}
  function start(){style();queue(true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();document.addEventListener('lbg-access-ready',()=>queue(true));window.addEventListener('focus',()=>queue(true));window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true});
  window.LBGScheduleAckListUxV3={version:VERSION,refresh:()=>queue(true)};
})();
