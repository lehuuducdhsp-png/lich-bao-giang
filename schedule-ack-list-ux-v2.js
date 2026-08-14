'use strict';
(function(){
  const VERSION='20260814.4';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const states={
    permission:{query:'',status:'all',size:10,page:1},
    monitorV2:{query:'',group:'all',status:'all',size:10,page:1},
    monitorFlexible:{query:'',group:'all',status:'all',size:10,page:1}
  };
  let observer=null,queued=false,groupCache={rows:[],at:0,loading:false};

  function auth(){return window.LBGAuth?.client||null}
  async function loadGroups(force=false){
    const now=Date.now();
    if(!force&&groupCache.rows.length&&now-groupCache.at<60000)return groupCache.rows;
    if(groupCache.loading)return groupCache.rows;
    const c=auth();if(!c)return groupCache.rows;
    groupCache.loading=true;
    try{
      const{data,error}=await c.rpc('schedule_ack_monitor_groups');
      if(error)throw error;
      groupCache.rows=(data||[]).map(x=>({id:x.group_id,name:txt(x.group_name)})).filter(x=>x.name);
      groupCache.at=Date.now();
    }catch{}
    finally{groupCache.loading=false}
    return groupCache.rows;
  }

  function style(){
    if(q('lbgScheduleAckListUxV2Css'))return;
    const s=document.createElement('style');s.id='lbgScheduleAckListUxV2Css';s.textContent=`
      .lbg-ack-ux-toolbar{display:flex;gap:9px;align-items:end;flex-wrap:wrap;margin:12px 0 10px}
      #lbgAppLayout main.shell .lbg-ack-ux-toolbar label{display:grid;gap:5px;font-size:12.5px!important;font-weight:800!important;line-height:1.3!important;color:#674737!important;letter-spacing:0!important}
      .lbg-ack-ux-toolbar .grow{flex:1 1 300px}
      #lbgAppLayout main.shell .lbg-ack-ux-toolbar input,#lbgAppLayout main.shell .lbg-ack-ux-toolbar select,#lbgAppLayout main.shell .lbg-ack-ux-pager select{min-height:40px!important;height:40px!important;padding:7px 11px!important;border:1px solid #ead3c4!important;border-radius:11px!important;background:#fff!important;color:#4b342b!important;font:700 13.5px/1.2 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif!important;box-shadow:none!important}
      #lbgAppLayout main.shell .lbg-ack-ux-toolbar select{min-width:165px!important}
      #lbgAppLayout main.shell .lbg-ack-ux-toolbar input{width:100%!important;box-sizing:border-box!important}
      .lbg-ack-ux-count{display:inline-flex;align-items:center;min-height:40px;padding:0 12px;border:1px solid #e8ddd6;border-radius:11px;background:#fff;color:#6f4b39;font-size:12.5px;font-weight:800;white-space:nowrap}
      .lbg-ack-ux-help{margin:7px 0 10px;padding:8px 10px;border:1px solid #fde2bc;border-radius:10px;background:#fffaf2;color:#7a563f;font-size:12px;line-height:1.45}
      .lbg-ack-ux-pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #f0e5de;color:#806b61;font-size:12.5px}
      #lbgAppLayout main.shell .lbg-ack-ux-pager label{display:flex;align-items:center;gap:7px;font-size:12.5px!important;font-weight:800!important;color:#6f4b39!important}
      .lbg-ack-ux-pageinfo{font-weight:800;color:#6f4b39;white-space:nowrap}.lbg-ack-ux-range{white-space:nowrap}
      .lbg-ack-ux-nav{min-width:38px!important;width:38px!important;height:38px!important;padding:0!important;border-radius:10px!important}
      .lbg-ack-ux-no-result{margin:9px 0 0;padding:11px 12px;border:1px dashed #e2d2c8;border-radius:11px;background:#fff;color:#806b61;font-size:12.5px;text-align:center}
      .lbg-ack-perm-row[hidden],.lbg-ack-table tbody tr[hidden]{display:none!important}
      @media(max-width:720px){.lbg-ack-ux-toolbar{display:grid;grid-template-columns:1fr 1fr}.lbg-ack-ux-toolbar .grow{grid-column:1/-1}.lbg-ack-ux-toolbar label{min-width:0}.lbg-ack-ux-pager{justify-content:flex-start}.lbg-ack-ux-count{justify-content:center}}
      @media(max-width:480px){.lbg-ack-ux-toolbar{grid-template-columns:1fr}.lbg-ack-ux-toolbar .grow{grid-column:auto}.lbg-ack-ux-pager{display:grid;grid-template-columns:1fr auto auto}.lbg-ack-ux-pager label{grid-column:1/-1}.lbg-ack-ux-range{align-self:center}.lbg-ack-ux-pageinfo{grid-column:1/-1;text-align:center}}
    `;document.head.appendChild(s);
  }

  function clampPage(state,total){const pages=Math.max(1,Math.ceil(total/state.size));state.page=Math.min(Math.max(1,state.page),pages);return pages}
  function rangeText(page,size,total){if(!total)return'0–0/0';const start=(page-1)*size+1,end=Math.min(total,page*size);return`${start}–${end}/${total}`}
  function pagerHtml(prefix,state,total,pages){return`<div class="lbg-ack-ux-pager" data-ack-ux-pager="${prefix}"><label>Hiển thị <select data-ack-ux-size="${prefix}"><option value="10" ${state.size===10?'selected':''}>10 dòng/trang</option><option value="20" ${state.size===20?'selected':''}>20 dòng/trang</option><option value="50" ${state.size===50?'selected':''}>50 dòng/trang</option></select></label><span class="lbg-ack-ux-range">${rangeText(state.page,state.size,total)}</span><button class="btn outline mini lbg-ack-ux-nav" data-ack-ux-prev="${prefix}" ${state.page<=1?'disabled':''}>‹</button><span class="lbg-ack-ux-pageinfo">Trang ${state.page}/${pages}</span><button class="btn outline mini lbg-ack-ux-nav" data-ack-ux-next="${prefix}" ${state.page>=pages?'disabled':''}>›</button></div>`}
  function updatePager(host,anchor,prefix,state,total,pages,applyFn){
    const key=JSON.stringify([state.page,state.size,total,pages]);let pager=host.querySelector(`[data-ack-ux-pager="${prefix}"]`);
    if(!pager||pager.dataset.key!==key){pager?.remove();anchor.insertAdjacentHTML('afterend',pagerHtml(prefix,state,total,pages));pager=host.querySelector(`[data-ack-ux-pager="${prefix}"]`);if(pager)pager.dataset.key=key}
    const size=host.querySelector(`[data-ack-ux-size="${prefix}"]`),prev=host.querySelector(`[data-ack-ux-prev="${prefix}"]`),next=host.querySelector(`[data-ack-ux-next="${prefix}"]`);
    if(size)size.onchange=()=>{state.size=Number(size.value)||10;state.page=1;applyFn()};
    if(prev)prev.onclick=()=>{state.page=Math.max(1,state.page-1);applyFn()};
    if(next)next.onclick=()=>{state.page+=1;applyFn()};
  }

  function enhancePermission(){
    const box=q('lbgAckPermissionV2'),list=box?.querySelector('.lbg-ack-perm-list');if(!box||!list)return;
    const state=states.permission;let toolbar=box.querySelector('[data-ack-ux-toolbar="permission"]');
    if(!toolbar){toolbar=document.createElement('div');toolbar.className='lbg-ack-ux-toolbar';toolbar.dataset.ackUxToolbar='permission';toolbar.innerHTML=`<label class="grow">Tìm tài khoản<input data-ack-ux-query="permission" placeholder="Tên hoặc tài khoản..."></label><label>Trạng thái<select data-ack-ux-status="permission"><option value="all">Tất cả</option><option value="enabled">Đã cấp quyền</option><option value="disabled">Chưa cấp quyền</option></select></label><span class="lbg-ack-ux-count" data-ack-ux-count="permission"></span>`;list.insertAdjacentElement('beforebegin',toolbar);const input=toolbar.querySelector('[data-ack-ux-query="permission"]'),status=toolbar.querySelector('[data-ack-ux-status="permission"]');input.value=state.query;status.value=state.status;input.oninput=()=>{state.query=input.value;state.page=1;applyPermission()};status.onchange=()=>{state.status=status.value;state.page=1;applyPermission()}}
    applyPermission();
  }
  function applyPermission(){
    const box=q('lbgAckPermissionV2'),list=box?.querySelector('.lbg-ack-perm-list');if(!box||!list)return;
    const state=states.permission,rows=[...list.querySelectorAll('.lbg-ack-perm-row')],enabledTotal=rows.filter(r=>r.querySelector('input[type="checkbox"]')?.checked).length;
    const count=box.querySelector('[data-ack-ux-count="permission"]');if(count)count.textContent=`Đã cấp: ${enabledTotal}/${rows.length}`;
    const wanted=fold(state.query),filtered=rows.filter(row=>{const enabled=Boolean(row.querySelector('input[type="checkbox"]')?.checked);if(state.status==='enabled'&&!enabled)return false;if(state.status==='disabled'&&enabled)return false;return!wanted||fold(row.textContent).includes(wanted)});
    const pages=clampPage(state,filtered.length),start=(state.page-1)*state.size,visible=new Set(filtered.slice(start,start+state.size));rows.forEach(r=>r.hidden=!visible.has(r));
    const oldEmpty=box.querySelector('[data-ack-ux-noresult="permission"]');oldEmpty?.remove();if(!filtered.length)list.insertAdjacentHTML('afterend','<div class="lbg-ack-ux-no-result" data-ack-ux-noresult="permission">Không có tài khoản phù hợp bộ lọc.</div>');
    const anchor=box.querySelector('[data-ack-ux-noresult="permission"]')||list;updatePager(box,anchor,'permission',state,filtered.length,pages,applyPermission);
    rows.forEach(row=>{const cb=row.querySelector('input[type="checkbox"]');if(cb&&!cb.dataset.ackUxV2){cb.dataset.ackUxV2='1';cb.addEventListener('change',()=>setTimeout(applyPermission,250))}});
  }

  function monitorState(box){return box.id==='lbgAckMonitorFlexible'?states.monitorFlexible:states.monitorV2}
  function monitorPrefix(box){return box.id==='lbgAckMonitorFlexible'?'monitorFlexible':'monitorV2'}
  function rowStatus(row){if(row.classList.contains('lbg-ack-row-missing'))return'missing';if(row.classList.contains('lbg-ack-row-changed'))return'changed';const s=fold(row.cells?.[3]?.textContent);if(s.includes('CHUA XEM'))return'missing';if(s.includes('LICH DA DOI')||s.includes('CAN XEM LAI'))return'changed';return'seen'}
  function polishStatus(box){
    const spans=[...box.querySelectorAll('.lbg-ack-summary .lbg-checkin-pill')];for(const span of spans){if(/Lịch đổi|Cần xem lại/i.test(span.textContent||'')){const n=(span.textContent||'').match(/\d+/)?.[0]||'0';span.textContent=`⚠ Cần xem lại: ${n}`}}
    box.querySelectorAll('.lbg-ack-table tbody tr').forEach(row=>{if(rowStatus(row)==='changed'&&row.cells?.[3])row.cells[3].textContent='⚠ Cần xem lại'});
    let help=box.querySelector('.lbg-ack-ux-help');if(!help){help=document.createElement('div');help.className='lbg-ack-ux-help';help.textContent='“Cần xem lại” nghĩa là giáo viên đã xác nhận lịch trước đó, nhưng lịch hiện tại trong TKB chung đã thay đổi ở buổi, trường, lớp hoặc tiết; giáo viên cần mở lại lịch và xác nhận lại.';const summary=box.querySelector('.lbg-ack-summary');summary?.insertAdjacentElement('afterend',help)}
  }

  async function enhanceMonitor(box){
    const wrap=box.querySelector('.lbg-ack-table-wrap'),tbody=wrap?.querySelector('.lbg-ack-table')?.tBodies?.[0];if(!wrap||!tbody)return;
    polishStatus(box);
    const state=monitorState(box),prefix=monitorPrefix(box),dataRows=[...tbody.rows].filter(r=>!r.querySelector('td[colspan]'));
    const remote=(await loadGroups(false)).map(x=>x.name),fromRows=dataRows.map(r=>txt(r.cells?.[1]?.textContent)).filter(x=>x&&x!=='—'),groups=[...new Set([...remote,...fromRows])].sort((a,b)=>a.localeCompare(b,'vi'));
    if(state.group!=='all'&&!groups.includes(state.group))state.group='all';
    let toolbar=box.querySelector(`[data-ack-ux-toolbar="${prefix}"]`),toolbarKey=JSON.stringify(groups);
    if(!toolbar){toolbar=document.createElement('div');toolbar.className='lbg-ack-ux-toolbar';toolbar.dataset.ackUxToolbar=prefix;const help=box.querySelector('.lbg-ack-ux-help'),summary=box.querySelector('.lbg-ack-summary');(help||summary||wrap).insertAdjacentElement((help||summary)?'afterend':'beforebegin',toolbar)}
    if(toolbar.dataset.optionsKey!==toolbarKey){toolbar.dataset.optionsKey=toolbarKey;toolbar.innerHTML=`<label class="grow">Tìm giáo viên<input data-ack-ux-query="${prefix}" placeholder="Tên, mã GV hoặc trường..."></label><label>Nhóm<select data-ack-ux-group="${prefix}"><option value="all">Tất cả nhóm</option>${groups.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('')}</select></label><label>Trạng thái<select data-ack-ux-status="${prefix}"><option value="all">Tất cả</option><option value="missing">Chưa xem</option><option value="changed">Cần xem lại</option><option value="seen">Đã xem</option></select></label>`}
    const input=toolbar.querySelector(`[data-ack-ux-query="${prefix}"]`),group=toolbar.querySelector(`[data-ack-ux-group="${prefix}"]`),status=toolbar.querySelector(`[data-ack-ux-status="${prefix}"]`);
    if(input){input.value=state.query;input.oninput=()=>{state.query=input.value;state.page=1;applyMonitor(box)}}
    if(group){group.value=state.group;group.onchange=()=>{state.group=group.value;state.page=1;applyMonitor(box)}}
    if(status){status.value=state.status;status.onchange=()=>{state.status=status.value;state.page=1;applyMonitor(box)}}
    applyMonitor(box);
  }

  function applyMonitor(box){
    const wrap=box?.querySelector('.lbg-ack-table-wrap'),tbody=wrap?.querySelector('.lbg-ack-table')?.tBodies?.[0];if(!box||!wrap||!tbody)return;
    const state=monitorState(box),prefix=monitorPrefix(box),rows=[...tbody.rows].filter(r=>!r.querySelector('td[colspan]')),wanted=fold(state.query);
    const filtered=rows.filter(row=>{if(state.status!=='all'&&rowStatus(row)!==state.status)return false;const group=txt(row.cells?.[1]?.textContent);if(state.group!=='all'&&group!==state.group)return false;return!wanted||fold(row.textContent).includes(wanted)});
    const pages=clampPage(state,filtered.length),start=(state.page-1)*state.size,visible=new Set(filtered.slice(start,start+state.size));rows.forEach(r=>r.hidden=!visible.has(r));
    box.querySelector(`[data-ack-ux-noresult="${prefix}"]`)?.remove();if(!filtered.length){const msg=state.group!=='all'?`Nhóm ${esc(state.group)} không có giáo viên phù hợp bộ lọc hoặc không có lịch ngày mai.`:'Không có giáo viên phù hợp bộ lọc.';wrap.insertAdjacentHTML('afterend',`<div class="lbg-ack-ux-no-result" data-ack-ux-noresult="${prefix}">${msg}</div>`)}
    const anchor=box.querySelector(`[data-ack-ux-noresult="${prefix}"]`)||wrap;updatePager(box,anchor,prefix,state,filtered.length,pages,()=>applyMonitor(box));
  }

  async function apply(){style();enhancePermission();const main=q('lbgAckMonitorV2');if(main)await enhanceMonitor(main);const flex=q('lbgAckMonitorFlexible');if(flex)await enhanceMonitor(flex)}
  function queue(forceGroups=false){if(forceGroups)groupCache.at=0;if(queued)return;queued=true;setTimeout(()=>{queued=false;apply().catch(console.error)},120)}
  function start(){style();queue(true);observer=new MutationObserver(()=>queue(false));observer.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',()=>queue(true));window.addEventListener('focus',()=>queue(true));window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true});
  window.LBGScheduleAckListUxV2={version:VERSION,refresh:()=>queue(true)};
})();
