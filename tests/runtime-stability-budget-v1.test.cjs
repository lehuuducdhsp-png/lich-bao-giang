'use strict';
const fs=require('fs');
const assert=require('node:assert/strict');

const runtime=fs.readFileSync('app-runtime-v1.js','utf8');
const patches=fs.readFileSync('patch-runtime-loader-v1.js','utf8');
const index=fs.readFileSync('index.html','utf8');

function listFrom(source,name,indent='      '){
  const re=new RegExp(`const ${name}=\\[([\\s\\S]*?)\\n${indent}\\];`);
  const m=source.match(re);
  assert.ok(m,`${name} must exist`);
  return [...m[1].matchAll(/\\['([^']+\\.js)\\?v=[^']+'\\s*,\\s*'[^']+'\\]/g)].map(x=>x[1]);
}
function count(source,re){return (source.match(re)||[]).length}

const files=new Set([
  'app-runtime-v1.js','patch-runtime-loader-v1.js','teacher-fix-v2.js','analysis-fix-v2.js','multi-teacher-v5.js',
  'light-orange-theme-v2.js',
  ...listFrom(runtime,'preAuth'),
  ...listFrom(runtime,'reportCore'),
  ...listFrom(runtime,'modules'),
  ...listFrom(patches,'CORE_PATCHES','  '),
  ...listFrom(patches,'RUNTIME_PATCHES','  '),
  'checkin-shared-scan-context-v1.js','checkin-v2.js','checkin-date-label-v1.js','checkin-professional-labels-v1.js'
]);
const existing=[...files].filter(f=>fs.existsSync(f));
assert.equal(existing.length,files.size,'every protected runtime module must exist');

let bytes=0,intervals=0,bodyObservers=0,observers=0;
for(const file of existing){
  const source=fs.readFileSync(file,'utf8');
  bytes+=fs.statSync(file).size;
  intervals+=count(source,/setInterval\s*\(/g);
  observers+=count(source,/MutationObserver/g);
  bodyObservers+=count(source,/\.observe\s*\(\s*document\.body/g);
}

// Đây là "trần không được xấu hơn" chứ không phải mục tiêu lý tưởng.
assert.ok(files.size<=100,`runtime module budget exceeded: ${files.size}/100`);
assert.ok(bytes<=1_000_000,`first-party runtime JS budget exceeded: ${bytes}/1000000 bytes`);
assert.ok(intervals<=31,`runtime interval budget exceeded: ${intervals}/31`);
assert.ok(bodyObservers<=40,`document.body observer budget exceeded: ${bodyObservers}/40`);

assert.match(index,/app-runtime-v1\.js\?v=20260920\.2/);
assert.match(index,/patch-runtime-loader-v1\.js\?v=20260920\.1/);
assert.doesNotMatch(index,/ga-per-class-v2\.js\?v=/,'bootstrap must not inline heavy patches');
assert.doesNotMatch(patches,/setInterval\s*\(/,'patch loader itself must not add polling');

console.log(`OK runtime stability budget: ${files.size} modules, ${bytes} bytes, ${intervals} intervals, ${observers} observers, ${bodyObservers} body observers`);
