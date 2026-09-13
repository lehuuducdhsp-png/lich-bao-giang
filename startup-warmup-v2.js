'use strict';
(function(){
  const VERSION='20260913.1';
  const seen=new Set();

  // Chỉ làm ấm tài nguyên. Không thực thi module, không đọc/ghi dữ liệu người dùng.
  const critical=[
    'app-runtime-v1.js?v=20260909.4',
    'ga-suggestion-multi-apply-v1.js?v=20260912.1',
    'ga-per-class-v2.js?v=20260912.2',
    'report-branding-v1.js?v=20260909.1',
    'assist-p-preview-safe-v1.js?v=20260911.1',
    'assist-p-summary-monthly-safe-v1.js?v=20260912.1',
    'assist-p-web-footer-safe-v1.js?v=20260912.1',
    'assist-p-export-safe-v1.js?v=20260912.1',
    'assist-p-sheets-label-safe-v1.js?v=20260912.3',
    'assist-p-sheets-location-safe-v1.js?v=20260912.1',
    'monthly-excel-polish-safe-v1.js?v=20260912.1'
  ];

  const next=[
    'light-orange-theme-v2.js?v=20260808.7',
    'school-year-week1-official-v1.js?v=20260903.1',
    'login-submit-hotfix-v1.js?v=20260808.10',
    'password-change-hotfix-v1.js?v=20260810.2',
    'tkb-parser-v2.js?v=20260906.2',
    'tkb-parser-school-name-fix-v1.js?v=20260906.1',
    'tkb-atomic-teaching-v1.js?v=20260906.1',
    'tkb-parser-bridge-v2.js?v=20260906.3',
    'teaching-plan-progress-v1.js?v=20260909.1',
    'conflict-check-v8.js?v=20260909.1',
    'ga-suggestion-v7.js?v=20260909.2',
    'ga-suggestion-cross-version-v1.js?v=20260912.4',
    'sheets-sync-security-v1.js?v=20260909.2',
    'branding-runtime-v2.js?v=20260805.2',
    'access-control-v1.js?v=20260806.2',
    'self-access-guarantee-v1.js?v=20260806.1',
    'teacher-select-refresh-v1.js?v=20260807.3',
    'report-pay-rules-v1.js?v=20260908.1',
    'report-engine-v4.js?v=20260908.1',
    'production-mode-v1.js?v=20260909.4'
  ];

  function hint(rel,href,as){
    if(!href||seen.has(`${rel}|${href}`))return;
    seen.add(`${rel}|${href}`);
    if(document.querySelector(`link[rel="${rel}"][href="${href}"]`))return;
    const link=document.createElement('link');
    link.rel=rel;
    link.href=href;
    if(as)link.as=as;
    document.head.appendChild(link);
  }

  // Nhóm nhỏ các file nằm trực tiếp trên đường dựng trang: preload sớm.
  for(const href of critical)hint('preload',href,'script');

  // Nhóm kế tiếp chỉ prefetch ở ưu tiên thấp để không tranh băng thông với đăng nhập/UI.
  const warmNext=()=>{
    for(const href of next)hint('prefetch',href,'script');
    window.LBG_STARTUP_WARMUP={version:VERSION,critical:critical.length,prefetch:next.length};
  };
  if(typeof requestIdleCallback==='function')requestIdleCallback(warmNext,{timeout:900});
  else setTimeout(warmNext,450);
})();
