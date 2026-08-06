'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=value=>String(value??'').replace(/\s+/g,' ').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let main=null,observer=null,scanQueued=false,lastSignature='',sectionObserver=null,statusTimer=null;

  const sectionRules=[
    {test:/Tải các phiên bản TKB|Chọn phiên bản đang áp dụng/i,group:'Thời khóa biểu',icon:'🗂️',tone:'teal'},
    {test:/Kiểm tra và lập báo giảng|Xem trước Lịch Báo giảng/i,group:'Báo giảng',icon:'📝',tone:'blue'},
    {test:/Bảng kê tiết dạy tháng/i,group:'Bảng kê tháng',icon:'📊',tone:'amber'},
    {test:/xung đột/i,group:'Kiểm tra dữ liệu',icon:'⚠️',tone:'red'},
    {test:/giáo án/i,group:'Giáo án',icon:'📚',tone:'purple'},
    {test:/Thống kê giáo viên|Thống kê tuần|tiết dạy trong tuần/i,group:'Thống kê tuần',icon:'📈',tone:'green'},
    {test:/Quản lý nhóm|phân quyền chuyên môn/i,group:'Quản trị',icon:'👥',tone:'indigo'},
    {test:/Quản lý tài khoản/i,group:'Quản trị',icon:'🔐',tone:'indigo'},
    {test:/Kho TKB|đồng bộ|phiên bản TKB chung/i,group:'Dữ liệu đám mây',icon:'☁️',tone:'cyan'},
    {test:/Cài đặt thương hiệu/i,group:'Cài đặt',icon:'🎨',tone:'rose'},
    {test:/Thông báo/i,group:'Thông báo',icon:'🔔',tone:'orange'}
  ];

  function ruleFor(title){return sectionRules.find(rule=>rule.test.test(title))||{group:'Tiện ích khác',icon:'•',tone:'slate'}}
  function slug(value){
    const base=txt(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return `lbg-section-${base||Math.random().toString(36).slice(2)}`;
  }

  function addStyle(){
    if(q('lbgUiRedesignCss'))return;
    const style=document.createElement('style');
    style.id='lbgUiRedesignCss';
    style.textContent=`
      :root{--ui-navy:#0b2f49;--ui-teal:#0f766e;--ui-teal-2:#14b8a6;--ui-surface:#ffffff;--ui-bg:#f3f7f9;--ui-border:#d9e5e9;--ui-muted:#64748b;--ui-shadow:0 12px 34px rgba(15,55,75,.08)}
      html{scroll-behavior:smooth}body{background:linear-gradient(180deg,#f7fafb 0,#eff5f7 100%);color:#152737}
      header.top{background:rgba(255,255,255,.94);backdrop-filter:blur(14px);border-bottom:1px solid #dbe7ea;box-shadow:0 5px 22px rgba(15,55,75,.06);padding:10px 22px}
      header.top h1{letter-spacing:-.02em}.lbg-userbar{background:rgba(243,247,249,.92);backdrop-filter:blur(10px);border-bottom:1px solid #e1eaed}
      #lbgAppLayout{width:min(1740px,100%);margin:0 auto;padding:18px 22px 30px;display:grid;grid-template-columns:260px minmax(0,1fr);gap:20px;align-items:start}
      #lbgAppLayout main.shell{max-width:none;width:100%;margin:0;padding:0;min-width:0}
      #lbgUiSidebar{position:sticky;top:128px;max-height:calc(100vh - 146px);overflow:auto;background:rgba(255,255,255,.96);border:1px solid var(--ui-border);border-radius:22px;padding:14px;box-shadow:var(--ui-shadow);z-index:8}
      .lbg-ui-side-head{padding:7px 8px 12px;border-bottom:1px solid #e7eef0;margin-bottom:10px}.lbg-ui-side-head b{display:block;color:var(--ui-navy);font-size:15px}.lbg-ui-side-head span{display:block;color:var(--ui-muted);font-size:11px;margin-top:2px}
      .lbg-ui-nav-group{margin:11px 0}.lbg-ui-nav-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;color:#81909c;padding:0 9px 5px}.lbg-ui-nav-link{width:100%;border:0;background:transparent;display:flex;align-items:center;gap:9px;text-align:left;padding:8px 9px;border-radius:11px;color:#314858;font-size:12px;font-weight:720;cursor:pointer;transition:.18s}.lbg-ui-nav-link:hover{background:#edf8f6;color:#0f766e}.lbg-ui-nav-link.active{background:#dff5f1;color:#075e58;box-shadow:inset 3px 0 #0f766e}.lbg-ui-nav-icon{width:23px;text-align:center;font-size:14px}.lbg-ui-nav-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .lbg-ui-side-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding-top:10px;border-top:1px solid #e7eef0}.lbg-ui-side-actions button{border:1px solid #dbe6eb;background:#fff;border-radius:10px;padding:7px 6px;font-size:10px;font-weight:800;color:#36505e;cursor:pointer}.lbg-ui-side-actions button:hover{background:#f0fdfa;color:#0f766e}
      #lbgWorkspaceIntro{background:linear-gradient(128deg,#082f49,#0f766e 70%,#16a34a 135%);color:#fff;border-radius:24px;padding:20px 22px;margin-bottom:16px;box-shadow:0 16px 38px rgba(8,47,73,.16);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center}.lbg-ui-intro-kicker{font-size:10px;font-weight:900;letter-spacing:.13em;color:#baf4e9}.lbg-ui-intro-title{font-size:22px;font-weight:900;margin:3px 0 4px}.lbg-ui-intro-sub{font-size:12px;color:#d7f6ee}.lbg-ui-intro-status{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.lbg-ui-status-chip{background:#ffffff1f;border:1px solid #ffffff34;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:750}.lbg-ui-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:280px}.lbg-ui-quick button{border:1px solid #ffffff30;background:#ffffff17;color:#fff;border-radius:12px;padding:9px 11px;text-align:left;font-size:11px;font-weight:850;cursor:pointer}.lbg-ui-quick button:hover{background:#ffffff2b}
      main.shell>.hero{padding:18px 21px;border-radius:20px;margin-bottom:16px;box-shadow:var(--ui-shadow)}main.shell>.hero h2{font-size:19px}.privacy{padding:12px;min-width:210px}
      main.shell .grid{gap:14px;margin-top:14px}.card,.lbg-owner-card,.lbg-scope-card,.lbg-branding-card,.lbg-groups-card,.lbg-ui-section{border-color:var(--ui-border)!important;border-radius:19px!important;box-shadow:var(--ui-shadow)!important;background:var(--ui-surface)!important}
      .lbg-ui-section{position:relative;scroll-margin-top:145px;overflow:visible}.lbg-ui-section:before{content:'';position:absolute;left:0;top:18px;bottom:18px;width:4px;border-radius:0 999px 999px 0;background:#94a3b8}.lbg-ui-section[data-ui-tone='teal']:before{background:#14b8a6}.lbg-ui-section[data-ui-tone='blue']:before{background:#3b82f6}.lbg-ui-section[data-ui-tone='amber']:before{background:#f59e0b}.lbg-ui-section[data-ui-tone='red']:before{background:#ef4444}.lbg-ui-section[data-ui-tone='purple']:before{background:#8b5cf6}.lbg-ui-section[data-ui-tone='green']:before{background:#22c55e}.lbg-ui-section[data-ui-tone='indigo']:before{background:#6366f1}.lbg-ui-section[data-ui-tone='cyan']:before{background:#06b6d4}.lbg-ui-section[data-ui-tone='rose']:before{background:#f43f5e}.lbg-ui-section[data-ui-tone='orange']:before{background:#f97316}
      .lbg-ui-section>.head{padding-bottom:12px;border-bottom:1px solid #edf1f3;margin-bottom:14px}.lbg-ui-section>.head h3,.lbg-ui-section>.head h2{color:var(--ui-navy);letter-spacing:-.015em}.lbg-ui-section>.head p{max-width:850px}
      .lbg-ui-collapse{border:1px solid #dbe6eb;background:#f8fafc;color:#526875;border-radius:9px;padding:6px 8px;font-size:10px;font-weight:850;cursor:pointer;white-space:nowrap}.lbg-ui-collapse:hover{background:#edf8f6;color:#0f766e}.lbg-ui-section.lbg-ui-collapsed>:not(.head){display:none!important}.lbg-ui-section.lbg-ui-collapsed{padding-bottom:8px!important}.lbg-ui-section.lbg-ui-collapsed>.head{border-bottom:0;margin-bottom:0;padding-bottom:0}
      .btn{border-radius:10px;transition:transform .15s,box-shadow .15s,background .15s}.btn:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(15,55,75,.12)}.primary{background:#0f766e}.success{background:#16a34a}.outline{border-color:#d8e4e8}.danger{color:#dc2626}
      input,select{outline:none;transition:border-color .15s,box-shadow .15s}input:focus,select:focus{border-color:#4db8a9!important;box-shadow:0 0 0 3px rgba(20,184,166,.12)}
      .upload{background:#f7fcfb;border-color:#9bd8ce}.notice{background:#f7fafb}.badge{background:#e7f7f4;color:#0f766e}
      table{border-radius:12px;overflow:hidden}th{background:#f3f7f8;color:#526875}tbody tr:hover{background:#f8fcfb}
      #lbgUiMobileMenu{display:none;position:fixed;right:16px;bottom:18px;z-index:80;width:52px;height:52px;border:0;border-radius:17px;background:#0f766e;color:#fff;font-size:21px;box-shadow:0 14px 32px rgba(15,118,110,.3);cursor:pointer}#lbgUiOverlay{display:none}
      #lbgUiTop{position:fixed;right:18px;bottom:82px;z-index:60;width:40px;height:40px;border:1px solid #dbe6eb;border-radius:13px;background:#fff;color:#0f766e;box-shadow:var(--ui-shadow);cursor:pointer;opacity:0;pointer-events:none;transition:.2s}#lbgUiTop.show{opacity:1;pointer-events:auto}
      footer{padding:18px 14px 26px}
      @media(max-width:1180px){#lbgAppLayout{grid-template-columns:1fr;padding:14px}#lbgUiSidebar{position:fixed;z-index:101;left:12px;top:12px;bottom:12px;width:min(310px,calc(100vw - 52px));max-height:none;transform:translateX(calc(-100% - 24px));transition:.22s}.lbg-ui-menu-open #lbgUiSidebar{transform:translateX(0)}#lbgUiOverlay{display:block;position:fixed;inset:0;background:#081c2d99;backdrop-filter:blur(2px);z-index:100;opacity:0;pointer-events:none;transition:.2s}.lbg-ui-menu-open #lbgUiOverlay{opacity:1;pointer-events:auto}#lbgUiMobileMenu{display:block}}
      @media(max-width:760px){#lbgAppLayout{padding:10px}#lbgWorkspaceIntro{grid-template-columns:1fr;padding:17px;border-radius:19px}.lbg-ui-intro-title{font-size:18px}.lbg-ui-quick{min-width:0;grid-template-columns:1fr 1fr}.card,.lbg-owner-card,.lbg-scope-card,.lbg-branding-card,.lbg-groups-card{border-radius:16px!important}.lbg-ui-section{scroll-margin-top:118px}.lbg-ui-collapse{padding:5px 7px}.head{align-items:flex-start}.head>.badge{flex:0 0 auto}}
      @media(max-width:480px){.lbg-ui-quick{grid-template-columns:1fr}.lbg-ui-intro-status{display:grid;grid-template-columns:1fr}.lbg-ui-status-chip{text-align:center}}
    `;
    document.head.appendChild(style);
  }

  function ensureLayout(){
    main=document.querySelector('main.shell');
    if(!main)return false;
    let layout=q('lbgAppLayout');
    if(!layout){
      layout=document.createElement('div');layout.id='lbgAppLayout';
      main.parentNode.insertBefore(layout,main);
      const aside=document.createElement('aside');aside.id='lbgUiSidebar';aside.innerHTML='<div class="lbg-ui-side-head"><b>Danh mục chức năng</b><span>Chọn mục để di chuyển nhanh</span></div><div id="lbgUiNav"></div><div class="lbg-ui-side-actions"><button id="lbgUiOpenAll">Mở tất cả</button><button id="lbgUiFoldAdmin">Gọn quản trị</button></div>';
      layout.appendChild(aside);layout.appendChild(main);
      const overlay=document.createElement('div');overlay.id='lbgUiOverlay';document.body.appendChild(overlay);
      const menu=document.createElement('button');menu.id='lbgUiMobileMenu';menu.type='button';menu.setAttribute('aria-label','Mở danh mục');menu.textContent='☰';document.body.appendChild(menu);
      const top=document.createElement('button');top.id='lbgUiTop';top.type='button';top.setAttribute('aria-label','Lên đầu trang');top.textContent='↑';document.body.appendChild(top);
      menu.onclick=()=>document.body.classList.toggle('lbg-ui-menu-open');overlay.onclick=()=>document.body.classList.remove('lbg-ui-menu-open');top.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
      q('lbgUiOpenAll').onclick=()=>setCollapsed(()=>false);
      q('lbgUiFoldAdmin').onclick=()=>setCollapsed(section=>['Quản trị','Cài đặt','Dữ liệu đám mây'].includes(section.dataset.uiGroup));
      window.addEventListener('scroll',()=>top.classList.toggle('show',window.scrollY>600),{passive:true});
    }
    ensureIntro();
    return true;
  }

  function ensureIntro(){
    if(q('lbgWorkspaceIntro'))return;
    const intro=document.createElement('section');intro.id='lbgWorkspaceIntro';
    intro.innerHTML=`<div><div class="lbg-ui-intro-kicker">KHÔNG GIAN LÀM VIỆC</div><div class="lbg-ui-intro-title">Quản lý Lịch Báo giảng rõ ràng hơn</div><div class="lbg-ui-intro-sub">Giao diện được sắp xếp lại; toàn bộ chức năng, dữ liệu và cách sử dụng vẫn giữ nguyên.</div><div class="lbg-ui-intro-status"><span class="lbg-ui-status-chip" id="lbgUiRoleStatus">Tài khoản: đang tải…</span><span class="lbg-ui-status-chip" id="lbgUiFileStatus">TKB: chưa chọn</span><span class="lbg-ui-status-chip" id="lbgUiWeekStatus">Tuần: chưa chọn</span></div></div><div class="lbg-ui-quick"><button data-ui-find="Tải các phiên bản TKB">🗂️ Tải TKB</button><button data-ui-find="Kiểm tra và lập báo giảng">📝 Lập báo giảng</button><button data-ui-find="Bảng kê tiết dạy tháng">📊 Bảng kê tháng</button><button data-ui-find="Thống kê giáo viên">📈 Thống kê tuần</button></div>`;
    main.prepend(intro);
    intro.querySelectorAll('[data-ui-find]').forEach(button=>button.onclick=()=>scrollToTitle(button.dataset.uiFind));
  }

  function candidates(){
    if(!main)return[];
    const selectors=[':scope > section',':scope > article.card',':scope > .grid > article.card',':scope > .lbg-owner-card',':scope > .lbg-scope-card',':scope > .lbg-branding-card',':scope > .lbg-groups-card'];
    const unique=new Set();selectors.forEach(selector=>{try{main.querySelectorAll(selector).forEach(node=>unique.add(node))}catch{}});
    return[...unique].filter(node=>node.id!=='lbgWorkspaceIntro'&&node.id!=='previewCard'&&node.id!=='detailCard'&&node.querySelector('h2,h3'));
  }

  function titleOf(section){return txt(section.querySelector('.head h3,.head h2,h3,h2')?.textContent)}

  function enhance(section){
    const title=titleOf(section);if(!title)return null;
    const rule=ruleFor(title);
    if(!section.id)section.id=slug(title);
    section.classList.add('lbg-ui-section');section.dataset.uiTone=rule.tone;section.dataset.uiGroup=rule.group;section.dataset.uiTitle=title;
    const head=[...section.children].find(child=>child.classList?.contains('head'));
    if(head&&!head.querySelector('.lbg-ui-collapse')){
      const button=document.createElement('button');button.type='button';button.className='lbg-ui-collapse';button.setAttribute('aria-expanded','true');button.textContent='Thu gọn';
      button.onclick=()=>toggleSection(section);
      head.appendChild(button);
      const saved=localStorage.getItem(`lbgUiCollapsed:${section.id}`)==='1';
      if(saved)applyCollapsed(section,true);
    }
    return{section,title,rule};
  }

  function applyCollapsed(section,collapsed){
    section.classList.toggle('lbg-ui-collapsed',collapsed);
    const button=section.querySelector(':scope > .head .lbg-ui-collapse');
    if(button){button.textContent=collapsed?'Mở mục':'Thu gọn';button.setAttribute('aria-expanded',String(!collapsed))}
    localStorage.setItem(`lbgUiCollapsed:${section.id}`,collapsed?'1':'0');
  }
  function toggleSection(section){applyCollapsed(section,!section.classList.contains('lbg-ui-collapsed'))}
  function setCollapsed(test){candidates().forEach(section=>{if(section.querySelector(':scope > .head .lbg-ui-collapse'))applyCollapsed(section,Boolean(test(section)))})}

  function buildNav(items){
    const signature=items.map(item=>`${item.section.id}|${item.title}|${item.rule.group}`).join('~');
    if(signature===lastSignature)return;lastSignature=signature;
    const groups=[];const map=new Map();
    items.forEach(item=>{if(!map.has(item.rule.group)){const group={name:item.rule.group,items:[]};map.set(item.rule.group,group);groups.push(group)}map.get(item.rule.group).items.push(item)});
    const nav=q('lbgUiNav');if(!nav)return;
    nav.innerHTML=groups.map(group=>`<div class="lbg-ui-nav-group"><div class="lbg-ui-nav-label">${esc(group.name)}</div>${group.items.map(item=>`<button class="lbg-ui-nav-link" data-target="${esc(item.section.id)}"><span class="lbg-ui-nav-icon">${item.rule.icon}</span><span class="lbg-ui-nav-text">${esc(item.title.replace(/^\d+\.\s*/,''))}</span></button>`).join('')}</div>`).join('');
    nav.querySelectorAll('[data-target]').forEach(button=>button.onclick=()=>{const section=q(button.dataset.target);if(section?.classList.contains('lbg-ui-collapsed'))applyCollapsed(section,false);section?.scrollIntoView({behavior:'smooth',block:'start'});document.body.classList.remove('lbg-ui-menu-open')});
    observeSections(items.map(item=>item.section));
  }

  function observeSections(sections){
    sectionObserver?.disconnect();
    sectionObserver=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
      if(!visible)return;
      q('lbgUiNav')?.querySelectorAll('.lbg-ui-nav-link').forEach(link=>link.classList.toggle('active',link.dataset.target===visible.target.id));
    },{rootMargin:'-25% 0px -65% 0px',threshold:0});
    sections.forEach(section=>sectionObserver.observe(section));
  }

  function scrollToTitle(part){
    const section=candidates().find(node=>titleOf(node).toLowerCase().includes(part.toLowerCase()));
    if(!section)return;
    if(section.classList.contains('lbg-ui-collapsed'))applyCollapsed(section,false);
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function refreshStatus(){
    const role=txt(q('lbgUserBar')?.querySelector('.lbg-userchip')?.textContent)||'Đang chờ đăng nhập';
    const active=txt(q('active')?.textContent)||'Chưa chọn file';
    const week=q('week');const weekText=week&&!week.disabled?txt(week.options?.[week.selectedIndex]?.textContent||week.value):'Chưa chọn';
    const roleBox=q('lbgUiRoleStatus'),fileBox=q('lbgUiFileStatus'),weekBox=q('lbgUiWeekStatus');
    if(roleBox&&roleBox.textContent!==`Tài khoản: ${role}`)roleBox.textContent=`Tài khoản: ${role}`;
    if(fileBox&&fileBox.textContent!==`TKB: ${active}`)fileBox.textContent=`TKB: ${active}`;
    if(weekBox&&weekBox.textContent!==`Tuần: ${weekText}`)weekBox.textContent=`Tuần: ${weekText}`;
  }

  function scan(){
    scanQueued=false;if(!ensureLayout())return;
    const items=candidates().map(enhance).filter(Boolean);buildNav(items);refreshStatus();
  }
  function queueScan(){if(scanQueued)return;scanQueued=true;requestAnimationFrame(scan)}

  function start(){
    addStyle();
    const wait=setInterval(()=>{if(ensureLayout()){clearInterval(wait);scan();observer=new MutationObserver(queueScan);observer.observe(main,{childList:true,subtree:true});statusTimer=setInterval(refreshStatus,1400)}},100);
    setTimeout(()=>clearInterval(wait),30000);
    window.addEventListener('beforeunload',()=>{observer?.disconnect();sectionObserver?.disconnect();clearInterval(statusTimer);clearInterval(wait)},{once:true});
  }

  start();
})();
