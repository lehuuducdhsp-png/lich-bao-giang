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
assert.match(index,/app-runtime-v1\.js\?v=20260910\.1/,'index must bust app-runtime cache');

console.log('OK runtime performance: no whole-page MutationObserver; cache chain updated');
