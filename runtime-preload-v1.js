'use strict';
(function(){
  // Chỉ làm ấm tài nguyên; thứ tự THỰC THI vẫn do app-runtime-v1.js kiểm soát tuần tự.
  const resources=[
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
    'sheets-sync-security-v1.js?v=20260909.2',
    'sheets-classraw-hotfix-v1.js?v=20260907.1',
    'branding-runtime-v2.js?v=20260805.2',
    'access-control-v1.js?v=20260806.2',
    'self-access-guarantee-v1.js?v=20260806.1',
    'teacher-select-refresh-v1.js?v=20260807.3',
    'group-management-v1.js?v=20260804.2',
    'report-group-picker-v1.js?v=20260907.3',
    'group-delete-v1.js?v=20260810.1',
    'group-member-remove-v1.js?v=20260810.1',
    'checkin-admin-polish-v1.js?v=20260815.1',
    'checkin-permission-admin-v3.js?v=20260811.3',
    'checkin-permission-leader-context-v1.js?v=20260811.1',
    'teacher-code-linking-v2.js?v=20260807.3',
    'teacher-code-search-v1.js?v=20260811.1',
    'global-specialist-v1.js?v=20260808.1',
    'manager-permissions-v1.js?v=20260808.2',
    'manager-cloud-bridge-v1.js?v=20260808.2',
    'branding-settings-v1.js?v=20260805.1',
    'branding-header-fix-v1.js?v=20260805.1',
    'ui-redesign-v1.js?v=20260806.1',
    'report-pay-rules-v1.js?v=20260908.1',
    'report-engine-v4.js?v=20260908.1',
    'sheets-ga-sync-compat-v1.js?v=20260906.1',
    'week-number-guard-v2.js?v=20260903.2',
    'mobile-polish-v2.js?v=20260807.4',
    'ui-nav-dedupe-fix-v1.js?v=20260808.5',
    'dashboard-finish-v1.js?v=20260808.8',
    'checkin-history-order-v1.js?v=20260810.1',
    'monthly-calendar-v3.js?v=20260908.1',
    'final-visual-fix-v1.js?v=20260808.11',
    'section-order-fix-v1.js?v=20260808.13',
    'typography-polish-v1.js?v=20260808.14',
    'monthly-teacher-search-v1.js?v=20260808.16',
    'role-privacy-polish-v1.js?v=20260814.2',
    'production-mode-v1.js?v=20260909.4',
    'sidebar-compact-readable-v1.js?v=20260811.3',
    'readability-targeted-v2.js?v=20260811.1',
    'checkin-daily-monitor-v1.js?v=20260812.1',
    'checkin-member-window-v1.js?v=20260812.2',
    'checkin-tomorrow-report-v2.js?v=20260814.3',
    'checkin-tomorrow-order-v1.js?v=20260906.1',
    'schedule-ack-flexible-access-v1.js?v=20260814.2',
    'schedule-ack-list-ux-v3.js?v=20260814.5',
    'schedule-ack-permission-visual-v1.js?v=20260814.1',
    'schedule-ack-history-sort-v1.js?v=20260904.1',
    'schedule-ack-history-v1.js?v=20260814.2',
    'schedule-ack-history-ux-fix-v1.js?v=20260904.1',
    'checkin-manager-review-ux-v2.js?v=20260904.1',
    'checkin-manual-detail-v1.js?v=20260813.1',
    'admin-list-ux-v1.js?v=20260812.1',
    'checkin-monitor-compact-ux-v1.js?v=20260904.1',
    'ga-input-visual-fix-v1.js?v=20260903.1',
    'kns-lesson-detail-v2.js?v=20260909.1',
    'report-branding-v1.js?v=20260909.1'
  ];

  function preconnect(href,crossOrigin){
    if(document.querySelector(`link[rel="preconnect"][href="${href}"]`))return;
    const link=document.createElement('link');
    link.rel='preconnect';
    link.href=href;
    if(crossOrigin)link.crossOrigin='anonymous';
    document.head.appendChild(link);
  }

  preconnect('https://gmkibmybqfomypytmjxw.supabase.co',true);
  preconnect('https://cdn.jsdelivr.net',true);

  const fragment=document.createDocumentFragment();
  for(const href of resources){
    const link=document.createElement('link');
    link.rel='preload';
    link.as='script';
    link.href=href;
    fragment.appendChild(link);
  }
  document.head.appendChild(fragment);
  window.LBG_RUNTIME_PRELOAD_COUNT=resources.length;
})();
