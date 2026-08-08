'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const text=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();

  function addStyle(){
    if(q('lbgDashboardFinishV1Css'))return;
    const s=document.createElement('style');
    s.id='lbgDashboardFinishV1Css';
    s.textContent=`
      :root{
        --finish-orange:#f4a261;
        --finish-orange-strong:#e98a45;
        --finish-orange-soft:#fff1e5;
        --finish-orange-pale:#fff8f2;
        --finish-brown:#5b3828;
        --finish-ink:#49362e;
        --finish-muted:#806b61;
        --finish-line:#f0ddd2;
        --finish-card:#ffffff;
        --finish-shadow:0 10px 28px rgba(116,72,48,.075);
        --finish-shadow-hover:0 14px 34px rgba(116,72,48,.11);
        --finish-radius:18px;
        --finish-control:42px;
      }

      html{scroll-padding-top:140px;background:#fff9f5!important}
      body{font-size:14px;line-height:1.55;letter-spacing:.001em;background:linear-gradient(180deg,#fffdfb 0%,#fff9f5 48%,#fff7f1 100%)!important}
      body,button,input,select,textarea{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
      *{scrollbar-color:#e6b794 #fff7f1;scrollbar-width:thin}
      *::-webkit-scrollbar{width:9px;height:9px}*::-webkit-scrollbar-track{background:#fff7f1}*::-webkit-scrollbar-thumb{background:#e7b795;border-radius:999px;border:2px solid #fff7f1}

      header.top{min-height:68px;padding:9px 20px!important;background:rgba(255,253,251,.965)!important;border-bottom:1px solid #f0ddd2!important;box-shadow:0 5px 18px rgba(116,72,48,.055)!important;backdrop-filter:blur(16px)}
      header.top .logo{width:46px!important;height:46px!important;min-width:46px;border-radius:14px!important;font-size:15px;letter-spacing:.04em}
      header.top h1{font-size:17px!important;line-height:1.15;letter-spacing:-.015em!important;color:#5b3828!important}
      header.top p{margin-top:3px!important;color:#8a7469!important;font-size:11px!important}
      .lbg-finish-test-badge{display:inline-flex;align-items:center;margin-left:8px;padding:4px 7px;border:1px solid #f1c9ac;border-radius:999px;background:#fff1e5;color:#965a35;font-size:9px;font-weight:900;letter-spacing:.06em;vertical-align:middle;white-space:nowrap}

      .lbg-userbar{min-height:43px!important;padding:6px 20px!important;background:rgba(255,250,247,.965)!important;border-bottom:1px solid #f4e4da!important;box-shadow:0 2px 8px rgba(116,72,48,.025)}
      .lbg-userchip{min-height:30px;display:inline-flex;align-items:center;border:1px solid #efd5c4!important;background:#fff7f1!important;color:#775344!important;border-radius:999px!important;font-weight:760}

      #lbgAppLayout{width:min(1660px,100%)!important;grid-template-columns:248px minmax(0,1fr)!important;gap:18px!important;padding:18px 20px 34px!important}
      #lbgUiSidebar{top:124px!important;max-height:calc(100vh - 142px)!important;padding:12px!important;border-radius:18px!important;border:1px solid #f0ddd2!important;background:rgba(255,253,251,.98)!important;box-shadow:var(--finish-shadow)!important}
      .lbg-ui-side-head{padding:7px 8px 11px!important;margin-bottom:7px!important;border-bottom:1px solid #f5e8df!important}
      .lbg-ui-side-head b{font-size:14px!important;color:#5f4032!important}.lbg-ui-side-head span{font-size:10px!important;color:#927d72!important}
      .lbg-ui-nav-group{margin:10px 0!important}.lbg-ui-nav-label{padding:0 8px 4px!important;font-size:9px!important;letter-spacing:.12em!important;color:#ad9486!important}
      .lbg-ui-nav-link{min-height:38px!important;padding:7px 8px!important;border-radius:10px!important;color:#70584c!important;font-size:11px!important;font-weight:760!important}
      .lbg-ui-nav-link:hover{background:#fff3e9!important;color:#955b38!important;transform:translateX(1px)}
      .lbg-ui-nav-link.active{background:#ffe9d7!important;color:#81502f!important;box-shadow:inset 3px 0 var(--finish-orange)!important}
      .lbg-ui-nav-icon{width:22px!important;font-size:13px!important}.lbg-ui-side-actions{gap:6px!important;padding-top:9px!important;border-top-color:#f5e8df!important}.lbg-ui-side-actions button{min-height:34px;border-color:#efd9cb!important;background:#fff!important;color:#7b6256!important;border-radius:9px!important}

      #lbgWorkspaceIntro{padding:18px 20px!important;border-radius:20px!important;margin-bottom:14px!important;background:linear-gradient(128deg,#efad77 0%,#f4a261 48%,#f8c794 100%)!important;box-shadow:0 14px 32px rgba(210,132,74,.15)!important}
      .lbg-ui-intro-kicker{font-size:9px!important;letter-spacing:.15em!important;color:#704635!important}.lbg-ui-intro-title{font-size:20px!important;letter-spacing:-.02em;line-height:1.2;color:#55382d!important}.lbg-ui-intro-sub{font-size:11px!important;color:#6f5042!important;max-width:730px}
      .lbg-ui-intro-status{gap:6px!important;margin-top:10px!important}.lbg-ui-status-chip{padding:5px 8px!important;border-color:rgba(255,255,255,.86)!important;background:rgba(255,255,255,.5)!important;color:#684738!important;font-size:9px!important}
      .lbg-ui-quick{min-width:264px!important;gap:7px!important}.lbg-ui-quick button{min-height:39px;padding:8px 10px!important;border-color:rgba(255,255,255,.86)!important;background:rgba(255,255,255,.5)!important;color:#624235!important;border-radius:10px!important;font-size:10px!important}.lbg-ui-quick button:hover{background:rgba(255,255,255,.76)!important;transform:translateY(-1px)}

      main.shell>.hero{padding:17px 20px!important;border-radius:18px!important;margin-bottom:13px!important;box-shadow:var(--finish-shadow)!important}
      main.shell>.hero h2{font-size:18px!important;letter-spacing:-.015em}.privacy{min-width:205px!important;padding:11px 13px!important;border-radius:13px!important;font-size:12px}.privacy small{font-size:10px}

      main.shell .grid{gap:12px!important;margin-top:12px!important}
      .card,.lbg-owner-card,.lbg-scope-card,.lbg-branding-card,.lbg-groups-card,.lbg-ui-section,.lbg-manager-card,.lbg-cloud-card{border:1px solid var(--finish-line)!important;border-radius:var(--finish-radius)!important;background:var(--finish-card)!important;box-shadow:var(--finish-shadow)!important}
      .card,.lbg-owner-card,.lbg-scope-card,.lbg-branding-card,.lbg-groups-card,.lbg-manager-card,.lbg-cloud-card{padding:17px!important}
      .lbg-ui-section{transition:box-shadow .18s ease,border-color .18s ease}.lbg-ui-section:hover{border-color:#ebcfbc!important;box-shadow:var(--finish-shadow-hover)!important}
      main.shell > section.grid.lbg-ui-section:hover{box-shadow:none!important;border-color:transparent!important}
      .lbg-ui-section:before{width:3px!important;top:16px!important;bottom:16px!important;background:var(--finish-orange)!important}
      .lbg-ui-section[data-ui-tone='red']:before{background:#ef4444!important}.lbg-ui-section[data-ui-tone='green']:before{background:#22a862!important}.lbg-ui-section[data-ui-tone='purple']:before{background:#9168d8!important}
      .lbg-ui-section>.head{padding-bottom:10px!important;margin-bottom:12px!important;border-bottom:1px solid #f7eae2!important}.head{gap:10px!important}.head h2,.head h3{letter-spacing:-.012em;color:#5d4033!important}.head h3{font-size:15px}.head p{margin-top:3px!important;color:#8b756b!important;font-size:10.5px!important;line-height:1.45}.head>.badge{flex:0 0 auto;max-width:min(42vw,420px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .lbg-ui-collapse{min-height:31px!important;padding:5px 8px!important;border-color:#eed8ca!important;background:#fffaf7!important;color:#80675b!important;border-radius:8px!important}

      .btn,button{transition:background .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease,transform .15s ease}
      .btn{min-height:var(--finish-control);padding:9px 13px!important;border-radius:10px!important;font-size:12px;font-weight:800}
      .btn.primary,.primary{background:var(--finish-orange)!important;border-color:var(--finish-orange)!important;color:#4e3328!important}.btn.primary:not(:disabled):hover,.primary:not(:disabled):hover{background:var(--finish-orange-strong)!important;border-color:var(--finish-orange-strong)!important;color:#fff!important}
      .btn.success,.success{background:#159447!important;border-color:#159447!important;color:#fff!important}.btn.success:not(:disabled):hover,.success:not(:disabled):hover{background:#117e3c!important}
      .btn.outline,.outline{background:#fff!important;border:1px solid #ead3c5!important;color:#654d42!important}.btn.outline:not(:disabled):hover,.outline:not(:disabled):hover{background:#fff4eb!important;border-color:#efc3a6!important;color:#8a5434!important}
      .btn.danger,.danger{color:#c83d36!important}.btn:disabled,button:disabled{opacity:.48!important;cursor:not-allowed!important;box-shadow:none!important;transform:none!important}
      .btn.lbg-busy{position:relative;padding-left:34px!important;pointer-events:none}.btn.lbg-busy:before{content:'';position:absolute;left:12px;top:50%;width:13px;height:13px;margin-top:-7px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:lbgFinishSpin .7s linear infinite}
      @keyframes lbgFinishSpin{to{transform:rotate(360deg)}}

      label{color:#72594e}.controls label,.row label,.lbg-scope-controls label{font-size:10.5px!important;font-weight:790!important;gap:5px!important}
      input,select,textarea{min-height:var(--finish-control);border:1px solid #ead5c8!important;border-radius:10px!important;background:#fff!important;color:#49362e!important;padding:9px 10px!important;box-shadow:0 1px 0 rgba(90,56,38,.02)}
      textarea{min-height:90px;resize:vertical}input::placeholder,textarea::placeholder{color:#b39e92}
      input:hover,select:hover,textarea:hover{border-color:#e2bea7!important}input:focus,select:focus,textarea:focus{border-color:var(--finish-orange)!important;box-shadow:0 0 0 3px rgba(244,162,97,.14)!important}
      :focus-visible{outline:3px solid rgba(244,162,97,.28);outline-offset:2px}

      .upload{min-height:154px!important;padding:20px!important;border:1.5px dashed #e8b995!important;border-radius:14px!important;background:linear-gradient(180deg,#fffaf6,#fff7f1)!important}.upload:hover{border-color:var(--finish-orange)!important;background:#fff4e9!important}.upload.drag{border-color:var(--finish-orange-strong)!important;background:#fff0e2!important}.upload b{font-size:14px!important;color:#654638}.upload span{font-size:10px!important}
      .notice,.alert,.lbg-access-note{border-radius:10px!important;font-size:10.5px!important;line-height:1.5!important}.notice{background:#fffaf7!important;border-color:#f1e1d7!important;color:#806b61!important}
      .badge{padding:5px 8px!important;border:1px solid #f0d1bb!important;border-radius:999px!important;background:#fff0e3!important;color:#8c5636!important;font-size:9.5px!important;font-weight:820!important}

      .versions{gap:7px!important;max-height:360px!important;padding-right:2px}.ver{position:relative;padding:10px 11px!important;border:1px solid #f0e0d6!important;border-radius:12px!important;background:#fff!important;transition:.15s}.ver:hover{border-color:#e8c7b1!important;background:#fffaf7!important}.ver.active{border-color:#e7a977!important;background:#fff3e8!important;box-shadow:inset 3px 0 var(--finish-orange)}.ver.active:before{content:'✓';position:absolute;right:9px;top:8px;width:18px;height:18px;display:grid;place-items:center;border-radius:50%;background:#f4a261;color:#fff;font-size:10px;font-weight:900}.ver.active .acts{padding-right:22px}.ver b{font-size:11.5px!important;color:#5d4438}.meta{font-size:9.5px!important;color:#99857a!important}.acts{gap:5px!important}.mini{min-height:31px!important;padding:5px 7px!important;font-size:9.5px!important}

      .controls{gap:8px!important}.summary{margin-top:13px!important}.sumgrid{gap:8px!important}.sum{padding:10px!important;border:1px solid #f0e0d6!important;border-radius:11px!important;background:#fffaf7!important}.sum b{font-size:17px!important;color:#654638!important}.sum span{font-size:9.5px!important;color:#927d72!important}
      .empty{padding:22px 14px!important;border:1px dashed #efd9ca;border-radius:12px;background:#fffaf7;color:#9a8579!important;font-size:11px!important}

      .wrap{border-radius:12px}.wrap:not(#previewCard .wrap){border:1px solid #f1e3da}
      table:not(.report){border-collapse:separate!important;border-spacing:0!important;background:#fff}table:not(.report) th{position:sticky;top:0;z-index:2;padding:8px 9px!important;background:#fff4ea!important;color:#75594c!important;border-bottom:1px solid #ead4c6!important;font-size:9.5px!important;text-transform:none;letter-spacing:.01em}table:not(.report) td{padding:8px 9px!important;border-bottom:1px solid #f5e9e1!important;font-size:10.5px}table:not(.report) tbody tr:nth-child(even){background:#fffdfb}table:not(.report) tbody tr:hover{background:#fff7f0!important}

      /* Khu vực báo giảng giữ màu biểu mẫu gốc, không cam hóa nội dung chính thức. */
      #previewCard{overflow:hidden}#previewCard .wrap{padding:8px!important;border:1px solid #f0dfd4!important;border-radius:13px!important;background:linear-gradient(90deg,#fff8f2 0,#fff 14px,#fff calc(100% - 14px),#fff8f2 100%)!important}
      #previewCard .sheet{border-color:#222!important;background:#dff5e4!important;box-shadow:0 12px 30px rgba(59,46,36,.11)!important}
      #previewCard .sheet .title{background:#b9e6a5!important;color:#111!important}#previewCard .report th,#previewCard .report .session{background:#f6c9ae!important;color:#111!important}#previewCard .sheet .foot{background:#b9e6a5!important;color:#111!important}

      .toast{max-width:min(92vw,520px);padding:9px 13px!important;border-radius:10px!important;background:#5d4033!important;color:#fff!important;box-shadow:0 10px 30px rgba(60,38,28,.2);font-size:11px!important}

      @media(max-width:1180px){
        #lbgAppLayout{grid-template-columns:1fr!important;padding:12px 12px 90px!important}#lbgUiSidebar{top:10px!important;bottom:10px!important;max-height:none!important}
        #lbgMobileDock{border-color:#efd8c9!important;background:rgba(255,253,251,.97)!important;box-shadow:0 14px 38px rgba(116,72,48,.15)!important}#lbgMobileDock button{color:#80675b!important}#lbgMobileDock button:active,#lbgMobileDock button.active{background:#ffe8d5!important;color:#8c5636!important}
      }
      @media(max-width:760px){
        header.top{min-height:58px!important;padding:7px 9px!important}header.top .logo{width:40px!important;height:40px!important;min-width:40px!important}header.top h1{font-size:13px!important;max-width:54vw}.lbg-finish-test-badge{display:none}header.top #clear{min-height:36px!important}
        .lbg-userbar{padding:5px 9px!important;min-height:39px!important}
        #lbgAppLayout{padding:8px 8px 86px!important}.card,.lbg-owner-card,.lbg-scope-card,.lbg-branding-card,.lbg-groups-card,.lbg-ui-section,.lbg-manager-card,.lbg-cloud-card{border-radius:14px!important;padding:12px!important}.lbg-ui-section>.head{margin-bottom:10px!important}.head h3,.head h2{font-size:15px!important}.head p{font-size:10px!important}
        #lbgWorkspaceIntro{padding:13px!important;border-radius:16px!important}.lbg-ui-intro-title{font-size:16px!important}.lbg-ui-intro-status{display:flex!important;overflow-x:auto;flex-wrap:nowrap!important;padding-bottom:2px}.lbg-ui-status-chip{flex:0 0 auto}.lbg-ui-quick{grid-template-columns:1fr 1fr!important;min-width:0!important}
        .controls,.row,.lbg-scope-controls,.lbg-groups-toolbar{display:grid!important;grid-template-columns:1fr!important;gap:7px!important}.controls .btn,.row .btn,.lbg-scope-controls .btn{width:100%!important;min-height:42px!important}.controls select,.row input,input,select,textarea{font-size:16px!important}
        .upload{min-height:132px!important;padding:16px!important}.ver{grid-template-columns:1fr!important}.ver .acts{justify-content:flex-start!important}.ver.active .acts{padding-right:0}.ver.active:before{top:9px}
        .sumgrid{grid-template-columns:1fr 1fr!important}.sum{padding:9px!important}
        .wrap:not(#previewCard .wrap){border:0}.table-wrap,.lbg-people-table,.lbg-scope-table{border-radius:10px;overflow:auto;-webkit-overflow-scrolling:touch}
        #previewCard .wrap{margin:0!important;padding:5px!important}
      }
      @media(max-width:430px){.lbg-ui-quick{grid-template-columns:1fr!important}.sumgrid{grid-template-columns:1fr!important}.privacy{min-width:0!important}}
      @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}
    `;
    document.head.appendChild(s);
  }

  function polishHeader(){
    const header=document.querySelector('header.top');
    if(!header)return;
    const title=header.querySelector('h1');
    const sub=header.querySelector('p');
    if(title && !title.querySelector('.lbg-finish-test-badge')){
      const badge=document.createElement('span');
      badge.className='lbg-finish-test-badge';
      badge.textContent='BẢN KIỂM THỬ';
      title.appendChild(badge);
    }
    if(sub && !sub.dataset.finishText){
      sub.textContent='Quản lý TKB • Lập báo giảng • Thống kê giáo viên';
      sub.dataset.finishText='1';
    }
  }

  function polishHero(){
    const hero=document.querySelector('main.shell > .hero');
    if(!hero)return;
    const tag=hero.querySelector('.tag');
    const h=hero.querySelector('h2');
    const p=hero.querySelector('p');
    if(tag && !tag.dataset.finishText){tag.textContent='HỆ THỐNG LÀM VIỆC NỘI BỘ';tag.dataset.finishText='1'}
    if(h && !h.dataset.finishText){h.textContent='Tải TKB → Kiểm tra → Xuất Lịch Báo giảng';h.dataset.finishText='1'}
    if(p && !p.dataset.finishText){p.textContent='Theo dõi nhiều phiên bản TKB, chọn đúng giáo viên và kiểm tra dữ liệu trước khi xuất.';p.dataset.finishText='1'}
  }

  function markBusyButtons(){
    document.querySelectorAll('.btn,button').forEach(button=>{
      const t=text(button).toLowerCase();
      const busy=button.disabled && /(đang|đợi|đọc|tải|xuất|kiểm tra|đồng bộ|lưu)/i.test(t);
      button.classList.toggle('lbg-busy',busy);
      if(busy)button.setAttribute('aria-busy','true');else button.removeAttribute('aria-busy');
    });
  }

  function accessibility(){
    document.querySelectorAll('button:not([type])').forEach(button=>button.type='button');
    document.querySelectorAll('.wrap').forEach(wrap=>{if(!wrap.hasAttribute('tabindex') && wrap.scrollWidth>wrap.clientWidth)wrap.tabIndex=0});
    const sidebar=q('lbgUiSidebar');if(sidebar)sidebar.setAttribute('aria-label','Danh mục chức năng');
  }

  function polishFooter(){
    const footer=document.querySelector('footer');
    if(footer && !footer.dataset.finishText){footer.textContent='Bản kiểm thử giao diện 2026.08.08.8 • Dữ liệu TKB được lưu trong trình duyệt và chỉ xuất khi người dùng chủ động';footer.dataset.finishText='1'}
  }

  let queued=false;
  function run(){
    queued=false;
    addStyle();
    polishHeader();
    polishHero();
    polishFooter();
    markBusyButtons();
    accessibility();
    document.documentElement.dataset.lbgDashboardFinish='v1';
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(run)}
  function start(){
    run();
    const observer=new MutationObserver(queue);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden','class']});
    window.addEventListener('resize',queue,{passive:true});
    window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
