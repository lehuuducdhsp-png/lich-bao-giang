'use strict';
const assert=require('node:assert/strict');
const P=require('../assist-p-preview-safe-v1.js');

const assignments=[
  {code:'DUNG',row:10,col:4,day:3,session:'Sáng',address:'D10',className:'Lớp lân cận',classRaw:'Lớp lân cận',classType:'unknown'},
  {code:'DUNG',row:10,col:9,day:4,session:'Sáng',address:'I10',className:'4/1',classRaw:'4/1',classType:'single'},
  {code:'THANH',row:13,col:4,day:3,session:'Sáng',address:'D13',className:'1/1',classRaw:'1/1',classType:'single',classCount:1},
  {code:'DUONG',row:16,col:4,day:3,session:'Sáng',address:'D16',className:'1/2',classRaw:'1/2',classType:'single',classCount:1}
];

const dung=P.pairedMainAssignment(assignments,10,5,'DUNG',{day:3,session:'Sáng'});
assert.equal(dung?.address,'D10','P phải ghép với giáo viên chính cùng hàng/cùng ngày, không lấy mã ở ngày khác');
const dungClass=P.classFromPairedMain(dung);
assert.equal(dungClass.className,'','classType unknown phải trở thành lớp không xác định, không được lấy text lân cận');
assert.equal(P.formatClassText(dungClass),'Lớp chưa xác định (P)');

const thanh=P.pairedMainAssignment(assignments,13,5,'THANH',{day:3,session:'Sáng'});
assert.equal(thanh?.address,'D13');
const thanhClass=P.classFromPairedMain(thanh);
assert.equal(thanhClass.className,'1/1');
assert.equal(P.formatClassText(thanhClass),'1/1 (P)','Lớp hợp lệ của giáo viên chính cùng hàng phải được P kế thừa');

const missing=P.pairedMainAssignment(assignments,20,5,'YEN',{day:3,session:'Sáng'});
assert.equal(missing,null,'Không có mã chính cùng hàng thì không được đoán lớp');
assert.equal(P.formatClassText(P.classFromPairedMain(missing)),'Lớp chưa xác định (P)');

const ambiguous=[
  {code:'DO',row:21,col:4,day:3,session:'Chiều',className:'2/1',classRaw:'2/1',classType:'single'},
  {code:'DO',row:21,col:6,day:3,session:'Chiều',className:'2/2',classRaw:'2/2',classType:'single'}
];
assert.equal(P.pairedMainAssignment(ambiguous,21,5,'DO',{day:3,session:'Chiều'}),null,'Hai mã chính cách đều thì phải từ chối đoán');

console.log('OK assist P pairing: same-row main only; unresolved stays Lớp chưa xác định (P)');
