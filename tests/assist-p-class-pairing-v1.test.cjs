'use strict';
const assert=require('node:assert/strict');
const P=require('../assist-p-preview-safe-v1.js');

const assignments=[
  {code:'DUNG',row:10,col:4,day:3,session:'Sáng',address:'D10',className:'Lớp lân cận',classRaw:'Lớp lân cận',classType:'unknown'},
  {code:'DUNG',row:10,col:9,day:4,session:'Sáng',address:'I10',className:'4/1',classRaw:'4/1',classType:'single'},
  {code:'THANH',row:13,col:4,day:3,session:'Sáng',address:'D13',className:'1/1',classRaw:'1/1',classType:'single',classCount:1},
  {code:'DUONG',row:16,col:4,day:3,session:'Sáng',address:'D16',className:'1/2',classRaw:'1/2',classType:'single',classCount:1}
];

const dungCandidates=P.sameRowMainCandidates(assignments,10,5,'DUNG',{day:3,session:'Sáng'});
const dung=P.pairedMainAssignment(assignments,10,5,'DUNG',{day:3,session:'Sáng'});
assert.equal(dung?.address,'D10','P phải ghép với giáo viên chính cùng hàng/cùng ngày, không lấy mã ở ngày khác');
const dungClass=P.classFromPairedMain(dung);
assert.equal(dungClass.className,'','classType unknown phải trở thành lớp không xác định, không được lấy text lân cận');
assert.equal(P.formatClassText(dungClass),'Lớp không xác định (P)');
const dungWithNearbyKnown=P.selectAssistClass(dungCandidates,dung,{className:'1/1',classRaw:'1/1',classType:'single'});
assert.equal(dungWithNearbyKnown.className,'','Khi đã có lượt DUNG cùng hàng nhưng lớp chưa rõ thì không được nhảy sang 1/1 ở block lân cận');

const thanh=P.pairedMainAssignment(assignments,13,5,'THANH',{day:3,session:'Sáng'});
assert.equal(thanh?.address,'D13');
const thanhClass=P.classFromPairedMain(thanh);
assert.equal(thanhClass.className,'1/1');
assert.equal(P.formatClassText(thanhClass),'1/1 (P)','Lớp hợp lệ của giáo viên chính cùng hàng phải được P kế thừa');

const missingCandidates=P.sameRowMainCandidates(assignments,20,5,'YEN',{day:3,session:'Sáng'});
const missing=P.pairedMainAssignment(assignments,20,5,'YEN',{day:3,session:'Sáng'});
assert.equal(missing,null,'Không có mã chính cùng hàng thì paired main phải rỗng');
assert.equal(P.formatClassText(P.classFromPairedMain(missing)),'Lớp không xác định (P)');

// Mô phỏng tình huống như Hoài Thanh ở Vỹ Dạ: không có mã chính cùng hàng,
// nhưng ngay block của ô P có một nhãn lớp chuẩn, hệ thống được phép dùng nhãn đó.
const localKnown={className:'5/2',classRaw:'5/2',classType:'single',classCount:1,groupNote:''};
const hoaiThanhLike=P.selectAssistClass(missingCandidates,null,localKnown);
assert.equal(hoaiThanhLike.className,'5/2','Không có lượt chính cùng hàng nhưng có nhãn lớp cục bộ hợp lệ thì P phải nhận lớp đó');
assert.equal(P.formatClassText(hoaiThanhLike),'5/2 (P)');

const ambiguous=[
  {code:'DO',row:21,col:4,day:3,session:'Chiều',className:'2/1',classRaw:'2/1',classType:'single'},
  {code:'DO',row:21,col:6,day:3,session:'Chiều',className:'2/2',classRaw:'2/2',classType:'single'}
];
const ambiguousCandidates=P.sameRowMainCandidates(ambiguous,21,5,'DO',{day:3,session:'Chiều'});
assert.equal(P.pairedMainAssignment(ambiguous,21,5,'DO',{day:3,session:'Chiều'}),null,'Hai mã chính cách đều thì phải từ chối đoán');
const ambiguousClass=P.selectAssistClass(ambiguousCandidates,null,{className:'3/1',classRaw:'3/1',classType:'single'});
assert.equal(ambiguousClass.className,'','Có lượt chính cùng hàng nhưng mơ hồ thì không được fallback sang lớp cục bộ khác');

console.log('OK assist P pairing: same-row main wins; safe local known class allowed only when same-row main is absent');
