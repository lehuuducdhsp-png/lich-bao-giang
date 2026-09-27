'use strict';
const assert=require('node:assert/strict');
const A=require('../account-bulk-handoff-v1.js');

assert.equal(A.VERSION,'20260927.1');
assert.equal(A.tempPasswordForUsername('GV035'),'hoannang035');
assert.equal(A.tempPasswordForUsername('gv001'),'hoannang001');
assert.equal(A.tempPasswordForUsername('GV120'),'hoannang120');
assert.equal(A.tempPasswordForUsername('HC01'),'','tài khoản ngoài GV### không được sinh mật khẩu theo policy');
assert.equal(A.eligibleUsername('GV016'),true);
assert.equal(A.eligibleUsername('hc01'),false);

const rows=A.workbookRows([
  {displayName:'Nguyễn Thị Thúy',username:'gv021',password:'hoannang021',loginUrl:A.LOGIN_URL},
  {displayName:'Ngô Thị Mỹ Linh',username:'gv033',password:'hoannang033',loginUrl:A.LOGIN_URL}
]);
assert.deepEqual(rows[0],[1,'Nguyễn Thị Thúy','GV021','hoannang021',A.LOGIN_URL,'Đổi mật khẩu ở lần đăng nhập đầu']);
assert.deepEqual(rows[1],[2,'Ngô Thị Mỹ Linh','GV033','hoannang033',A.LOGIN_URL,'Đổi mật khẩu ở lần đăng nhập đầu']);

const html=A.printHtml([{displayName:'Diệu Tâm',username:'gv010',password:'hoannang010',loginUrl:A.LOGIN_URL}]);
assert.match(html,/Diệu Tâm/);
assert.match(html,/GV010/);
assert.match(html,/hoannang010/);
assert.match(html,/Vui lòng đổi mật khẩu/);
assert.doesNotMatch(html,/password=/i,'không được nhét mật khẩu vào URL hoặc query string');

console.log('OK account bulk handoff: GV### -> hoannang###, export rows and printable cards are deterministic');
