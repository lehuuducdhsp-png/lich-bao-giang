'use strict';
(function(){
  window.LBG_PRODUCTION=true;
  document.documentElement.dataset.lbgProduction='1';
  document.title='Lập Lịch Báo giảng';

  if(!document.getElementById('lbgProductionModeCss')){
    const s=document.createElement('style');
    s.id='lbgProductionModeCss';
    s.textContent='.lbg-finish-test-badge{display:none!important}';
    document.head.appendChild(s);
  }

  if(!document.getElementById('lbgTempPasswordPolicyV1Script')){
    const s=document.createElement('script');
    s.id='lbgTempPasswordPolicyV1Script';
    s.src='temp-password-policy-v1.js?v=20260907.2';
    s.async=false;
    s.onerror=()=>console.error('Không tải được chính sách mật khẩu tạm giáo viên.');
    document.body.appendChild(s);
  }

  if(!document.getElementById('lbgReportGroupPickerV1Script')){
    const s=document.createElement('script');
    s.id='lbgReportGroupPickerV1Script';
    s.src='report-group-picker-v1.js?v=20260907.1';
    s.async=false;
    s.onerror=()=>console.error('Không tải được bộ chọn khối / nhóm của báo giảng.');
    document.body.appendChild(s);
  }

  if(!document.getElementById('lbgGaSuggestionV7Script')){
    const s=document.createElement('script');
    s.id='lbgGaSuggestionV7Script';
    s.src='ga-suggestion-v7.js?v=20260909.1';
    s.async=false;
    s.onerror=()=>console.error('Không tải được bộ phân tích giáo án V7.');
    document.body.appendChild(s);
  }

  if(!document.getElementById('lbgReportAtomicDisplayV1Script')){
    const s=document.createElement('script');
    s.id='lbgReportAtomicDisplayV1Script';
    s.src='report-atomic-display-v1.js?v=20260909.3';
    s.async=false;
    s.onerror=()=>console.error('Không tải được cách hiển thị tiết theo từng ô mã nguồn.');
    document.body.appendChild(s);
  }

  function loadReportExport(){
    if(document.getElementById('lbgReportExportHotfixV3Script'))return;
    document.getElementById('lbgReportExportHotfixV2Script')?.remove();
    const s=document.createElement('script');
    s.id='lbgReportExportHotfixV3Script';
    s.src='report-export-hotfix-v3.js?v=20260911.3';
    s.async=false;
    s.onerror=()=>console.error('Không tải được bản sửa xuất Excel báo giảng V3.');
    document.body.appendChild(s);
  }
  if(window.LBG_HOAN_NANG_LOGO_JPEG){
    loadReportExport();
  }else if(!document.getElementById('lbgReportLogoDataV1Script')){
    const s=document.createElement('script');
    s.id='lbgReportLogoDataV1Script';
    s.src='report-logo-data-v1.js?v=20260909.1';
    s.async=false;
    s.onload=loadReportExport;
    s.onerror=()=>console.error('Không tải được dữ liệu logo Hoàn Năng cho Excel.');
    document.body.appendChild(s);
  }else{
    const t=setInterval(()=>{if(window.LBG_HOAN_NANG_LOGO_JPEG){clearInterval(t);loadReportExport()}},50);
    setTimeout(()=>clearInterval(t),5000);
  }

  function applyProductionFooter(){
    const footer=document.querySelector('footer');
    if(!footer||footer.dataset.productionText)return Boolean(footer);
    footer.dataset.productionText='1';
    footer.textContent='Hệ thống Lịch Báo giảng • Dữ liệu được xử lý và lưu theo cấu hình của hệ thống';
    return true;
  }

  applyProductionFooter();
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',applyProductionFooter,{once:true});
  }else if(typeof window.requestIdleCallback==='function'){
    window.requestIdleCallback(applyProductionFooter,{timeout:500});
  }else{
    setTimeout(applyProductionFooter,0);
  }
})();
