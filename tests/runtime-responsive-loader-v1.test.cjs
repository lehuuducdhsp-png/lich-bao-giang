'use strict';
const fs=require('fs');
const assert=require('node:assert/strict');

const runtime=fs.readFileSync('app-runtime-v1.js','utf8');
const index=fs.readFileSync('index.html','utf8');

function scriptNames(blockName){
  const m=runtime.match(new RegExp(`const ${blockName}=\\[([\\s\\S]*?)\\n      \\];`));
  assert.ok(m,`${blockName} list must exist`);
  return [...m[1].matchAll(/\['([^']+\.js\?v=[^']+)'\s*,\s*'[^']+'\]/g)].map(x=>x[1]);
}

const expectedCore=[
  'tkb-parser-v2.js?v=20260906.2',
  'tkb-parser-school-name-fix-v1.js?v=20260906.1',
  'tkb-atomic-teaching-v1.js?v=20260906.1',
  'tkb-parser-bridge-v2.js?v=20260906.3',
  'teaching-plan-progress-v1.js?v=20260909.1',
  'conflict-check-v8.js?v=20260909.1',
  'ga-suggestion-v7.js?v=20260920.1',
  'ga-suggestion-cross-version-v1.js?v=20260912.4'
];

const expectedModules=[
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
  'kns-lesson-detail-v2.js?v=20260909.1'
];

assert.deepEqual(scriptNames('reportCore'),expectedCore,'report/GA dependency order must remain unchanged');
assert.deepEqual(scriptNames('modules'),expectedModules,'all legacy runtime modules must execute in the exact old order');
assert.match(runtime,/s\.async=false/,'application modules must keep classic sequential execution');
assert.match(runtime,/await add\(src,id\)/,'loader must await each module before executing the next');
assert.doesNotMatch(runtime,/Promise\.all\s*\(/,'performance optimization must not parallel-execute modules');
assert.match(runtime,/preloadWindow\(items,i,lookahead\)/,'only network warming may run ahead');
assert.match(runtime,/await yieldToBrowser\(\)/,'loader must yield between bounded groups to reduce UI jank');
assert.doesNotMatch(runtime,/\bindexedDB\b|\blocalStorage\b|document\.cookie/,'runtime optimization must not touch stored user data');
assert.match(index,/tkb-class-typo-fix-v1\.js\?v=20260913\.2/,'class typo fix must stay loaded');
assert.match(index,/tkb-roster-group-period-safe-v1\.js\?v=20260919\.1/,'new roster group period safety must stay loaded');
assert.ok(index.indexOf('tkb-roster-group-period-safe-v1.js?v=20260919.1')<index.indexOf('tkb-assignment-cache-safe-v1.js?v=20260913.1'),'roster group period safety must load before assignment cache');
assert.match(index,/grouped-plus-report-safe-v1\.js\?v=20260919\.1/,'grouped plus report bridge must stay loaded');
assert.ok(index.indexOf('tkb-assignment-cache-safe-v1.js?v=20260913.1')<index.indexOf('grouped-plus-report-safe-v1.js?v=20260919.1'),'grouped plus bridge must load after assignment cache');
assert.ok(index.indexOf('grouped-plus-report-safe-v1.js?v=20260919.1')<index.indexOf('ga-per-class-v2.js?v=20260920.3'),'grouped plus bridge must load before production per-class GA');
assert.match(index,/ga-per-class-v2\.js\?v=20260920\.3/,'per-class GA must stay loaded');
assert.match(index,/ga-per-class-history-safe-v1\.js\?v=20260913\.1/,'Khánh Thi GA history fix must stay loaded');
assert.match(index,/ga-role-track-stale-repair-v1\.js\?v=20260920\.1/,'STEM/KNS stale GA repair must stay loaded');
assert.ok(index.indexOf('ga-group-split-stale-repair-v1.js?v=20260914.1')<index.indexOf('ga-role-track-stale-repair-v1.js?v=20260920.1'),'role-track repair must run after group-split stale repair');
assert.ok(index.indexOf('ga-role-track-stale-repair-v1.js?v=20260920.1')<index.indexOf('ga-multi-selection-bridge-v1.js?v=20260914.2'),'role-track repair must run before shared GA bridge');
assert.match(index,/sheets-ga-save-safe-v1\.js\?v=20260913\.1/,'Sheets GA fix must stay loaded');
assert.match(index,/assist-p-preview-safe-v1\.js\?v=20260918\.1/,'assistant P class fix must stay loaded');

console.log(`OK responsive loader: ${expectedCore.length} report-core + ${expectedModules.length} modules preserve exact execution order`);
