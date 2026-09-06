'use strict';
const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('supabase/functions/admin-users/index.ts','utf8');

assert.match(src,/const tempPasswordForUsername\s*=\s*\(value:/,'Edge Function phải có helper mật khẩu tạm');
assert.match(src,/match\(\/\^gv\(\\d\+\)\$\//,'Policy phía máy chủ phải chỉ áp dụng cho GV + chữ số');
assert.match(src,/`hoannang\$\{match\[1\]\}`/,'Policy phía máy chủ phải dùng hoannang + phần số');
assert.match(src,/action === 'reset_pending_gv_passwords'/,'Phải có hành động chuẩn hóa tài khoản chưa đổi mật khẩu');
assert.match(src,/\.eq\('must_change_password', true\)/,'Chuẩn hóa chỉ được chọn tài khoản còn phải đổi mật khẩu');
assert.match(src,/\.neq\('role', 'owner'\)/,'Chuẩn hóa không được tác động tài khoản chủ sở hữu');
assert.match(src,/const policyPassword = tempPasswordForUsername\(targetProfile\?\.username\)/,'Reset từng tài khoản GV phải áp dụng policy ở máy chủ');
assert.match(src,/targetProfile\?\.role === 'owner'/,'Không được reset mật khẩu tài khoản chủ sở hữu bằng chức năng thường');

console.log('OK admin-users temp password server policy');
