'use strict';
(function(){
  const VERSION='20260814.2';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  const states={
    permission:{query:'',status:'all',size:10,page:1},
    monitorV2:{query:'',group:'all',status:'all',size:10,page:1},
    monitorFlexible:{query:'',group:'all',status:'all',size:10,page:1}
  };
  let observer=null,queued=false;

  function style(){
    if(q('lbgScheduleAckListUxCss'))return;
    const s=document.createElement('style');
    s.id='lbgScheduleAckListUxCss';
    s.textContent=`
      .lbg-ack-ux-toolbar{display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:10px 0}
      .lbg-ack-ux-toolbar label{display:grid;gap:5px;font-size:12px;font-weight:800;color:#6f4b39}
      .lbg-ack-ux-toolbar .grow{flex:1 1 260px}
      .lbg-ack-ux-toolbar input,.lbg-ack-ux-toolbar select,.lbg-ack-ux-pager select{min-height:38px;padding:8px 10px;border:1px solid #ead3c4;border-radius:10px;background:#fff;color:#4b342b;font:inherit}
      .lbg-ack-ux-toolbar input{width:100%;box-sizing:border-box}
      .lbg-ack-ux-count{display:inline-flex;align-items:center;min-height:38px;padding:0 11px;border:1px solid #e8ddd6;border-radius:10px;background:#fff;color:#6f4b39;font-size:12px;font-weight:800}
      .lbg-ack-ux-pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #f0e5de;color:#806b61;font-size:12px}
      .lbg-ack-ux-pager label{display:flex;align-items:center;gap:6px;font-weight:800;color:#6f4b39}
      .lbg-ack-ux-pageinfo{font-weight:800;color:#6f4b39;white-space:nowrap}
      .lbg-ack-ux-range{white-space:nowrap}
      .lbg-ack-ux-nav{min-width:38px!important;width:38px!important;height:38px!important;padding:0!important;border-radius:10px!important}
      .lbg-ack-ux-no-result{margin:9px 0 0;padding:10px 12px;border:1px dashed #e2d2c8;border-radius:11px;background:#fff;color:#806b61;font-size:12px;text-align:center}
      .lbg-ack-perm-row[hidden],.lbg-ack-table tbody tr[hidden]{display:none!important}
      @media(max-width:720px){.lbg-ack-ux-toolbar{display:grid;grid-template-columns:1fr 1fr}.lbg-ack-ux-toolbar .grow{grid-column:1/-1}.lbg-ack-ux-toolbar label{min-width:0}.lbg-ack-ux-pager{justify-content:flex-start}.lbg-ack-ux-count{justify-content:center}}
      @media(max-width:480px){.lbg-ack-ux-toolbar{grid-template-columns:1fr}.lbg-ack-ux-toolbar .grow{grid-column:auto}.lbg-ack-ux-pager{display:grid;grid-template-columns:1fr auto auto}.lbg-ack-ux-pager label{grid-column:1/-1}.lbg-ack-ux-range{align-self:center}.lbg-ack-ux-pageinfo{grid-column:1/-1;text-align:center}}
    `;
    document.head.appendChild(s);
  }

  function clampPage(state,total){const pages=Math.max(1,Math.ceil(total/state.size));state.page=Math.min(Math.max(1,state.page),pages);return pages}
  function rangeText(page,size,total){if(!total)return'0–0/0';const start=(page-1)*size+1,end=Math.min(total,page*size);return`${start}–${end}/${total}`}
  function pagerHtml(prefix,state,total,pages){return `<div class="lbg-ack-ux-pager" data-ack-ux-pager="${prefix}"><label>Hiển thị<select data-ack-ux-size="${prefix}"><option value="10" ${state.size===10?'selected':''}>10 dòng/trang</option><option value="20" ${state.size===20?'selected':''}>20 dòng/trang</option><option value="50" ${state.size===50?'selected':''}>50 dòng/trang</option></select></label><span class="lbg-ack-ux-range">${rangeText(state.page,state.size,total)}</span><button class="btn outline mini lbg-ack-ux-nav" data-ack-ux-prev="${prefix}" ${state.page<=1?'disabled':''}>‹</button><span class="lbg-ack-ux-pageinfo">Trang ${state.page}/${pages}</span><button class="btn outline mini lbg-ack-ux-nav" data-ack-ux-next="${prefix}" ${state.page>=pages?'disabled':''}>›</button></div>`}
  function wirePager(host,prefix,state,applyFn){const size=host.querySelector(`[data-ack-ux-size="${prefix}"]`),prev=host.querySelector(`[data-ack-ux-prev="${prefix}"]`),next=host.querySelector(`[data-ack-ux-next="${prefix}"]`);if(size)size.onchange=()=>{state.size=Number(size.value)||10;state.page=1;applyFn()};if(prev)prev.onclick=()=>{state.page=Math.max(1,state.page-1);applyFn()};if(next)next.onclick=()=>{state.page+=1;applyFn()}}

  function enhancePermission(){
    const box=q('lbgAckPermissionV2'),list=box?.querySelector('.lbg-ack-perm-list');if(!box||!list||box.querySelector('[data-ack-ux-toolbar="permission"]'))return;
    const state=states.permission,toolbar=document.createElement('div');toolbar.className='lbg-ack-ux-toolbar';toolbar.dataset.ackUxToolbar='permission';
    toolbar.innerHTML=`<label class="grow">Tìm tài khoản<input data-ack-ux-query="permission" placeholder="Tên hoặc tài khoản..."></label><label>Trạng thái<select data-ack-ux-status="permission"><option value="all">Tất cả</option><option value="enabled">Đã cấp quyền</option><option value="disabled">Chưa cấp quyền</option></select></label><span class="lbg-ack-ux-count" data-ack-ux-count="permission"></span>`;
    list.insertAdjacentElement('beforebegin',toolbar);
    const input=toolbar.querySelector('[data-ack-ux-query="permission"]'),status=toolbar.querySelector('[data-ack-ux-status="permission"]');input.value=state.query;status.value=state.status;
    input.oninput=()=>{state.query=input.value;state.page=1;applyPermission()};status.onchange=()=>{state.status=status.value;state.page=1;applyPermission()};
    applyPermission();
  }

  function applyPermission(){
    const box=q('lbgAckPermissionV2'),list=box?.querySelector('.lbg-ack-perm-list');if(!box||!list)return;
    const state=states.permission,rows=[...list.querySelectorAll('.lbg-ack-perm-row')],enabledTotal=rows.filter(r=>r.querySelector('input[type="checkbox"]')?.checked).length;
    const count=box.querySelector('[data-ack-ux-count="permission"]');if(count)count.textContent=`Đã cấp: ${enabledTotal}/${rows.length}`;
    const wanted=fold(state.query),filtered=rows.filter(row=>{const enabled=Boolean(row.querySelector('input[type="checkbox"]')?.checked);if(state.status==='enabled'&&!enabled)return false;if(state.status==='disabled'&&enabled)return false;if(wanted&&!fold(row.textContent).includes(wanted))return false;return true});
    const pages=clampPage(state,filtered.length),start=(state.page-1)*state.size,visible=new Set(filtered.slice(start,start+state.size));rows.forEach(r=>r.hidden=!visible.has(r));
    box.querySelector('[data-ack-ux-pager="permission"]')?.remove();box.querySelector('[data-ack-ux-noresult="permission"]')?.remove();
    list.insertAdjacentHTML('afterend',pagerHtml('permission',state,filtered.length,pages));if(!filtered.length)list.insertAdjacentHTML('afterend','<div class="lbg-ack-ux-no-result" data-ack-ux-noresult="permission">Không có tài khoản phù hợp bộ lọc.</div>');
    wirePager(box,'permission',state,applyPermission);
    rows.forEach(row=>{const cb=row.querySelector('input[type="checkbox"]');if(cb&&!cb.dataset.ackUxBound){cb.dataset.ackUxBound='1';cb.addEventListener('change',()=>setTimeout(applyPermission,250))}});
  }

  function monitorState(box){return box.id==='lbgAckMonitorFlexible'?states.monitorFlexible:states.monitorV2}
  function monitorPrefix(box){return box.id==='lbgAckMonitorFlexible'?'monitorFlexible':'monitorV2'}
  function rowStatus(row){if(row.classList.contains('lbg-ack-row-missing'))return'missing';if(row.classList.contains('lbg-ack-row-changed'))return'changed';const text=fold(row.cells?.[3]?.textContent);if(text.includes('CHUA XEM'))return'missing';if(text.includes('LICH DA DOI'))return'changed';return'seen'}
  function htmlAttr(v){return String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

  function enhanceMonitor(box){
    if(!box||box.querySelector('[data-ack-ux-toolbar]'))return;
    const wrap=box.querySelector('.lbg-ack-table-wrap'),table=wrap?.querySelector('.lbg-ack-table'),tbody=table?.tBodies?.[0];if(!wrap||!table||!tbody)return;
    const state=monitorState(box),prefix=monitorPrefix(box),dataRows=[...tbody.rows].filter(r=>!r.querySelector('td[colspan]'));
    const groups=[...new Set(dataRows.map(r=>txt(r.cells?.[1]?.textContent)).filter(x=>x&&x!=='—'))].sort((a,b)=>a.localeCompare(b,'vi'));if(state.group!=='all'&&!groups.includes(state.group))state.group='all';
    const toolbar=document.createElement('div');toolbar.className='lbg-ack-ux-toolbar';toolbar.dataset.ackUxToolbar=prefix;
    toolbar.innerHTML=`<label class="grow">Tìm giáo viên<input data-ack-ux-query="${prefix}" placeholder="Tên, mã GV hoặc trường..."></label><label>Nhóm<select data-ack-ux-group="${prefix}"><option value="all">Tất cả nhóm</option>${groups.map(g=>`<option value="${htmlAttr(g)}">${htmlAttr(g)}</option>`).join('')}</select></label><label>Trạng thái<select data-ack-ux-status="${prefix}"><option value="all">Tất cả</option><option value="missing">Chưa xem</option><option value="changed">Lịch đã đổi</option><option value="seen">Đã xem</option></select></label>`;
    const summary=box.querySelector('.lbg-ack-summary');(summary||wrap).insertAdjacentElement(summary?'afterend':'beforebegin',toolbar);
    const input=toolbar.querySelector(`[data-ack-ux-query="${prefix}"]`),group=toolbar.querySelector(`[data-ack-ux-group="${prefix}"]`),status=toolbar.querySelector(`[data-ack-ux-status="${prefix}"]`);input.value=state.query;group.value=state.group;status.value=state.status;
    input.oninput=()=>{state.query=input.value;state.page=1;applyMonitor(box)};group.onchange=()=>{state.group=group.value;state.page=1;applyMonitor(box)};status.onchange=()=>{state.status=status.value;state.page=1;applyMonitor(box)};
    applyMonitor(box);
  }

  function applyMonitor(box){
    const wrap=box?.querySelector('.lbg-ack-table-wrap'),tbody=wrap?.querySelector('.lbg-ack-table')?.tBodies?.[0];if(!box||!wrap||!tbody)return;
    const state=monitorState(box),prefix=monitorPrefix(box),rows=[...tbody.rows].filter(r=>!r.querySelector('td[colspan]')),wanted=fold(state.query);
    const filtered=rows.filter(row=>{if(state.status!=='all'&&rowStatus(row)!==state.status)return false;const group=txt(row.cells?.[1]?.textContent);if(state.group!=='all'&&group!==state.group)return false;if(wanted&&!fold(row.textContent).includes(wanted))return false;return true});
    const pages=clampPage(state,filtered.length),start=(state.page-1)*state.size,visible=new Set(filtered.slice(start,start+state.size));rows.forEach(r=>r.hidden=!visible.has(r));
    box.querySelector(`[data-ack-ux-pager="${prefix}"]`)?.remove();box.querySelector(`[data-ack-ux-noresult="${prefix}"]`)?.remove();
    wrap.insertAdjacentHTML('afterend',pagerHtml(prefix,state,filtered.length,pages));if(!filtered.length)wrap.insertAdjacentHTML('afterend',`<div class="lbg-ack-ux-no-result" data-ack-ux-noresult="${prefix}">Không có giáo viên phù hợp bộ lọc.</div>`);
    wirePager(box,prefix,state,()=>applyMonitor(box));
  }

  function apply(){
    style();
    const permission=q('lbgAckPermissionV2');if(permission&&!permission.querySelector('[data-ack-ux-toolbar="permission"]'))enhancePermission();
    const main=q('lbgAckMonitorV2');if(main&&!main.querySelector('[data-ack-ux-toolbar]'))enhanceMonitor(main);
    const flexible=q('lbgAckMonitorFlexible');if(flexible&&!flexible.querySelector('[data-ack-ux-toolbar]'))enhanceMonitor(flexible);
  }
  function queue(){if(queued)return;queued=true;setTimeout(()=>{queued=false;apply()},100)}
  function start(){style();queue();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();document.addEventListener('lbg-access-ready',queue);window.addEventListener('focus',queue);window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true});
  window.LBGScheduleAckListUxV1={version:VERSION,refresh:queue};
})();