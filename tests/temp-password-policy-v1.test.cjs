'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

global.window={};
global.document={
  readyState:'loading',
  addEventListener(){},
  getElementById(){return null},
  documentElement:{dataset:{}}
};
global.MutationObserver=function(){};
global.requestAnimationFrame=fn=>fn();
global.Event=function(){};

vm.runInThisContext(fs.readFileSync('temp-password-policy-v1.js','utf8'),{filename:'temp-password-policy-v1.js'});

const api=window.LBGTempPasswordPolicyV1;
assert.ok(api&&typeof api.passwordForUsername==='function','Phải xuất helper passwordForUsername');
assert.strictEqual(api.passwordForUsername('GV035'),'hoannang035','GV035 phải có mật khẩu tạm hoannang035');
assert.strictEqual(api.passwordForUsername('gv001'),'hoannang001','Phải hỗ trợ chữ thường và giữ số 0 đầu');
assert.strictEqual(api.passwordForUsername('GV005'),'hoannang005','Phải giữ nguyên 3 chữ số của mã GV');
assert.strictEqual(api.passwordForUsername('GV120'),'hoannang120','Phải hỗ trợ mã GV lớn hơn 099');
assert.strictEqual(api.passwordForUsername('ABC035'),'','Không tự áp dụng cho tài khoản ngoài quy tắc GV');
assert.strictEqual(api.passwordForUsername('GV'),'','Mã GV thiếu số không được sinh mật khẩu');

console.log('OK temp password policy: GV035 -> hoannang035');
