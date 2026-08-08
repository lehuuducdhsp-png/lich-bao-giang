'use strict';
(function(){
  const STYLE_ID='lbgFinalVisualFixV1';
  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      /* ===== HEADER / LOGO ===== */
      header.top{
        min-height:78px!important;
        padding:9px 22px!important;
        background:rgba(255,253,251,.985)!important;
        border-bottom:1px solid #eadfd8!important;
        box-shadow:0 5px 18px rgba(100,64,44,.055)!important;
      }
      header.top .logo,
      header.top .logo.lbg-brand-logo-box,
      header.top .logo.lbg-brand-has-image,
      header.top .logo.lbg-brand-icon-fallback{
        width:60px!important;
        height:60px!important;
        min-width:60px!important;
        flex:0 0 60px!important;
        padding:4px!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
        border-radius:17px!important;
        border:1px solid #e8d9cf!important;
        background:#fff!important;
        box-shadow:0 8px 22px rgba(111,70,47,.11)!important;
      }
      header.top .logo img,
      header.top .logo.lbg-brand-logo-box img{
        display:block!important;
        width:100%!important;
        height:100%!important;
        max-width:none!important;
        max-height:none!important;
        object-fit:contain!important;
        object-position:center!important;
        border-radius:13px!important;
        background:#fff!important;
      }
      header.top h1{font-size:18px!important;line-height:1.18!important;letter-spacing:-.012em!important}
      header.top p{font-size:11.5px!important;margin-top:4px!important}
      .lbg-finish-test-badge{margin-left:9px!important;padding:4px 8px!important}

      .lbg-login-brand{
        min-height:108px!important;
        margin-bottom:15px!important;
      }
      .lbg-login-brand img,
      .lbg-login-brand.compact img{
        width:96px!important;
        height:96px!important;
        max-width:96px!important;
        max-height:96px!important;
        object-fit:contain!important;
        object-position:center!important;
        padding:5px!important;
        border:1px solid #e8d9cf!important;
        border-radius:22px!important;
        background:#fff!important;
        box-shadow:0 10px 26px rgba(111,70,47,.12)!important;
      }
      .lbg-login-brand-fallback{display:none!important}

      /* ===== BẢNG KÊ TIẾT DẠY THÁNG — PHONG CÁCH BIỂU MẪU CŨ ===== */
      #monthCardFixed{overflow:visible!important}
      #month2Preview{margin-top:14px!important}
      #month2Preview .mt-sheet{
        margin-top:0!important;
        border:1px solid #66727e!important;
        border-radius:0!important;
        background:#fff!important;
        box-shadow:none!important;
        font-family:"Times New Roman",Times,serif!important;
        overflow:visible!important;
      }
      #month2Preview .mt-title{
        padding:14px 10px 13px!important;
        background:#fff!important;
        border-bottom:1px solid #66727e!important;
        color:#49372f!important;
      }
      #month2Preview .mt-title h2{
        margin:0!important;
        font:700 23px/1.25 "Times New Roman",Times,serif!important;
        color:#49372f!important;
      }
      #month2Preview .mt-title h3{
        margin:7px 0 0!important;
        font:700 16px/1.2 "Times New Roman",Times,serif!important;
        color:#49372f!important;
      }
      #month2Preview .mt-scroll{
        overflow:auto!important;
        border:0!important;
        border-radius:0!important;
        background:#fff!important;
      }
      #month2Preview .mt-table{
        width:max-content!important;
        min-width:100%!important;
        border-collapse:collapse!important;
        border-spacing:0!important;
        table-layout:fixed!important;
        background:#fff!important;
        border:0!important;
        border-radius:0!important;
        box-shadow:none!important;
      }
      #month2Preview .mt-table th,
      #month2Preview .mt-table td{
        height:40px!important;
        padding:4px 5px!important;
        border:1px solid #66727e!important;
        border-radius:0!important;
        box-shadow:none!important;
        text-align:center!important;
        vertical-align:middle!important;
        white-space:nowrap!important;
        background:#fff!important;
        color:#332c29!important;
        font-family:"Times New Roman",Times,serif!important;
        font-size:12px!important;
      }
      #month2Preview .mt-table thead th{
        position:static!important;
        background:#fbf1e9!important;
        color:#5d4438!important;
        font-weight:700!important;
      }
      #month2Preview .mt-table .mt-week{
        color:#b42318!important;
        background:#fbf1e9!important;
        font-weight:700!important;
        height:47px!important;
      }
      #month2Preview .mt-table .mt-week small{
        display:block!important;
        margin-top:3px!important;
        font-size:9.5px!important;
        font-weight:600!important;
        color:#61738a!important;
      }
      #month2Preview .mt-table .mt-date{
        min-width:59px!important;
        width:59px!important;
        height:46px!important;
        background:#fbf1e9!important;
      }
      #month2Preview .mt-table .mt-date b{
        display:block!important;
        font-size:13px!important;
        line-height:1.05!important;
      }
      #month2Preview .mt-table .mt-date small{
        display:block!important;
        margin-top:4px!important;
        font-size:9.5px!important;
        color:#64748b!important;
      }
      #month2Preview .mt-table .mt-fixed-a{
        min-width:155px!important;
        width:155px!important;
        white-space:normal!important;
      }
      #month2Preview .mt-table .mt-fixed-b,
      #month2Preview .mt-table .mt-school{
        min-width:125px!important;
        width:125px!important;
        white-space:normal!important;
        font-weight:700!important;
      }
      #month2Preview .mt-table .mt-teacher{
        min-width:155px!important;
        width:155px!important;
        white-space:normal!important;
        font-weight:700!important;
      }
      #month2Preview .mt-table .mt-cell{
        min-width:59px!important;
        width:59px!important;
        height:44px!important;
        padding:0!important;
        background:#fff!important;
      }
      /* Bỏ hoàn toàn khung bo tròn nhỏ trong từng ô. */
      #month2Preview .mt-table input.mt-count{
        display:block!important;
        width:100%!important;
        height:43px!important;
        min-height:43px!important;
        margin:0!important;
        padding:0 3px!important;
        border:0!important;
        border-radius:0!important;
        outline:0!important;
        box-shadow:none!important;
        background:transparent!important;
        color:#1f2937!important;
        text-align:center!important;
        font:700 13px/43px "Times New Roman",Times,serif!important;
        appearance:textfield!important;
        -moz-appearance:textfield!important;
      }
      #month2Preview .mt-table input.mt-count::-webkit-outer-spin-button,
      #month2Preview .mt-table input.mt-count::-webkit-inner-spin-button{
        -webkit-appearance:none!important;
        margin:0!important;
      }
      #month2Preview .mt-table input.mt-count:hover,
      #month2Preview .mt-table input.mt-count:focus{
        border:0!important;
        border-radius:0!important;
        outline:0!important;
        box-shadow:inset 0 0 0 2px rgba(148,163,184,.16)!important;
        background:#fff!important;
      }
      #month2Preview .mt-table input.mt-count.changed{
        border:0!important;
        border-radius:0!important;
        background:#fff8ed!important;
        color:#b45309!important;
      }
      #month2Preview .mt-total-row td{
        min-height:42px!important;
        background:#fafafa!important;
        font-weight:700!important;
      }
      #month2Preview .mt-week-total{
        background:#fafafa!important;
        padding:5px!important;
      }
      #month2Preview .mt-week-total b{
        color:#334155!important;
        font-size:11px!important;
      }
      #month2Preview .mt-week-total label{
        display:inline-flex!important;
        align-items:center!important;
        gap:4px!important;
        margin-left:6px!important;
        font-size:10px!important;
        color:#64748b!important;
      }
      #month2Preview .mt-week-total input.mt-assist{
        width:42px!important;
        min-height:25px!important;
        height:25px!important;
        padding:0 3px!important;
        border:1px solid #a8b1ba!important;
        border-radius:0!important;
        box-shadow:none!important;
        background:#fff!important;
        text-align:center!important;
        font-family:"Times New Roman",Times,serif!important;
      }
      #month2Extras .mt-extra-grid{gap:12px!important;margin-top:14px!important}
      #month2Extras .mt-extra-box{
        border:1px solid #d2d8de!important;
        border-radius:4px!important;
        background:#fff!important;
        box-shadow:none!important;
      }
      #month2Extras .mt-extra-box h4{
        color:#b42318!important;
        font-family:"Times New Roman",Times,serif!important;
      }

      @media(max-width:620px){
        header.top{min-height:68px!important;padding:8px 12px!important}
        header.top .logo,
        header.top .logo.lbg-brand-logo-box,
        header.top .logo.lbg-brand-has-image,
        header.top .logo.lbg-brand-icon-fallback{
          width:52px!important;height:52px!important;min-width:52px!important;flex-basis:52px!important;border-radius:15px!important;
        }
        header.top h1{font-size:15.5px!important}
        #month2Preview .mt-title h2{font-size:19px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function syncLogo(){
    const box=document.querySelector('header.top .logo');
    if(!box)return;
    const img=box.querySelector('img');
    if(img){
      box.classList.add('lbg-brand-logo-box','lbg-brand-has-image');
      img.style.objectFit='contain';
      img.style.objectPosition='center';
    }
  }

  function cleanupMonthlyInputs(){
    document.querySelectorAll('#month2Preview input.mt-count').forEach(input=>{
      input.setAttribute('aria-label',`Số tiết ${input.dataset.date||''}`);
    });
  }

  injectStyle();
  syncLogo();
  cleanupMonthlyInputs();
  const observer=new MutationObserver(()=>{syncLogo();cleanupMonthlyInputs();});
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
})();
