'use strict';
const fs=require('fs');
const assert=require('node:assert/strict');

const index=fs.readFileSync('index.html','utf8');
const warmup=fs.readFileSync('startup-warmup-v2.js','utf8');

assert.match(index,/startup-warmup-v2\.js\?v=20260913\.2[^>]*async/,'warmup must be async and non-blocking');
assert.match(index,/rel="preconnect" href="https:\/\/gmkibmybqfomypytmjxw\.supabase\.co"/,'Supabase should be preconnected');
assert.match(index,/rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"/,'jsDelivr should be preconnected');
assert.match(index,/index-core\.html\?v=20260808\.17'\s*,\s*\{cache:'default'\}/,'versioned core HTML should reuse browser cache');
assert.doesNotMatch(index,/cache:'no-store'/,'startup must not force a full core re-download on every visit');

assert.match(warmup,/link\.rel='preload'/,'direct startup scripts should be warmed with preload');
assert.doesNotMatch(warmup,/\brel=['"]prefetch['"]|hint\(['"]prefetch['"]/,'warmup must not spend startup bandwidth on background prefetch');
assert.doesNotMatch(warmup,/createElement\(['"]script['"]\)/,'warmup must never execute application modules itself');
assert.doesNotMatch(warmup,/\bindexedDB\b/,'warmup must not touch IndexedDB');
assert.doesNotMatch(warmup,/\blocalStorage\b/,'warmup must not touch localStorage');
assert.doesNotMatch(warmup,/document\.cookie/,'warmup must not touch cookies');
assert.doesNotMatch(warmup,/\bfetch\s*\(/,'warmup must not fetch or upload user data');

const criticalBlock=(warmup.match(/const critical=\[([\s\S]*?)\];/)||[])[1]||'';
const criticalCount=(criticalBlock.match(/\.js\?v=/g)||[]).length;
assert.ok(criticalCount>0&&criticalCount<=16,`direct preload set must stay bounded (got ${criticalCount})`);
assert.match(criticalBlock,/app-runtime-v1\.js\?v=20260913\.1/,'current responsive runtime must be warmed');
assert.match(criticalBlock,/assist-p-preview-safe-v1\.js\?v=20260913\.5/,'warmup must use current P preview version');
assert.match(criticalBlock,/ga-per-class-history-safe-v1\.js\?v=20260913\.1/,'current GA history safety layer must be warmed');
assert.doesNotMatch(criticalBlock,/assist-p-preview-safe-v1\.js\?v=20260911\.1/,'stale P preview must not be downloaded');

console.log('OK startup warmup v2: current-only bounded preloads, no stale/background traffic, no user-data access');
