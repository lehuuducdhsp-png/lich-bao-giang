'use strict';
(function(){
  function add(src,id){
    return new Promise((resolve,reject)=>{
      if(document.getElementById(id)){resolve();return}
      const s=document.createElement('script');
      s.id=id;s.src=src;s.async=false;s.onload=()=>resolve();s.onerror=()=>reject(new Error('Không tải được '+src));
      document.body.appendChild(s);
    });
  }
  function waitForAuth(){
    return new Promise((resolve,reject)=>{
      let tries=0;const timer=setInterval(()=>{tries++;if(window.LBGAuth){clearInterval(timer);resolve()}else if(tries>300){clearInterval(timer);reject(new Error('Hệ thống đăng nhập chưa sẵn sàng.'))}},100);
    });
  }

  window.LBG_PRODUCTION=true;
  add('light-orange-theme-v2.js?v=20260808.7','lbgLightOrangeThemeV2').catch(console.error);

  (async()=>{
    try{
      await waitForAuth();
      const modules=[
        ['branding-runtime-v2.js?v=20260805.2','lbgBrandingRuntimeV2'],
        ['access-control-v1.js?v=20260806.2','lbgAccessControlV1'],
        ['self-access-guarantee-v1.js?v=20260806.1','lbgSelfAccessGuaranteeV1'],
        ['teacher-select-refresh-v1.js?v=20260807.3','lbgTeacherSelectRefreshV1'],
        ['group-management-v1.js?v=20260804.2','lbgGroupManagementV1'],
        ['group-delete-v1.js?v=20260810.1','lbgGroupDeleteV1'],
        ['group-member-remove-v1.js?v=20260810.1','lbgGroupMemberRemoveV1'],
        ['checkin-admin-polish-v1.js?v=20260810.1','lbgCheckinAdminPolishV1'],
        ['checkin-permission-admin-v3.js?v=20260811.3','lbgCheckinPermissionAdminV3Script'],
        ['checkin-permission-leader-context-v1.js?v=20260811.1','lbgCheckinPermissionLeaderContextV1'],
        ['teacher-code-linking-v2.js?v=20260807.3','lbgTeacherCodeLinkingV2'],
        ['teacher-code-search-v1.js?v=20260811.1','lbgTeacherCodeSearchV1'],
        ['global-specialist-v1.js?v=20260808.1','lbgGlobalSpecialistV1'],
        ['manager-permissions-v1.js?v=20260808.2','lbgManagerPermissionsV1'],
        ['manager-cloud-bridge-v1.js?v=20260808.2','lbgManagerCloudBridgeV1'],
        ['branding-settings-v1.js?v=20260805.1','lbgBrandingSettingsV1'],
        ['branding-header-fix-v1.js?v=20260805.1','lbgBrandingHeaderFixV1'],
        ['ui-redesign-v1.js?v=20260806.1','lbgUiRedesignV1'],
        ['report-engine-v3.js?v=20260807.4','lbgReportEngineV3Script'],
        ['mobile-polish-v2.js?v=20260807.4','lbgMobilePolishV2'],
        ['ui-nav-dedupe-fix-v1.js?v=20260808.5','lbgUiNavDedupeFixV1'],
        ['dashboard-finish-v1.js?v=20260808.8','lbgDashboardFinishV1'],
        ['login-submit-hotfix-v1.js?v=20260808.10','lbgLoginSubmitHotfixV1'],
        ['password-change-hotfix-v1.js?v=20260810.2','lbgPasswordChangeHotfixV1'],
        ['checkin-history-order-v1.js?v=20260810.1','lbgCheckinHistoryOrderV1'],
        ['monthly-calendar-v3.js?v=20260808.12','lbgMonthlyCalendarV3Script'],
        ['final-visual-fix-v1.js?v=20260808.11','lbgFinalVisualFixV1Script'],
        ['section-order-fix-v1.js?v=20260808.13','lbgSectionOrderFixV1Script'],
        ['typography-polish-v1.js?v=20260808.14','lbgTypographyPolishV1Script'],
        ['monthly-teacher-search-v1.js?v=20260808.16','lbgMonthlyTeacherSearchV1Script'],
        ['role-privacy-polish-v1.js?v=20260814.2','lbgRolePrivacyPolishV1Script'],
        ['production-mode-v1.js?v=20260808.17','lbgProductionModeV1Script'],
        ['sidebar-compact-readable-v1.js?v=20260811.3','lbgSidebarCompactReadableV1'],
        ['readability-targeted-v2.js?v=20260811.1','lbgReadabilityTargetedV2'],
        ['checkin-daily-monitor-v1.js?v=20260812.1','lbgCheckinDailyMonitorV1'],
        ['checkin-member-window-v1.js?v=20260812.2','lbgCheckinMemberWindowV1'],
        ['checkin-tomorrow-report-v2.js?v=20260814.3','lbgCheckinTomorrowReportV2Script'],
        ['schedule-ack-flexible-access-v1.js?v=20260814.2','lbgScheduleAckFlexibleAccessV1Script'],
        ['schedule-ack-list-ux-v3.js?v=20260814.5','lbgScheduleAckListUxV3Script'],
        ['schedule-ack-permission-visual-v1.js?v=20260814.1','lbgScheduleAckPermissionVisualV1Script'],
        ['schedule-ack-history-v1.js?v=20260814.2','lbgScheduleAckHistoryV1Script'],
        ['schedule-ack-history-ux-fix-v1.js?v=20260814.1','lbgScheduleAckHistoryUxFixV1Script'],
        ['checkin-manual-detail-v1.js?v=20260813.1','lbgCheckinManualDetailV1'],
        ['admin-list-ux-v1.js?v=20260812.1','lbgAdminListUxV1'],
        ['checkin-monitor-compact-ux-v1.js?v=20260812.2','lbgCheckinMonitorCompactUxV1']
      ];
      for(const [src,id] of modules)await add(src,id);
    }catch(error){console.error('Không tải được đầy đủ mô-đun hệ thống:',error)}
  })();
})();