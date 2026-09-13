'use strict';
(function(){
  const VERSION='20260913.2';
  const seen=new Set();

  // Chỉ làm ấm đúng các script được index.html gọi trực tiếp.
  // Không thực thi module, không đọc/ghi dữ liệu người dùng, không prefetch bản cũ.
  const critical=[
    'app-runtime-v1.js?v=20260913.1',
    'tkb-class-typo-fix-v1.js?v=20260913.2',
    'ga-suggestion-multi-apply-v1.js?v=20260912.1',
    'ga-per-class-v2.js?v=20260912.2',
    'ga-per-class-history-safe-v1.js?v=20260913.1',
    'sheets-ga-save-safe-v1.js?v=20260913.1',
    'report-branding-v1.js?v=20260909.1',
    'assist-p-preview-safe-v1.js?v=20260913.5',
    'assist-p-summary-monthly-safe-v1.js?v=20260912.1',
    'assist-p-web-footer-safe-v1.js?v=20260912.1',
    'assist-p-export-safe-v1.js?v=20260912.1',
    'assist-p-sheets-label-safe-v1.js?v=20260912.3',
    'assist-p-sheets-location-safe-v1.js?v=20260912.1',
    'monthly-excel-polish-safe-v1.js?v=20260912.1'
  ];

  function hint(href){
    if(!href||seen.has(href))return;
    seen.add(href);
    try{
      if(document.querySelector(`link[rel="preload"][href="${href}"]`))return;
      const link=document.createElement('link');
      link.rel='preload';link.as='script';link.href=href;
      document.head.appendChild(link);
    }catch{}
  }

  for(const href of critical)hint(href);
  window.LBG_STARTUP_WARMUP={version:VERSION,critical:critical.length,stalePrefetch:false};
})();