'use strict';
(function(){
  const VERSION='20261127.3';
  const seen=new Set();

  // Chỉ làm ấm đúng các script được index.html gọi trực tiếp.
  // Không thực thi module, không đọc/ghi dữ liệu người dùng, không prefetch bản cũ.
  const critical=[
    'app-runtime-v1.js?v=20261127.2',
    'patch-runtime-loader-v1.js?v=20261127.2'
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