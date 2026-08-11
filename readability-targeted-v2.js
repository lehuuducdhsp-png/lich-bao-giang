'use strict';
(function(){
  const ID='lbgReadabilityTargetedV2Css';
  const VERSION='20260811.1';

  function mount(){
    document.documentElement.dataset.lbgReadabilityV2='1';
    let s=document.getElementById(ID);
    if(!s){
      s=document.createElement('style');
      s.id=ID;
      s.textContent=`
        /* Vòng tinh chỉnh 2: nhắm đúng các chữ còn nhỏ trong bảng/quyền/phiên bản TKB. */
        @media(min-width:1181px){
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) thead th,
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) thead th *{
            font-size:14.5px!important;
            line-height:1.45!important;
            font-weight:800!important;
          }

          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) tbody td{
            font-size:15.5px!important;
            line-height:1.55!important;
          }
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) tbody td>b,
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) tbody td>strong{
            font-size:16px!important;
            line-height:1.5!important;
          }
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) tbody td>span:not(.badge),
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) tbody td>div:not(.actions):not(.lbg-actions),
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) tbody td>small{
            font-size:15px!important;
            line-height:1.5!important;
          }
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) tbody td .meta,
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) tbody td .mini{
            font-size:13.5px!important;
            line-height:1.45!important;
          }
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) .badge,
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) [class*='status'],
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) [class*='role']{
            font-size:14.5px!important;
            line-height:1.4!important;
          }

          /* Quản lý quyền Check-in: component tự sinh CSS sau khi app chạy nên tăng specificity riêng. */
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-table thead th,
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-table thead th *{
            font-size:14.5px!important;
            line-height:1.45!important;
            font-weight:800!important;
          }
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-table tbody td{
            font-size:15.5px!important;
            line-height:1.55!important;
          }
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-table tbody td>b{
            font-size:16px!important;
          }
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-sub,
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-meta{
            font-size:13.5px!important;
            line-height:1.5!important;
          }
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-tools label{
            font-size:14.5px!important;
          }
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-tools select,
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-tools input,
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-table input[type=text]{
            font-size:15px!important;
          }

          /* Các bảng phiên bản TKB và tài khoản có nhiều text trực tiếp trong ô. */
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell .ver,
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell .ver b{
            font-size:15.5px!important;
            line-height:1.5!important;
          }
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell .ver .meta{
            font-size:13.5px!important;
          }

          /* Giữ các nút thao tác cân đối, không phóng icon quá mức. */
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) .btn,
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) button{
            font-size:14px!important;
            line-height:1.35!important;
          }
        }

        @media(max-width:1180px){
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) thead th{font-size:13px!important}
          html[data-lbg-readability-v2='1'] #lbgAppLayout main.shell table:not(.report) tbody td{font-size:14px!important}
          html[data-lbg-readability-v2='1'] body #lbgCheckinPermissionAdminV3 .lbg-p3-table tbody td{font-size:14px!important}
        }
      `;
      document.head.appendChild(s);
    }else if(s!==document.head.lastElementChild){
      document.head.appendChild(s);
    }
  }

  mount();
  let queued=false;
  const headObserver=new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;mount()});
  });
  headObserver.observe(document.head,{childList:true});
  document.addEventListener('lbg-access-ready',mount);
  window.addEventListener('focus',mount);
  window.addEventListener('beforeunload',()=>headObserver.disconnect(),{once:true});
  window.LBGReadabilityTargetedV2={version:VERSION};
})();
