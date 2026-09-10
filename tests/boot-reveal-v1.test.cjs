'use strict';
const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const runtime=fs.readFileSync('app-runtime-v1.js','utf8');
const preload=fs.readFileSync('runtime-preload-v1.js','utf8');

assert.match(index,/id="lbgBootCover"/,'boot cover must be injected into the generated app shell');
assert.match(index,/dataset\.lbgBooting='1'/,'booting state must begin before the core UI is painted');
assert.match(index,/document\.addEventListener\('lbg-runtime-ready'/,'shell must wait for runtime-ready before revealing the UI');
assert.match(index,/requestAnimationFrame\(\(\)=>requestAnimationFrame\(finish\)\)/,'reveal should wait two frames so CSS/layout can settle');
assert.match(index,/setTimeout\(\(\)=>revealApp\('timeout'\),12000\)/,'boot cover needs a finite fallback timeout');
assert.match(index,/#lbgBootCover\{position:fixed;inset:0;z-index:2147483647/,'boot cover must fully mask the legacy core UI');
assert.match(index,/app-runtime-v1\.js\?v=20260910\.1/,'boot change must use a fresh runtime cache key');
assert.match(index,/runtime-preload-v1\.js\?v=20260910\.1/,'runtime preloader must start before the core shell is replaced');
assert.match(index,/index-core\.html\?v=20260808\.17'\s*,\s*\{cache:'default'\}/,'versioned core HTML should reuse browser cache');
assert.doesNotMatch(index,/cache:'no-store'/,'boot path must not force a full core refetch on every visit');
assert.match(preload,/link\.rel='preload'/,'preloader must use browser preload without executing modules');
assert.match(preload,/link\.as='script'/,'preloaded modules must be typed as scripts');
assert.match(preload,/preconnect\('https:\/\/gmkibmybqfomypytmjxw\.supabase\.co'/,'auth backend should be preconnected');
assert.doesNotMatch(preload,/createElement\('script'\)/,'preloader must not execute dependency-sensitive modules early');
assert.match(runtime,/function\s+signalRuntimeReady\s*\(/,'runtime must expose a deterministic ready signal');
assert.match(runtime,/finally\s*\{\s*signalRuntimeReady\(runtimeError\)/,'runtime must release the cover even on degraded startup');
assert.match(runtime,/new CustomEvent\('lbg-runtime-ready'/,'runtime must dispatch the ready event');
assert.doesNotMatch(runtime,/Promise\.all\s*\(/,'boot fix must not parallelize dependency-sensitive module execution');

console.log('OK boot reveal: hidden legacy UI + parallel resource warming + safe ordered execution');
