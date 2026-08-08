'use strict';
(function(){
  const VERSION='20260808.14';
  const id='lbgTypographyPolishV1Css';
  if(document.getElementById(id))return;

  const style=document.createElement('style');
  style.id=id;
  style.textContent=`
    /* Typography pass 20260808.14 — tăng khả năng đọc, không phóng to biểu mẫu báo giảng chính thức. */
    body{font-size:15px!important;line-height:1.58!important}

    header.top h1{font-size:18px!important}
    header.top p{font-size:12px!important;line-height:1.45!important}
    .lbg-userchip{font-size:12px!important}

    .lbg-ui-side-head b{font-size:15px!important}
    .lbg-ui-side-head span{font-size:11px!important}
    .lbg-ui-nav-label{font-size:10px!important;letter-spacing:.11em!important}
    .lbg-ui-nav-link{font-size:12px!important;line-height:1.35!important}
    .lbg-ui-side-actions button{font-size:11px!important}

    .lbg-ui-intro-kicker{font-size:10px!important}
    .lbg-ui-intro-title{font-size:21px!important}
    .lbg-ui-intro-sub{font-size:12px!important;line-height:1.5!important}
    .lbg-ui-status-chip{font-size:10.5px!important}
    .lbg-ui-quick button{font-size:11.5px!important;line-height:1.35!important}

    main.shell>.hero h2{font-size:19px!important}
    main.shell>.hero p{font-size:12.5px!important;line-height:1.55!important}
    .privacy{font-size:13px!important}.privacy small{font-size:11px!important}

    .head h3,.lbg-ui-section>.head h3{font-size:17px!important;line-height:1.3!important}
    .head h2,.lbg-ui-section>.head h2{line-height:1.3!important}
    .head p,.lbg-ui-section>.head p{font-size:12px!important;line-height:1.55!important}
    .lbg-ui-collapse{font-size:11px!important}
    .badge{font-size:10.5px!important;line-height:1.25!important}

    .controls label,.row label,.lbg-scope-controls label{font-size:11.5px!important;line-height:1.4!important}
    input,select,textarea{font-size:13px!important;line-height:1.4!important}
    .btn{font-size:13px!important;line-height:1.25!important}
    .mini{font-size:10.5px!important}

    .notice,.alert,.lbg-access-note{font-size:11.5px!important;line-height:1.6!important}
    .meta{font-size:10.5px!important;line-height:1.45!important}
    .empty{font-size:12px!important;line-height:1.55!important}
    .ver b{font-size:12.5px!important}.ver .meta{font-size:10.5px!important}
    .sum b{font-size:18px!important}.sum span{font-size:10.5px!important;line-height:1.35!important}

    /* Bảng dữ liệu thông thường: tăng nhẹ; riêng bảng kê tháng giữ mật độ để 31 ngày không bị quá rộng. */
    main.shell .lbg-ui-section:not(#monthCardFixed) table:not(.report) th{font-size:10.5px!important;line-height:1.35!important}
    main.shell .lbg-ui-section:not(#monthCardFixed) table:not(.report) td{font-size:11.5px!important;line-height:1.45!important}
    #monthCardFixed table:not(.report) th{font-size:9.8px!important;line-height:1.3!important}
    #monthCardFixed table:not(.report) td{font-size:10.8px!important;line-height:1.4!important}

    /* Biểu mẫu Lịch Báo giảng chính thức: không thay đổi font bên trong bảng/phiếu. */
    #previewCard .sheet,#previewCard .report,#previewCard .report th,#previewCard .report td,
    #detailCard .sheet,#detailCard .report,#detailCard .report th,#detailCard .report td{font-size:inherit}

    @media(max-width:760px){
      body{font-size:14.5px!important}
      header.top h1{font-size:17px!important}header.top p{font-size:11px!important}
      .lbg-ui-nav-link{font-size:12px!important}.lbg-ui-nav-label{font-size:10px!important}
      .lbg-ui-intro-title{font-size:19px!important}.lbg-ui-intro-sub{font-size:11.5px!important}
      .head h3,.lbg-ui-section>.head h3{font-size:16px!important}
      .head p,.lbg-ui-section>.head p{font-size:11.5px!important}
      .controls label,.row label,.lbg-scope-controls label{font-size:11px!important}
      input,select,textarea,.btn{font-size:12.5px!important}
      .notice,.alert,.lbg-access-note{font-size:11px!important}
      main.shell .lbg-ui-section:not(#monthCardFixed) table:not(.report) th{font-size:10px!important}
      main.shell .lbg-ui-section:not(#monthCardFixed) table:not(.report) td{font-size:11px!important}
    }
  `;
  document.head.appendChild(style);
  window.LBGTypographyPolish={version:VERSION};
})();
