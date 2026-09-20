'use strict';
const fs=require('fs');
const assert=require('node:assert/strict');

const runtime=fs.readFileSync('app-runtime-v1.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const patches=fs.readFileSync('patch-runtime-loader-v1.js','utf8');

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
function patchNames(blockName){
  const m=patches.match(new RegExp(`const ${blockName}=\\[([\\s\\S]*?)\\n  \\];`));
  assert.ok(m,`${blockName} list must exist`);
  return [...m[1].matchAll(/\['([^']+\.js\?v=[^']+)'\s*,\s*'[^']+'\]/g)].map(x=>x[1]);
}
const expectedCorePatches=[
  'tkb-class-typo-fix-v1.js?v=20260913.2',
  'class-typo-report-path-safe-v1.js?v=20260916.1',
  'tkb-roster-group-period-safe-v1.js?v=20260919.1',
  'tkb-assignment-cache-safe-v1.js?v=20260913.1',
  'grouped-plus-report-safe-v1.js?v=20260919.1',
  'ga-per-class-history-safe-v1.js?v=20260913.1',
  'ga-group-split-history-safe-v1.js?v=20260920.1',
  'ga-group-split-stale-repair-v1.js?v=20260920.1',
  'ga-role-track-stale-repair-v1.js?v=20260920.4'
];
const expectedRuntimePatches=[
  'ga-suggestion-multi-apply-v1.js?v=20260920.3',
  'ga-per-class-v2.js?v=20260920.5',
  'ga-multi-selection-bridge-v1.js?v=20260914.2',
  'sheets-ga-save-safe-v1.js?v=20260913.1',
  'report-branding-v1.js?v=20260909.1',
  'assist-p-preview-safe-v1.js?v=20260918.1',
  'assist-p-summary-monthly-safe-v1.js?v=20260912.1',
  'assist-p-web-footer-safe-v1.js?v=20260912.1',
  'multi-preview-assist-sync-v1.js?v=20260914.1',
  'assist-p-excel-export-parity-v1.js?v=20260918.1',
  'assist-p-export-safe-v1.js?v=20260912.1',
  'school-report-v1.js?v=20260914.3',
  'assist-p-sheets-label-safe-v1.js?v=20260912.3',
  'assist-p-sheets-location-safe-v1.js?v=20260912.1',
  'monthly-excel-polish-safe-v1.js?v=20260912.1'
];
assert.deepEqual(patchNames('CORE_PATCHES'),expectedCorePatches,'core patches must preserve exact business order');
assert.deepEqual(patchNames('RUNTIME_PATCHES'),expectedRuntimePatches,'runtime patches must preserve exact UI/report order');
assert.match(index,/app-runtime-v1\.js\?v=20260920\.2/);
assert.match(index,/patch-runtime-loader-v1\.js\?v=20260920\.1/);
assert.doesNotMatch(index,/ga-per-class-v2\.js\?v=/,'patches must not race app-runtime during bootstrap');
assert.match(runtime,/lbg-report-core-ready/,'runtime must expose a report-core lifecycle event');
assert.match(patches,/lbg-report-core-ready/,'patch loader must wait for report core');
assert.match(patches,/lbg-runtime-ready/,'UI patches must wait for full runtime');
assert.match(patches,/await loadCore\(\)/,'runtime patches must await core patches');
assert.match(patches,/if\(corePromise\)return corePromise/,'concurrent core requests must share one promise');
assert.match(patches,/if\(runtimePromise\)return runtimePromise/,'concurrent runtime requests must share one promise');
assert.doesNotMatch(patches,/setInterval\s*\(/,'patch loader must be lifecycle-driven, not poll continuously');
assert.doesNotMatch(patches,/\bindexedDB\b|\blocalStorage\b|document\.cookie/,'loader refactor must not touch stored user data');
assert.ok(expectedRuntimePatches.indexOf('ga-per-class-v2.js?v=20260920.5')<expectedRuntimePatches.indexOf('ga-multi-selection-bridge-v1.js?v=20260914.2'),'per-class GA must load before shared bridge');
assert.ok(expectedCorePatches.indexOf('ga-group-split-stale-repair-v1.js?v=20260920.1')<expectedCorePatches.indexOf('ga-role-track-stale-repair-v1.js?v=20260920.4'),'role-track repair must load after group-split repair');

console.log(`OK responsive loader: ${expectedCore.length} report-core + ${expectedModules.length} modules + staged patches preserve exact execution order`);
