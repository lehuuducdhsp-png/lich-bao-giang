'use strict';
(function(){
  const VERSION='20260814.1';
  const q=id=>document.getElementById(id);

  function style(){
    if(q('lbgAckPermissionVisualV1Css'))return;
    const s=document.createElement('style');
    s.id='lbgAckPermissionVisualV1Css';
    s.textContent=`
      /* Cân lại danh sách cấp quyền xác nhận lịch: dễ đọc hơn nhưng không làm hàng quá cao. */
      #lbgAckPermissionV2 .lbg-ack-perm-list{gap:9px!important}
      #lbgAckPermissionV2 .lbg-ack-perm-row{
        display:grid!important;
        grid-template-columns:minmax(260px,1fr) minmax(190px,230px)!important;
        align-items:center!important;
        gap:16px!important;
        min-height:66px!important;
        padding:11px 14px!important;
        border-radius:13px!important;
        background:#fff!important;
      }
      #lbgAckPermissionV2 .lbg-ack-perm-row>span:first-child{
        min-width:0!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
        gap:2px!important;
      }
      #lbgAppLayout main.shell #lbgAckPermissionV2 .lbg-ack-perm-row>span:first-child>b{
        display:block!important;
        margin:0!important;
        color:#5b3828!important;
        font:800 16.5px/1.3 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif!important;
        letter-spacing:0!important;
      }
      #lbgAppLayout main.shell #lbgAckPermissionV2 .lbg-ack-perm-row .lbg-checkin-meta{
        margin-top:1px!important;
        color:#8a7063!important;
        font:600 13px/1.35 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif!important;
      }
      #lbgAppLayout main.shell #lbgAckPermissionV2 .lbg-ack-perm-row>span:last-child{
        min-height:42px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:flex-start!important;
        gap:10px!important;
        padding-left:18px!important;
        border-left:1px solid #f1e4dc!important;
        color:#674737!important;
        font:700 15px/1.35 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif!important;
        white-space:nowrap!important;
      }
      #lbgAppLayout main.shell #lbgAckPermissionV2 .lbg-ack-perm-row input[type="checkbox"]{
        width:19px!important;
        height:19px!important;
        min-width:19px!important;
        margin:0!important;
        accent-color:#f4a261;
      }
      #lbgAckPermissionV2 .lbg-ack-perm-row:hover{
        border-color:#e8cbb8!important;
        box-shadow:0 3px 12px rgba(91,56,40,.045)!important;
      }
      @media(max-width:760px){
        #lbgAckPermissionV2 .lbg-ack-perm-row{grid-template-columns:1fr!important;gap:8px!important;padding:11px 12px!important}
        #lbgAppLayout main.shell #lbgAckPermissionV2 .lbg-ack-perm-row>span:last-child{min-height:auto!important;padding:8px 0 0!important;border-left:0!important;border-top:1px solid #f1e4dc!important;white-space:normal!important}
      }
    `;
    document.head.appendChild(s);
  }

  function start(){style()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.LBGScheduleAckPermissionVisualV1={version:VERSION,refresh:style};
})();
