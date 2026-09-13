'use strict';
const fs=require('fs');
const assert=require('node:assert/strict');
const Cache=require('../tkb-assignment-cache-safe-v1.js');
const MultiGa=require('../ga-suggestion-multi-apply-v1.js');

const multi=fs.readFileSync('multi-teacher-v5.js','utf8');
const ga=fs.readFileSync('ga-suggestion-multi-apply-v1.js','utf8');
const bridge=fs.readFileSync('ga-multi-selection-bridge-v1.js','utf8');
const per=fs.readFileSync('ga-per-class-v2.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const teacherFix=fs.readFileSync('teacher-fix-v2.js','utf8');
const analysisFix=fs.readFileSync('analysis-fix-v2.js','utf8');

// Kiểm tra nhiều giáo viên phải chạy tuần tự nhưng nhường UI, không khóa trình duyệt bằng list.map đồng bộ.
assert.match(multi,/b\.onclick=async\(\)=>/,'multi analyze must be async');
assert.doesNotMatch(multi,/reports\s*=\s*list\.map\s*\(/,'multi analyze must not synchronously map all teachers');
assert.match(multi,/for\(let i=0;i<list\.length;i\+\+\)/,'multi analyze must preserve deterministic teacher order');
assert.match(multi,/await yieldUi\(\)/,'multi analyze must yield to the browser between heavy work');
assert.match(multi,/queueSelectionSync\(\)/,'checkbox changes must be coalesced');
assert.match(multi,/if\(s\.value===next\)return/,'hidden single-teacher select must not emit duplicate change events');
assert.match(multi,/lbg-multi-selection-change/,'multi selection must expose one stable batched change event');
assert.doesNotMatch(multi,/setInterval\(\(\)=>\{analyze\(\);exportFiles\(\)/,'multi module must not permanently rebind handlers every 1.2 seconds');
assert.match(multi,/lbg-runtime-ready/,'multi handlers must rebind from lifecycle events instead of endless polling');

// Nút xanh dùng chung cho 1 giáo viên và nhiều giáo viên.
assert.equal(MultiGa.VERSION,'20260913.2');
assert.match(ga,/box\.classList\.toggle\('show',count>0\)/,'GA button must be visible for one selected teacher');
assert.match(ga,/button\.disabled=count<1/,'GA button must enable from one teacher');
assert.match(ga,/teachers\.length<1/,'GA batch runner must accept a single teacher');
assert.match(ga,/Phân tích & áp dụng GA cho 1 giáo viên/,'single-teacher label must be explicit');
assert.match(ga,/Phân tích & áp dụng GA cho \$\{count\} giáo viên/,'multi-teacher label must keep selected count');
assert.match(ga,/await yieldUi\(\)/,'GA apply must yield between teachers');
assert.match(ga,/if\(q\('teacher'\).*ensureUi\(\);\s*return;/s,'GA installer must stop polling once dependencies are ready');

// Per-class GA là chủ nghiệp vụ cuối cùng; không được tranh onclick với bridge hoặc giữ luật cũ >=2 GV.
assert.match(per,/const VERSION='20260914\.1'/);
assert.doesNotMatch(per,/Hãy chọn từ 2 giáo viên trở lên/,'per-class module must not keep the obsolete >=2-teacher guard');
assert.doesNotMatch(per,/function bindMultiButton/,'per-class module must not fight the shared GA button handler');
assert.match(per,/decorateReport\(a,write\.values\)/,'per-class batch result must be decorated before the preview consumes it');
assert.match(per,/if\(ready\)\{[\s\S]*notifyReady\(\);return;/,'per-class installer must stop polling after successful install');
assert.match(per,/applyReport,loadStoredValues,persistStoredValues,install/,'per-class browser API must expose the canonical batch apply path');

// Bridge giữ snapshot lựa chọn thật, dùng per-class engine và đồng bộ lại preview khi đổi GV.
assert.match(bridge,/const VERSION='20260914\.2'/);
assert.match(bridge,/const reportCache=new Map\(\)/);
assert.match(bridge,/api=perClass\(\)/,'bridge must call the per-class engine, not the legacy location-only writer');
assert.match(bridge,/rememberReport\(a\)/,'each applied teacher must be cached for preview switching');
assert.match(bridge,/multiPreviewSelect/,'switching viewed teacher must resync cached GA state');
assert.doesNotMatch(bridge,/LBGGaSuggestionMultiApplyV1\.applyReport/,'bridge must not call the old location-only apply path');

// Cache quét toàn TKB: một mảng chuẩn hóa có thể lọc chính xác từng giáo viên mà không đổi thứ tự hay dữ liệu.
assert.equal(Cache.VERSION,'20260913.1');
const all=[{code:'A',address:'D10'},{code:'B',address:'E11'},{code:'A',address:'F12'}];
assert.deepEqual(Cache.filterAssignments(all,'A').map(x=>x.address),['D10','F12']);
assert.deepEqual(Cache.filterAssignments(all,'B').map(x=>x.address),['E11']);
assert.deepEqual(Cache.filterAssignments(all,'').map(x=>x.address),['D10','E11','F12']);
const cacheSource=fs.readFileSync('tkb-assignment-cache-safe-v1.js','utf8');
assert.match(cacheSource,/const cache=new WeakMap\(\)/,'assignment cache must be per worksheet object');
assert.match(cacheSource,/all=original\(ws,''\)\|\|\[\]/,'cache must build from the final normalized full-sheet scan exactly once');
assert.match(cacheSource,/__lbgAtomicTeachingV1/,'cache must wait for atomic semantics');
assert.match(cacheSource,/__lbgClassTypoFixV1/,'cache must wait for class typo normalization');

// Cache-bust chain for the updated browser modules.
assert.match(index,/teacher-fix-v2\.js\?v=20260913\.1/);
assert.match(teacherFix,/analysis-fix-v2\.js\?v=20260913\.1/);
assert.match(analysisFix,/multi-teacher-v5\.js\?v=20260913\.1/);
assert.match(index,/tkb-assignment-cache-safe-v1\.js\?v=20260913\.1/);
assert.match(index,/ga-suggestion-multi-apply-v1\.js\?v=20260913\.2/);
assert.match(index,/ga-per-class-v2\.js\?v=20260914\.1/);
assert.match(index,/ga-multi-selection-bridge-v1\.js\?v=20260914\.2/);
assert.ok(index.indexOf('ga-per-class-v2.js?v=20260914.1')<index.indexOf('ga-multi-selection-bridge-v1.js?v=20260914.2'),'stable bridge must load after per-class GA');

// Các module nghiệp vụ đã chốt gần đây vẫn phải còn nguyên trên đường chạy chính.
for(const required of [
  'tkb-class-typo-fix-v1.js?v=20260913.2',
  'ga-per-class-v2.js?v=20260914.1',
  'ga-per-class-history-safe-v1.js?v=20260913.1',
  'sheets-ga-save-safe-v1.js?v=20260913.1',
  'assist-p-preview-safe-v1.js?v=20260913.5',
  'assist-p-summary-monthly-safe-v1.js?v=20260912.1',
  'assist-p-sheets-label-safe-v1.js?v=20260912.3'
])assert.ok(index.includes(required),`missing protected runtime module: ${required}`);

console.log('OK multi report performance: cached scan, stable GA ownership, per-class apply and preview resync');
