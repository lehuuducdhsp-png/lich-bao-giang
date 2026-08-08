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
      add('access-control-v1.js?v=20260806.2','lbgAccessControlV1',()=>{
        add('self-access-guarantee-v1.js?v=20260806.1','lbgSelfAccessGuaranteeV1',()=>{
          add('teacher-select-refresh-v1.js?v=20260807.3','lbgTeacherSelectRefreshV1',()=>{
            add('group-management-v1.js?v=20260804.2','lbgGroupManagementV1',()=>{
              add('teacher-code-linking-v2.js?v=20260807.3','lbgTeacherCodeLinkingV2',()=>{
                add('global-specialist-v1.js?v=20260808.1','lbgGlobalSpecialistV1',()=>{
                  add('manager-permissions-v1.js?v=20260808.2','lbgManagerPermissionsV1',()=>{
                    add('manager-cloud-bridge-v1.js?v=20260808.2','lbgManagerCloudBridgeV1',()=>{
                      add('branding-settings-v1.js?v=20260805.1','lbgBrandingSettingsV1',()=>{
                        add('branding-header-fix-v1.js?v=20260805.1','lbgBrandingHeaderFixV1',()=>{
                          add('ui-redesign-v1.js?v=20260806.1','lbgUiRedesignV1',()=>{
                            add('report-engine-v3.js?v=20260807.4','lbgReportEngineV3Script',()=>{
                              add('mobile-polish-v2.js?v=20260807.4','lbgMobilePolishV2',()=>{
                                add('light-orange-theme-v2.js?v=20260808.4','lbgLightOrangeThemeV2',()=>{
                                  add('ui-nav-dedupe-fix-v1.js?v=20260808.5','lbgUiNavDedupeFixV1');
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
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
