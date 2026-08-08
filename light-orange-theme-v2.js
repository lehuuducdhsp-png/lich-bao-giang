'use strict';
(function(){
  const q=id=>document.getElementById(id);
  function install(){
    if(q('lbgLightOrangeThemeV2Css'))return;
    const s=document.createElement('style');
    s.id='lbgLightOrangeThemeV2Css';
    s.textContent=`
      :root{
        --n:#9a5b36!important;
        --t:#f4a261!important;
        --g:#16a34a;
        --i:#4b342b!important;
        --m:#806b61!important;
        --l:#f2ddd0!important;
        --b:#fff9f5!important;
        --ui-navy:#8f5636!important;
        --ui-teal:#f4a261!important;
        --ui-teal-2:#f8c794!important;
        --ui-surface:#ffffff!important;
        --ui-bg:#fff9f5!important;
        --ui-border:#f2ddd0!important;
        --ui-muted:#806b61!important;
        --ui-shadow:0 12px 32px rgba(126,79,53,.08)!important;
      }
      html{background:#fff9f5!important}
      body{background:linear-gradient(180deg,#fffdfb 0%,#fff9f5 45%,#fff6f0 100%)!important;color:#4b342b!important}

      header.top{
        background:rgba(255,253,251,.96)!important;
        border-bottom-color:#f2ddd0!important;
        box-shadow:0 5px 20px rgba(126,79,53,.06)!important;
      }
      header.top h1{color:#6f4634!important}
      header.top .logo{
        background:linear-gradient(145deg,#f1a15f,#f4a261 58%,#f8c794)!important;
        box-shadow:0 8px 20px rgba(244,162,97,.20)!important;
      }
      .lbg-userbar{background:rgba(255,250,247,.96)!important;border-bottom-color:#f4e4da!important}
      .lbg-userchip{border-color:#f0d4c1!important;background:#fff4ea!important;color:#865436!important}

      #lbgWorkspaceIntro,
      main.shell>.hero{
        background:linear-gradient(125deg,#efad77 0%,#f4a261 45%,#f8c794 100%)!important;
        color:#4b342b!important;
        box-shadow:0 16px 36px rgba(244,162,97,.16)!important;
      }
      #lbgWorkspaceIntro h1,#lbgWorkspaceIntro h2,#lbgWorkspaceIntro h3,
      main.shell>.hero h1,main.shell>.hero h2,main.shell>.hero h3{color:#5b3828!important}
      .lbg-ui-intro-kicker{color:#6f4634!important}
      .lbg-ui-intro-sub,main.shell>.hero p{color:#6e5042!important}
      .privacy{background:rgba(255,255,255,.54)!important;border-color:rgba(255,255,255,.85)!important;color:#654335!important}
      .lbg-ui-status-chip,.lbg-ui-quick button{border-color:rgba(255,255,255,.80)!important;background:rgba(255,255,255,.52)!important;color:#654335!important}
      .lbg-ui-quick button:hover{background:rgba(255,255,255,.75)!important}

      #lbgUiSidebar{
        background:#fffdfb!important;
        border-color:#f2ddd0!important;
        box-shadow:0 14px 36px rgba(126,79,53,.08)!important;
      }
      .lbg-ui-side-head{border-bottom-color:#f6e8df!important}
      .lbg-ui-side-head b{color:#6f4634!important}
      .lbg-ui-nav-label{color:#aa8e7e!important}
      .lbg-ui-nav-link{color:#6d564b!important}
      .lbg-ui-nav-link:hover{background:#fff4ea!important;color:#9a5b36!important}
      .lbg-ui-nav-link.active{background:#ffe7d2!important;color:#81502f!important;box-shadow:inset 3px 0 #f4a261!important}
      .lbg-ui-side-actions{border-top-color:#f6e8df!important}
      .lbg-ui-side-actions button{border-color:#f2ddd0!important;color:#785f53!important;background:#fff!important}
      .lbg-ui-side-actions button:hover{background:#fff4ea!important;color:#8c5636!important}

      .card,.lbg-owner-card,.lbg-scope-card,.lbg-branding-card,.lbg-groups-card,.lbg-ui-section,
      .lbg-manager-card,.lbg-cloud-card{
        background:#fff!important;
        border-color:#f2ddd0!important;
        box-shadow:0 11px 30px rgba(126,79,53,.07)!important;
      }
      .lbg-ui-section>.head{border-bottom-color:#f7e9e1!important}
      .lbg-ui-section>.head h3,.lbg-ui-section>.head h2,.head h3,.head h2{color:#6f4634!important}
      .lbg-ui-section[data-ui-tone='teal']:before,
      .lbg-ui-section[data-ui-tone='blue']:before,
      .lbg-ui-section[data-ui-tone='amber']:before,
      .lbg-ui-section[data-ui-tone='indigo']:before,
      .lbg-ui-section[data-ui-tone='cyan']:before,
      .lbg-ui-section[data-ui-tone='rose']:before,
      .lbg-ui-section[data-ui-tone='orange']:before{background:#f4a261!important}
      .lbg-ui-section[data-ui-tone='red']:before{background:#ef4444!important}
      .lbg-ui-section[data-ui-tone='green']:before{background:#22c55e!important}
      .lbg-ui-section[data-ui-tone='purple']:before{background:#8b5cf6!important}

      .primary{background:#f4a261!important;color:#4c3429!important;border-color:#f4a261!important}
      .primary:not(:disabled):hover{background:#e98a45!important;color:#fff!important;box-shadow:0 8px 18px rgba(233,138,69,.20)!important}
      .success{background:#16a34a!important;color:#fff!important}
      .danger{color:#dc2626!important}
      .outline{border-color:#ecd7cb!important;background:#fff!important;color:#664d41!important}
      .outline:not(:disabled):hover{background:#fff4ea!important;border-color:#f2c7aa!important;color:#8c5636!important}
      .btn:not(:disabled):hover{box-shadow:0 7px 17px rgba(126,79,53,.10)!important}

      input,select,textarea{border-color:#ecd7cb!important;background:#fff!important;color:#4b342b!important}
      input:focus,select:focus,textarea:focus{border-color:#f4a261!important;box-shadow:0 0 0 3px rgba(244,162,97,.14)!important}
      .upload{background:#fffaf7!important;border-color:#f2c7aa!important}
      .upload.drag{background:#fff1e5!important;border-color:#f4a261!important}
      .notice{background:#fffaf7!important;border-color:#f1dfd4!important;color:#806b61!important}
      .badge{background:#fff0e3!important;color:#8c5636!important;border-color:#f1cfb8!important}
      table th{background:#fff4ea!important;color:#76594c!important}
      tbody tr:hover{background:#fffaf5!important}

      .lbg-ui-collapse{border-color:#ecd7cb!important;background:#fffaf7!important;color:#7b6256!important}
      .lbg-ui-collapse:hover{background:#fff1e7!important;color:#8c5636!important}
      #lbgUiMobileMenu{background:#f4a261!important;color:#4b342b!important;box-shadow:0 14px 30px rgba(198,123,68,.22)!important}
      #lbgUiTop{color:#9a5b36!important;border-color:#f0cfba!important;background:#fff9f5!important}
      #lbgUiOverlay{background:rgba(74,49,37,.35)!important}

      #lbgMobileDock{border-color:#f1d8ca!important;background:rgba(255,253,251,.97)!important;box-shadow:0 14px 38px rgba(126,79,53,.13)!important}
      #lbgMobileDock button{color:#80675b!important}
      #lbgMobileDock button:active,#lbgMobileDock button.active{background:#ffe7d2!important;color:#8c5636!important}

      .lbg-auth-gate,.lbg-password-gate{
        background:radial-gradient(circle at 18% 12%,rgba(248,199,148,.55),transparent 30%),linear-gradient(145deg,#fff1e5,#f8c794 58%,#f4a261)!important;
      }
      .lbg-login-box{border-color:rgba(255,255,255,.88)!important;box-shadow:0 26px 70px rgba(126,79,53,.18)!important}
      .lbg-login-box h2{color:#6f4634!important}

      .lbg-code-link-toolbar{border-color:#f0cfba!important;background:#fff4ea!important}
      .lbg-code-link-toolbar .meta{color:#8c5636!important}
      .lbg-global-specialist{border-color:#f1c6a7!important;background:linear-gradient(135deg,#fff6ee,#fffdfb)!important}
      .lbg-global-specialist h4{color:#8c5636!important}
      .lbg-global-specialist-status.on{border-color:#86efac!important;background:#f0fdf4!important;color:#166534!important}
      .lbg-manager-role{border-color:#f1dfd4!important;background:#fffaf7!important}
      .lbg-manager-perm{border-color:#f0ddd2!important;background:#fffdfb!important}
      .lbg-manager-perm b{color:#6f4634!important}
      .lbg-manager-group-toolbar{border-color:#f0cfba!important;background:#fff4ea!important}
      .lbg-manager-role-badge{background:#ffe9d7!important;border-color:#f2c39f!important;color:#8c5636!important}

      .lbg-cloud-tabs button.active{background:#f4a261!important;color:#4b342b!important}
      .lbg-cloud-progress span{background:linear-gradient(90deg,#f4a261,#f8c794)!important}
      .lbg-cloud-card .badge{background:#fff0e3!important;color:#8c5636!important}

      .lbg-group-box{border-color:#f0ddd2!important;background:#fffdfb!important}
      .lbg-group-title h4{color:#6f4634!important}
      .lbg-chip{background:#fff0e3!important;color:#8c5636!important}
      .lbg-member-list,.lbg-transfer-results{border-color:#f2e3da!important}
      .lbg-member-row,.lbg-transfer-result{border-bottom-color:#f7ebe4!important}

      #previewCard .wrap{background:linear-gradient(90deg,#fff5ed 0,#fff 16px,#fff calc(100% - 16px),#fff5ed 100%)!important}
      .lbg-r3-help{border-color:#f0cfba!important;background:#fff4ea!important;color:#7a5138!important}
      .lbg-r3-ga:focus{outline-color:#f4a261!important;border-color:#f4a261!important}
      .lbg-mobile-scroll-tip{background:#fff4ea!important;color:#8b6c5b!important}

      .ok{background:#ecfdf5!important;color:#166534!important;border-color:#bbf7d0!important}
      .warn{background:#fff7ed!important;color:#9a3412!important;border-color:#fed7aa!important}
      .info{background:#eff6ff!important;color:#1e40af!important;border-color:#bfdbfe!important}
      .lbg-manager-safe{background:#fff7ed!important;color:#9a3412!important;border-color:#fed7aa!important}

      @media(max-width:760px){
        header.top{background:rgba(255,253,251,.98)!important}
        .lbg-userbar{background:rgba(255,250,247,.98)!important}
        #lbgWorkspaceIntro{background:linear-gradient(145deg,#efad77,#f4a261 62%,#f8c794 118%)!important}
      }
    `;
    document.head.appendChild(s);
    try{
      const meta=document.querySelector('meta[name="theme-color"]');
      if(meta)meta.setAttribute('content','#F4A261');
    }catch{}
    document.documentElement.dataset.lbgTheme='light-orange-v2';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
