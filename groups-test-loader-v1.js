'use strict';
(function(){
  let tries=0;
  function add(src,id,onload){
    if(document.getElementById(id)){onload?.();return}
    const s=document.createElement('script');s.id=id;s.src=src;s.async=false;if(onload)s.onload=onload;document.body.appendChild(s);
  }
  const timer=setInterval(()=>{
    tries++;
    if(window.LBGAuth){
      clearInterval(timer);
      add('branding-runtime-v2.js?v=20260805.2','lbgBrandingRuntimeV2');
      add('access-control-v1.js?v=20260804.2','lbgAccessControlV1',()=>{
        add('self-access-guarantee-v1.js?v=20260806.1','lbgSelfAccessGuaranteeV1',()=>{
          add('group-management-v1.js?v=20260804.2','lbgGroupManagementV1',()=>{
            add('group-auto-map-v1.js?v=20260804.2','lbgGroupAutoMapV1',()=>{
              add('branding-settings-v1.js?v=20260805.1','lbgBrandingSettingsV1',()=>{
                add('branding-header-fix-v1.js?v=20260805.1','lbgBrandingHeaderFixV1',()=>{
                  add('ui-redesign-v1.js?v=20260806.1','lbgUiRedesignV1');
                });
              });
            });
          });
        });
      });
    }else if(tries>300){
      clearInterval(timer);
      console.error('Không tải được mô-đun kiểm thử vì hệ thống đăng nhập chưa sẵn sàng.');
    }
  },100);
})();
