'use strict';
(function(){
  const q=id=>document.getElementById(id);

  function install(){
    if(q('lbgOrangeThemeV1Css'))return;
    const s=document.createElement('style');
    s.id='lbgOrangeThemeV1Css';
    s.textContent=`
      :root{
        --n:#7c2d12!important;
        --t:#f97316!important;
        --g:#16a34a;
        --i:#3b241b!important;
        --m:#7c6a60!important;
        --l:#f0ddd2!important;
        --b:#fff9f5!important;
        --ui-navy:#7c2d12!important;
        --ui-teal:#f97316!important;
        --ui-teal-2:#fb923c!important;
        --ui-surface:#ffffff!important;
        --ui-bg:#fff9f5!important;
        --ui-border:#f0ddd2!important;
        --ui-muted:#7c6a60!important;
        --ui-shadow:0 12px 34px rgba(124,45,18,.08)!important;
      }
      html{background:#fff9f5}
      body{background:linear-gradient(180deg,#fffdfb 0%,#fff7ed 52%,#fffaf5 100%)!important;color:#3b241b!important}
      meta[name="theme-color"]{color:#f97316}

      header.top{background:rgba(255,253,251,.96)!important;border-bottom-color:#f3dfd4!important;box-shadow:0 5px 22px rgba(124,45,18,.07)!important}
      header.top h1{color:#7c2d12!important}
      header.top .logo{background:linear-gradient(145deg,#c2410c,#f97316 64%,#f59e0b)!important;box-shadow:0 8px 22px rgba(234,88,12,.22)!important}
      .lbg-userbar{background:rgba(255,249,245,.95)!important;border-bottom-color:#f3dfd4!important}
      .lbg-userchip{border-color:#fed7aa!important;background:#fff7ed!important;color:#9a3412!important}

      #lbgWorkspaceIntro,
      main.shell>.hero{
        background:linear-gradient(128deg,#7c2d12 0%,#c2410c 36%,#ea580c 68%,#f59e0b 128%)!important;
        box-shadow:0 18px 42px rgba(194,65,12,.19)!important;
      }
      .lbg-ui-intro-kicker{color:#ffedd5!important}
      .lbg-ui-intro-sub,main.shell>.hero p{color:#fff2e8!important}
      .privacy{background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.31)!important}
      .lbg-ui-status-chip,.lbg-ui-quick button{border-color:rgba(255,255,255,.30)!important;background:rgba(255,255,255,.14)!important}
      .lbg-ui-quick button:hover{background:rgba(255,255,255,.24)!important}

      #lbgUiSidebar{border-color:#f0ddd2!important;box-shadow:0 14px 38px rgba(124,45,18,.10)!important}
      .lbg-ui-side-head{border-bottom-color:#f5e6dd!important}
      .lbg-ui-side-head b{color:#7c2d12!important}
      .lbg-ui-nav-label{color:#a88f80!important}
      .lbg-ui-nav-link{color:#66483a!important}
      .lbg-ui-nav-link:hover{background:#fff1e7!important;color:#c2410c!important}
      .lbg-ui-nav-link.active{background:#ffedd5!important;color:#9a3412!important;box-shadow:inset 3px 0 #f97316!important}
      .lbg-ui-side-actions{border-top-color:#f5e6dd!important}
      .lbg-ui-side-actions button{border-color:#f0ddd2!important;color:#795548!important}
      .lbg-ui-side-actions button:hover{background:#fff7ed!important;color:#c2410c!important}

      .card,.lbg-owner-card,.lbg-scope-card,.lbg-branding-card,.lbg-groups-card,.lbg-ui-section,
      .lbg-manager-card,.lbg-cloud-card{border-color:#f0ddd2!important;box-shadow:0 12px 34px rgba(124,45,18,.075)!important}
      .lbg-ui-section>.head{border-bottom-color:#f7e9e1!important}
      .lbg-ui-section>.head h3,.lbg-ui-section>.head h2,.head h3,.head h2{color:#7c2d12!important}
      .lbg-ui-section[data-ui-tone='teal']:before,
      .lbg-ui-section[data-ui-tone='blue']:before,
      .lbg-ui-section[data-ui-tone='amber']:before,
      .lbg-ui-section[data-ui-tone='indigo']:before,
      .lbg-ui-section[data-ui-tone='cyan']:before,
      .lbg-ui-section[data-ui-tone='rose']:before,
      .lbg-ui-section[data-ui-tone='orange']:before{background:#f97316!important}
      /* Giữ màu chức năng có ý nghĩa riêng */
      .lbg-ui-section[data-ui-tone='red']:before{background:#ef4444!important}
      .lbg-ui-section[data-ui-tone='green']:before{background:#22c55e!important}
      .lbg-ui-section[data-ui-tone='purple']:before{background:#8b5cf6!important}

      .primary{background:#f97316!important;color:#fff!important}
      .primary:not(:disabled):hover{background:#ea580c!important;box-shadow:0 8px 20px rgba(234,88,12,.22)!important}
      .success{background:#16a34a!important;color:#fff!important}
      .danger{color:#dc2626!important}
      .outline{border-color:#ecd7cb!important;background:#fff!important;color:#5c4438!important}
      .outline:not(:disabled):hover{background:#fff7ed!important;border-color:#fdba74!important;color:#c2410c!important}
      .btn:not(:disabled):hover{box-shadow:0 7px 18px rgba(124,45,18,.12)!important}

      input,select,textarea{border-color:#ecd7cb!important;background:#fff!important;color:#3b241b!important}
      input:focus,select:focus,textarea:focus{border-color:#fb923c!important;box-shadow:0 0 0 3px rgba(249,115,22,.13)!important}
      .upload{background:#fffaf6!important;border-color:#fdba74!important}
      .upload.drag{background:#fff1e7!important;border-color:#f97316!important}
      .notice{background:#fffaf7!important;border-color:#f1dfd4!important;color:#7c6a60!important}
      .badge{background:#fff1e7!important;color:#c2410c!important;border-color:#fed7aa!important}
      table th{background:#fff7ed!important;color:#7c5a49!important}
      tbody tr:hover{background:#fffaf5!important}

      .lbg-ui-collapse{border-color:#ecd7cb!important;background:#fffaf7!important;color:#7c5a49!important}
      .lbg-ui-collapse:hover{background:#fff1e7!important;color:#c2410c!important}
      #lbgUiMobileMenu{background:#f97316!important;box-shadow:0 14px 32px rgba(234,88,12,.30)!important}
      #lbgUiTop{color:#ea580c!important;border-color:#fed7aa!important}
      #lbgUiOverlay{background:rgba(67,20,7,.54)!important}

      #lbgMobileDock{border-color:#f1d8ca!important;background:rgba(255,253,251,.96)!important;box-shadow:0 16px 45px rgba(124,45,18,.18)!important}
      #lbgMobileDock button{color:#806557!important}
      #lbgMobileDock button:active,#lbgMobileDock button.active{background:#ffedd5!important;color:#c2410c!important}

      .lbg-auth-gate,.lbg-password-gate{
        background:radial-gradient(circle at 18% 12%,rgba(251,146,60,.30),transparent 28%),linear-gradient(140deg,#7c2d12,#c2410c 58%,#f97316 82%,#f59e0b)!important;
      }
      .lbg-login-box{border-color:rgba(255,255,255,.54)!important;box-shadow:0 28px 90px rgba(67,20,7,.30)!important}
      .lbg-login-box h2{color:#7c2d12!important}

      .lbg-code-link-toolbar{border-color:#fed7aa!important;background:#fff7ed!important}
      .lbg-code-link-toolbar .meta{color:#9a3412!important}
      .lbg-global-specialist{border-color:#fdba74!important;background:linear-gradient(135deg,#fff7ed,#fffdfb)!important}
      .lbg-global-specialist h4{color:#9a3412!important}
      .lbg-global-specialist-status.on{border-color:#86efac!important;background:#f0fdf4!important;color:#166534!important}
      .lbg-manager-role{border-color:#f1dfd4!important;background:#fffaf7!important}
      .lbg-manager-perm{border-color:#f0ddd2!important;background:#fffdfb!important}
      .lbg-manager-perm b{color:#7c2d12!important}
      .lbg-manager-group-toolbar{border-color:#fed7aa!important;background:#fff7ed!important}
      .lbg-manager-role-badge{background:#fff1e7!important;border-color:#fdba74!important;color:#c2410c!important}

      .lbg-cloud-tabs button.active{background:#f97316!important;color:#fff!important}
      .lbg-cloud-progress span{background:linear-gradient(90deg,#f97316,#f59e0b)!important}
      .lbg-cloud-card .badge{background:#fff1e7!important;color:#c2410c!important}

      .lbg-group-box{border-color:#f0ddd2!important;background:#fffdfb!important}
      .lbg-group-title h4{color:#7c2d12!important}
      .lbg-chip{background:#fff1e7!important;color:#c2410c!important}
      .lbg-member-list,.lbg-transfer-results{border-color:#f2e3da!important}
      .lbg-member-row,.lbg-transfer-result{border-bottom-color:#f7ebe4!important}

      #previewCard .wrap{background:linear-gradient(90deg,#fff3ea 0,#fff 16px,#fff calc(100% - 16px),#fff3ea 100%)!important}
      .lbg-r3-help{border-color:#fed7aa!important;background:#fff7ed!important;color:#9a3412!important}
      .lbg-r3-ga:focus{outline-color:#f97316!important;border-color:#f97316!important}
      .lbg-mobile-scroll-tip{background:#fff7ed!important;color:#9a6a50!important}

      /* Các trạng thái thông tin vẫn giữ ngữ nghĩa */
      .ok{background:#ecfdf5!important;color:#166534!important;border-color:#bbf7d0!important}
      .warn{background:#fff7ed!important;color:#9a3412!important;border-color:#fed7aa!important}
      .info{background:#eff6ff!important;color:#1e40af!important;border-color:#bfdbfe!important}
      .lbg-manager-safe{background:#fff7ed!important;color:#9a3412!important;border-color:#fed7aa!important}

      @media(max-width:760px){
        header.top{background:rgba(255,253,251,.97)!important}
        .lbg-userbar{background:rgba(255,249,245,.97)!important}
        #lbgWorkspaceIntro{background:linear-gradient(145deg,#9a3412,#ea580c 67%,#f59e0b 125%)!important}
      }
    `;
    document.head.appendChild(s);
    try{
      const meta=document.querySelector('meta[name="theme-color"]');
      if(meta)meta.setAttribute('content','#f97316');
    }catch{}
    document.documentElement.dataset.lbgTheme='orange';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
