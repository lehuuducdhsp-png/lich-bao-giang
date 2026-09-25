'use strict';
const fs=require('fs');
const assert=require('assert');

const production=fs.readFileSync('production-mode-v1.js','utf8');
const runtime=fs.readFileSync('app-runtime-v1.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.doesNotMatch(production,/new\s+MutationObserver\s*\(/,'production mode must not observe the whole page');
assert.doesNotMatch(production,/observer\.observe\s*\(\s*document\.body/,'document.body subtree observer must stay removed');
assert.doesNotMatch(production,/querySelectorAll\s*\(\s*['"]\.lbg-finish-test-badge/,'badge hiding should remain CSS-only');
assert.match(production,/\.lbg-finish-test-badge\{display:none!important\}/,'production badge must still be hidden');
assert.match(production,/function\s+applyProductionFooter\s*\(/,'footer polish should remain finite and targeted');
assert.match(production,/requestIdleCallback/,'secondary footer polish should run at idle time when available');
assert.match(runtime,/production-mode-v1\.js\?v=20260909\.4/,'runtime must load the observer-free production mode cache key');
assert.match(index,/app-runtime-v1\.js\?v=20260925\.3/,'index must load the lifecycle runtime cache key');
assert.match(index,/patch-runtime-loader-v1\.js\?v=20260925\.2/,'index must load the staged patch loader');
assert.doesNotMatch(index,/ga-per-class-v2\.js\?v=/,'heavy patch modules must no longer execute inline during bootstrap');
assert.match(runtime,/const LOOKAHEAD=8/,'runtime should keep a bounded preload lookahead');
assert.match(runtime,/const YIELD_EVERY=5/,'runtime should yield periodically to keep UI responsive');

console.log('OK runtime performance: no whole-page production observer; staged patch loader + bounded preload/yields enabled');
