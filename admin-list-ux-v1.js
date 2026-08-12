'use strict';
(function(){
  const VERSION='20260812.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toLowerCase();
  let observer=null,queued=false;

  function style(){
    if(q('lbgAdminListUxCss'))return;
    const s=document.createElement('style');s.id='lbgAdminListUxCss';s.textContent=`
      .lbg-list-ux-toolbar{display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:10px 0 12px;padding:10px 11px;border:1px solid #eadfd8;border-radius:12px;background:#fffaf6}
      .lbg-list-ux-toolbar label{display:grid;gap:4px;font-size:12px;font-weight:800;color:#6f4b39;min-width:160px}
      .lbg-list-ux-toolbar input,.lbg-list-ux-toolbar select{min-height:40px;padding:8px 10px;border:1px solid #e3cfc2;border-radius:10px;background:#fff;color:#4b342b;font:inherit}
      .lbg-list-ux-search{flex:1;min-width:230px}.lbg-list-ux-search input{width:100%}
      .lbg-list-ux-meta{margin-left:auto;display:flex;gap:7px;align-items:center;flex-wrap:wrap;color:#806b61;font-size:12.5px}
      .lbg-list-ux-page{display:inline-flex;align-items:center;gap:6px}.lbg-list-ux-page button{min-width:38px}
      .lbg-list-ux-hint{margin:-4px 0 10px;color:#806b61;font-size:12px;line-height:1.5}
      @media(max-width:760px){.lbg-list-ux-toolbar{display:grid}.lbg-list-ux-toolbar label,.lbg-list-ux-search{min-width:0}.lbg-list-ux-meta{margin-left:0;justify-content:space-between}}
    `;document.head.appendChild(s)
  }

  function rowSearchText(row){
    const values=[...row.querySelectorAll('input,select,textarea')].map(x=>x.value||'').join(' ');
    return norm(`${row.textContent||''} ${values}`)
  }
  function rowName(row){return norm(row.cells?.[0]?.querySelector('b,strong')?.textContent||row.cells?.[0]?.textContent||'')}
  function setOrder(tbody,ordered){
    const current=[...tbody.children];
    if(current.length!==ordered.length||current.some((x,i)=>x!==ordered[i]))ordered.forEach(x=>tbody.appendChild(x))
  }
  function clampPage(section,max){
    let p=Math.max(1,Number(section.dataset.lbgListPage)||1);p=Math.min(p,Math.max(1,max));section.dataset.lbgListPage=String(p);return p
  }
  function updatePager(toolbar,section,total,pageSize){
    const pages=Math.max(1,Math.ceil(total/pageSize)),page=clampPage(section,pages),from=total?((page-1)*pageSize+1):0,to=Math.min(total,page*pageSize);
    const info=toolbar.querySelector('[data-lbg-list-info]');if(info)info.textContent=`${from}–${to}/${total}`;
    const label=toolbar.querySelector('[data-lbg-list-page-label]');if(label)label.textContent=`Trang ${page}/${pages}`;
    const prev=toolbar.querySelector('[data-lbg-list-prev]'),next=toolbar.querySelector('[data-lbg-list-next]');if(prev)prev.disabled=page<=1;if(next)next.disabled=page>=pages;
    return{page,pages}
  }

  function ensureAccountToolbar(card){
    let bar=q('lbgAccountListUxToolbar');if(bar)return bar;
    bar=document.createElement('div');bar.id='lbgAccountListUxToolbar';bar.className='lbg-list-ux-toolbar';bar.innerHTML=`
      <label class="lbg-list-ux-search">Tìm tài khoản<input id="lbgAccountListSearch" type="search" placeholder="Tên, mã đăng nhập, vai trò…"></label>
      <label>Sắp xếp<select id="lbgAccountListSort"><option value="old" selected>Cũ → mới</option><option value="new">Mới → cũ</option><option value="az">Tên A → Z</option></select></label>
      <label>Hiển thị<select id="lbgAccountListSize"><option value="10" selected>10 dòng/trang</option><option value="20">20 dòng/trang</option><option value="50">50 dòng/trang</option></select></label>
      <div class="lbg-list-ux-meta"><span data-lbg-list-info>0/0</span><span class="lbg-list-ux-page"><button class="btn outline mini" type="button" data-lbg-list-prev>‹</button><b data-lbg-list-page-label>Trang 1/1</b><button class="btn outline mini" type="button" data-lbg-list-next>›</button></span></div>`;
    const wrap=card.querySelector('.wrap.lbg-owner-table');wrap?.insertAdjacentElement('beforebegin',bar);
    const hint=document.createElement('div');hint.className='lbg-list-ux-hint';hint.textContent='Mặc định xếp tài khoản cũ ở trên, tài khoản tạo mới dần xuống dưới. Khi danh sách dài, dùng tìm kiếm hoặc chuyển trang thay vì cuộn cả website.';bar.insertAdjacentElement('afterend',hint);
    q('lbgAccountListSearch').addEventListener('input',()=>{card.dataset.lbgListPage='1';queue()});
    q('lbgAccountListSort').addEventListener('change',()=>{card.dataset.lbgListPage='1';queue()});
    q('lbgAccountListSize').addEventListener('change',()=>{card.dataset.lbgListPage='1';queue()});
    bar.querySelector('[data-lbg-list-prev]').onclick=()=>{card.dataset.lbgListPage=String(Math.max(1,(Number(card.dataset.lbgListPage)||1)-1));queue()};
    bar.querySelector('[data-lbg-list-next]').onclick=()=>{card.dataset.lbgListPage=String((Number(card.dataset.lbgListPage)||1)+1);queue()};
    return bar
  }
  function enhanceAccounts(){
    const card=q('lbgOwnerCard'),tbody=q('lbgOwnerRows');if(!card||!tbody)return;
    const rows=[...tbody.querySelectorAll(':scope>tr')];if(!rows.length)return;
    // owner-admin-v1 tải created_at theo mới -> cũ. Ghi lại thứ hạng ban đầu mỗi lần bảng được render lại.
    rows.forEach((r,i)=>{if(r.dataset.lbgCreatedRank===undefined)r.dataset.lbgCreatedRank=String(i)});
    const bar=ensureAccountToolbar(card),needle=norm(q('lbgAccountListSearch')?.value),sort=q('lbgAccountListSort')?.value||'old',pageSize=Math.max(1,Number(q('lbgAccountListSize')?.value)||10);
    const ordered=rows.slice().sort((a,b)=>{
      if(sort==='az')return rowName(a).localeCompare(rowName(b),'vi');
      const ra=Number(a.dataset.lbgCreatedRank)||0,rb=Number(b.dataset.lbgCreatedRank)||0;
      return sort==='new'?ra-rb:rb-ra;
    });
    setOrder(tbody,ordered);
    const matching=ordered.filter(r=>!needle||rowSearchText(r).includes(needle));
    const {page}=updatePager(bar,card,matching.length,pageSize),start=(page-1)*pageSize,end=start+pageSize;
    const visible=new Set(matching.slice(start,end));ordered.forEach(r=>r.hidden=!visible.has(r))
  }

  function linkSection(){
    return [...document.querySelectorAll('#lbgOwnerPeople section,.lbg-group-section')].find(s=>/Liên kết tài khoản với giáo viên trong TKB|Gán mã TKB/i.test(txt(s.querySelector('h2,h3')?.textContent)))||null
  }
  function linkedState(row){
    const field=row.querySelector('select[id^="code-"],input[id^="code-"]');return Boolean(txt(field?.value))
  }
  function roleState(row){return norm(row.cells?.[2]?.textContent||'')}
  function ensureLinkToolbar(section){
    let bar=q('lbgLinkListUxToolbar');if(bar)return bar;
    bar=document.createElement('div');bar.id='lbgLinkListUxToolbar';bar.className='lbg-list-ux-toolbar';bar.innerHTML=`
      <label class="lbg-list-ux-search">Tìm tài khoản<input id="lbgLinkListSearch" type="search" placeholder="Tên, tài khoản hoặc mã TKB…"></label>
      <label>Lọc<select id="lbgLinkListFilter"><option value="all">Tất cả</option><option value="missing">Chưa liên kết</option><option value="linked">Đã liên kết</option><option value="leader">Nhóm trưởng</option><option value="member">Thành viên</option></select></label>
      <label>Sắp xếp<select id="lbgLinkListSort"><option value="attention" selected>Cần xử lý trước</option><option value="az">Tên A → Z</option><option value="role">Nhóm trưởng trước</option></select></label>
      <label>Hiển thị<select id="lbgLinkListSize"><option value="10" selected>10 dòng/trang</option><option value="20">20 dòng/trang</option><option value="50">50 dòng/trang</option></select></label>
      <div class="lbg-list-ux-meta"><span data-lbg-list-info>0/0</span><span class="lbg-list-ux-page"><button class="btn outline mini" type="button" data-lbg-list-prev>‹</button><b data-lbg-list-page-label>Trang 1/1</b><button class="btn outline mini" type="button" data-lbg-list-next>›</button></span></div>`;
    const auto=q('lbgAutoLinkToolbar');if(auto)auto.insertAdjacentElement('afterend',bar);else section.querySelector('.head')?.insertAdjacentElement('afterend',bar);
    const hint=document.createElement('div');hint.className='lbg-list-ux-hint';hint.textContent='Mặc định đưa tài khoản chưa liên kết lên trước, sau đó xếp theo tên. Có thể tìm/lọc và chia trang khi số giáo viên tăng.';bar.insertAdjacentElement('afterend',hint);
    ['lbgLinkListSearch','lbgLinkListFilter','lbgLinkListSort','lbgLinkListSize'].forEach(id=>q(id)?.addEventListener(id.includes('Search')?'input':'change',()=>{section.dataset.lbgListPage='1';queue()}));
    bar.querySelector('[data-lbg-list-prev]').onclick=()=>{section.dataset.lbgListPage=String(Math.max(1,(Number(section.dataset.lbgListPage)||1)-1));queue()};
    bar.querySelector('[data-lbg-list-next]').onclick=()=>{section.dataset.lbgListPage=String((Number(section.dataset.lbgListPage)||1)+1);queue()};
    return bar
  }
  function enhanceLinks(){
    const section=linkSection(),tbody=section?.querySelector('tbody');if(!section||!tbody)return;
    const rows=[...tbody.querySelectorAll(':scope>tr')];if(!rows.length)return;
    const bar=ensureLinkToolbar(section),needle=norm(q('lbgLinkListSearch')?.value),filter=q('lbgLinkListFilter')?.value||'all',sort=q('lbgLinkListSort')?.value||'attention',pageSize=Math.max(1,Number(q('lbgLinkListSize')?.value)||10);
    const filtered=rows.filter(r=>{
      const linked=linkedState(r),role=roleState(r);
      if(needle&&!rowSearchText(r).includes(needle))return false;
      if(filter==='missing'&&linked)return false;if(filter==='linked'&&!linked)return false;
      if(filter==='leader'&&!role.includes('nhom truong'))return false;if(filter==='member'&&!role.includes('thanh vien'))return false;
      return true
    });
    const ordered=rows.slice().sort((a,b)=>{
      if(sort==='az')return rowName(a).localeCompare(rowName(b),'vi');
      if(sort==='role'){
        const la=roleState(a).includes('nhom truong')?0:1,lb=roleState(b).includes('nhom truong')?0:1;return la-lb||rowName(a).localeCompare(rowName(b),'vi')
      }
      const ma=linkedState(a)?1:0,mb=linkedState(b)?1:0;return ma-mb||rowName(a).localeCompare(rowName(b),'vi')
    });
    setOrder(tbody,ordered);
    const orderedFiltered=ordered.filter(r=>filtered.includes(r));
    const {page}=updatePager(bar,section,orderedFiltered.length,pageSize),start=(page-1)*pageSize,end=start+pageSize,visible=new Set(orderedFiltered.slice(start,end));
    ordered.forEach(r=>r.hidden=!visible.has(r))
  }

  function reorderTomorrowPreview(){
    document.querySelectorAll('.lbg-member-window-preview').forEach(wrap=>{
      const rows=[...wrap.querySelectorAll(':scope>.lbg-checkin-point')];if(rows.length<2)return;
      const score=r=>{const t=norm(r.textContent);if(t.includes('• sang •'))return 0;if(t.includes('• chieu •'))return 1;return 2};
      const ordered=rows.slice().sort((a,b)=>score(a)-score(b)||rowName(a).localeCompare(rowName(b),'vi'));
      const current=[...wrap.querySelectorAll(':scope>.lbg-checkin-point')];if(current.some((x,i)=>x!==ordered[i]))ordered.forEach(x=>wrap.appendChild(x))
    })
  }

  function run(){queued=false;style();reorderTomorrowPreview();enhanceAccounts();enhanceLinks()}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(run)}
  function start(){style();run();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('change',queue,true);document.addEventListener('lbg-access-ready',queue);document.addEventListener('lbg-cloud-file-opened',queue);window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.LBGAdminListUxV1={version:VERSION,refresh:queue};
})();
