'use strict';
(function(){
  const q=id=>document.getElementById(id);
  let observer=null,queued=false,folded=false;

  function style(){
    if(q('lbgMobilePolishV2Css'))return;
    const s=document.createElement('style');s.id='lbgMobilePolishV2Css';s.textContent=`
      :root{--mp-safe-bottom:env(safe-area-inset-bottom,0px)}
      body{overflow-x:hidden}.btn,button,input,select,textarea{-webkit-tap-highlight-color:transparent}.btn{min-height:40px}.wrap{max-width:100%;overflow:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin}.sheet{box-shadow:0 10px 30px rgba(15,23,42,.08)}
      .lbg-auth-gate,.lbg-password-gate{background:radial-gradient(circle at 18% 12%,rgba(45,212,191,.32),transparent 28%),linear-gradient(140deg,#06283d,#0f766e 62%,#15803d)}.lbg-login-box{border:1px solid rgba(255,255,255,.5);box-shadow:0 28px 90px rgba(1,20,32,.28)}.lbg-login-box input{min-height:46px}.lbg-auth-actions .btn{min-height:44px}
      .lbg-ui-section>.head{gap:10px}.lbg-ui-section>.head>div{min-width:0}.lbg-ui-section>.head h3,.lbg-ui-section>.head h2{line-height:1.2}.lbg-access-note,.notice,.alert{line-height:1.45}
      #previewCard .wrap{border-radius:14px;background:linear-gradient(90deg,#eef5f7 0,#fff 16px,#fff calc(100% - 16px),#eef5f7 100%);padding-bottom:5px}
      #lbgMobileDock{display:none}.lbg-mobile-scroll-tip{display:none}
      @media(max-width:1180px){
        body{padding-bottom:calc(76px + var(--mp-safe-bottom))}
        #lbgUiMobileMenu{display:none!important}
        #lbgMobileDock{position:fixed;left:10px;right:10px;bottom:calc(8px + var(--mp-safe-bottom));z-index:95;display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:7px;background:rgba(255,255,255,.94);border:1px solid #d8e5e9;border-radius:18px;box-shadow:0 16px 45px rgba(15,55,75,.2);backdrop-filter:blur(16px)}
        #lbgMobileDock button{border:0;background:transparent;color:#526875;border-radius:12px;min-height:48px;padding:5px 3px;display:grid;place-items:center;gap:1px;font-size:10px;font-weight:850;cursor:pointer}#lbgMobileDock button span:first-child{font-size:18px;line-height:1}#lbgMobileDock button:active,#lbgMobileDock button.active{background:#e7f7f4;color:#0f766e}
        #lbgUiTop{bottom:calc(88px + var(--mp-safe-bottom))}
      }
      @media(max-width:760px){
        header.top{padding:8px 10px;min-height:60px;gap:9px}header.top .logo{width:42px!important;height:42px!important;min-width:42px!important;border-radius:13px!important}header.top h1{font-size:14px!important;line-height:1.15;max-width:58vw}header.top p{display:none!important}header.top .right{margin-left:auto}header.top #clear{padding:8px 9px;font-size:11px;min-height:38px;white-space:nowrap}
        .lbg-userbar{top:59px!important;justify-content:flex-start!important;flex-wrap:nowrap!important;overflow-x:auto;padding:6px 10px!important;background:rgba(247,250,251,.95);scrollbar-width:none}.lbg-userbar::-webkit-scrollbar{display:none}.lbg-userbar>*{flex:0 0 auto}.lbg-userchip{font-size:11px;padding:6px 9px}.lbg-userbar .btn{min-height:34px;padding:6px 9px;font-size:10px}
        #lbgAppLayout{padding:8px!important;gap:10px!important}#lbgAppLayout main.shell{padding:0!important}
        #lbgWorkspaceIntro{margin-bottom:10px!important;padding:14px!important;border-radius:18px!important;gap:11px!important}.lbg-ui-intro-title{font-size:17px!important}.lbg-ui-intro-sub{font-size:11px}.lbg-ui-intro-status{gap:5px!important;margin-top:8px!important}.lbg-ui-status-chip{padding:5px 7px!important;font-size:9px!important}.lbg-ui-quick{grid-template-columns:1fr 1fr!important;gap:6px!important}.lbg-ui-quick button{padding:8px!important;font-size:10px!important;min-height:40px}
        .card,.lbg-owner-card,.lbg-scope-card,.lbg-branding-card,.lbg-groups-card,.lbg-ui-section{padding:12px!important;margin-top:10px!important;border-radius:16px!important}.grid{gap:10px!important;margin-top:10px!important}.head{margin-bottom:10px!important;padding-bottom:9px!important}.head h3,.head h2{font-size:17px!important}.head p{font-size:11px!important}.badge{font-size:9px!important;padding:5px 7px!important}
        .controls,.row,.lbg-scope-controls,.lbg-groups-toolbar{grid-template-columns:1fr!important;display:grid!important;gap:8px!important}.controls>*{min-width:0!important}.controls .btn,.row .btn,.lbg-scope-controls .btn{width:100%;min-height:44px}.controls label,.row label{width:100%}.controls select,.row input,input,select,textarea{font-size:16px!important}
        .sumgrid{grid-template-columns:1fr 1fr!important;gap:7px!important}.sum{padding:9px!important}.sum b{font-size:17px!important}.sum span{font-size:10px!important}
        .upload{padding:17px!important}.versions{max-height:270px}.ver{grid-template-columns:1fr!important}.ver .acts{justify-content:flex-start!important}
        .lbg-multi-panel{position:fixed!important;left:9px!important;right:9px!important;top:auto!important;bottom:calc(78px + var(--mp-safe-bottom))!important;max-height:72vh!important;border-radius:20px!important;padding:12px!important;overflow:hidden}.lbg-multi-list{max-height:48vh!important}.lbg-teacher-option{padding:10px 7px!important}.lbg-teacher-option input{width:19px;height:19px}.lbg-multi-actions .btn{min-height:38px}.lbg-export-options.show{display:grid!important;gap:8px!important}.lbg-export-options label{align-items:flex-start!important}
        #previewCard .wrap{margin:0 -4px;padding:0 4px 6px}.lbg-mobile-scroll-tip{display:block;margin:0 0 7px;padding:7px 9px;border-radius:9px;background:#f8fafc;color:#64748b;font-size:10px;text-align:center}.sheet{font-size:12px}.report th,.report td{padding:4px!important}.foot{gap:10px;padding:9px 12px!important;font-size:11px;flex-wrap:wrap}
        .lbg-groups-grid{grid-template-columns:1fr!important}.lbg-group-box{padding:11px!important}.lbg-member-row{grid-template-columns:1fr!important}.lbg-inline{display:grid!important;grid-template-columns:1fr!important}.lbg-inline .btn,.lbg-inline select,.lbg-inline input{width:100%}
        .lbg-people-table,.lbg-scope-table{overflow:auto}.lbg-brand-grid,.lbg-brand-controls{grid-template-columns:1fr!important}
        .lbg-login-box{padding:20px 16px!important;border-radius:20px!important}.lbg-login-box h2{font-size:21px}.lbg-auth-actions{display:grid!important;grid-template-columns:1fr!important}.lbg-auth-actions .btn{width:100%}
        #lbgUiSidebar{width:min(318px,calc(100vw - 34px))!important;border-radius:20px!important}.lbg-ui-nav-link{min-height:42px;font-size:12px!important}.lbg-ui-side-actions button{min-height:40px}
      }
      @media(max-width:420px){
        header.top h1{font-size:13px!important;max-width:52vw}header.top #clear{font-size:0;width:40px}header.top #clear:after{content:'🗑';font-size:17px}.sumgrid{grid-template-columns:1fr!important}.lbg-ui-quick{grid-template-columns:1fr 1fr!important}#lbgMobileDock{left:6px;right:6px;bottom:calc(5px + var(--mp-safe-bottom));border-radius:16px}#lbgMobileDock button{font-size:9px}
      }
    `;document.head.appendChild(s);
  }

  function findSection(pattern){return[...document.querySelectorAll('.lbg-ui-section,section.card,section')].find(x=>pattern.test(String(x.querySelector('h3,h2')?.textContent||'')))||null}
  function scrollTo(pattern){const s=findSection(pattern);if(s){s.classList.remove('lbg-ui-collapsed');s.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>s.classList.add('lbg-mobile-focus'),0);setTimeout(()=>s.classList.remove('lbg-mobile-focus'),900)}}

  function dock(){
    if(q('lbgMobileDock'))return;
    const d=document.createElement('nav');d.id='lbgMobileDock';d.setAttribute('aria-label','Điều hướng nhanh trên điện thoại');
    d.innerHTML='<button type="button" data-dock="report"><span>📝</span><span>Báo giảng</span></button><button type="button" data-dock="month"><span>📊</span><span>Bảng kê</span></button><button type="button" data-dock="stats"><span>📈</span><span>Thống kê</span></button><button type="button" data-dock="menu"><span>☰</span><span>Danh mục</span></button>';
    document.body.appendChild(d);
    d.onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.dock;if(k==='report')scrollTo(/^3\.\s*Kiểm tra và lập báo giảng/i);else if(k==='month')scrollTo(/Bảng kê tiết dạy tháng/i);else if(k==='stats')scrollTo(/Thống kê giáo viên|Thống kê tuần|tiết dạy trong tuần/i);else if(k==='menu')document.body.classList.toggle('lbg-ui-menu-open')};
  }

  function previewTip(){
    const wrap=q('previewCard')?.querySelector('.wrap');if(!wrap||wrap.previousElementSibling?.classList?.contains('lbg-mobile-scroll-tip'))return;
    const tip=document.createElement('div');tip.className='lbg-mobile-scroll-tip';tip.textContent='↔ Vuốt ngang để xem đầy đủ các ngày trong báo giảng.';wrap.before(tip);
  }

  function cleanCompare(){const b=q('compare');if(b&&/So sánh/.test(b.textContent)){b.title=b.title||'So sánh cùng một giáo viên giữa hai phiên bản TKB.'}}

  function foldHeavyOnPhone(){
    if(folded||window.innerWidth>760)return;folded=true;
    document.querySelectorAll('.lbg-ui-section').forEach(section=>{if(['Quản trị','Cài đặt','Dữ liệu đám mây'].includes(section.dataset.uiGroup))section.classList.add('lbg-ui-collapsed')});
  }

  function polish(){style();dock();previewTip();cleanCompare();foldHeavyOnPhone()}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polish()})}
  function start(){polish();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('resize',queue,{passive:true});window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
