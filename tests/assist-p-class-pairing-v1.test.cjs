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
assert.equal(dungClass.className,'','classType unknown không được xem là lớp hợp lệ');
assert.equal(P.formatClassText(dungClass),'Lớp không xác định (P)');
const dungWithLocalKnown=P.selectAssistClass(dungCandidates,dung,{className:'3/7',classRaw:'3/7',classType:'single'});
assert.equal(dungWithLocalKnown.className,'3/7','Nếu lượt chính chưa có lớp nhưng block P có lớp chuẩn thì phải dùng lớp đó');
assert.equal(P.formatClassText(dungWithLocalKnown),'3/7 (P)');

const thanh=P.pairedMainAssignment(assignments,13,5,'THANH',{day:3,session:'Sáng'});
assert.equal(thanh?.address,'D13');
const thanhClass=P.classFromPairedMain(thanh);
assert.equal(thanhClass.className,'1/1');
assert.equal(P.formatClassText(thanhClass),'1/1 (P)','Lớp hợp lệ của giáo viên chính cùng hàng phải được P kế thừa');
const thanhWithDifferentLocal=P.selectAssistClass(P.sameRowMainCandidates(assignments,13,5,'THANH',{day:3,session:'Sáng'}),thanh,{className:'9/9',classRaw:'9/9',classType:'single'});
assert.equal(thanhWithDifferentLocal.className,'1/1','Khi lượt chính có lớp hợp lệ thì lớp chính phải ưu tiên hơn nhãn cục bộ khác');

const missingCandidates=P.sameRowMainCandidates(assignments,20,5,'YEN',{day:3,session:'Sáng'});
const missing=P.pairedMainAssignment(assignments,20,5,'YEN',{day:3,session:'Sáng'});
assert.equal(missing,null,'Không có mã chính cùng hàng thì paired main phải rỗng');
assert.equal(P.formatClassText(P.classFromPairedMain(missing)),'Lớp không xác định (P)');

// Mô phỏng đúng phản hồi Hoài Thanh ở VỸ DẠ: nếu quanh ô P đọc được lớp 3/7 hoặc 4/5
// một cách rõ ràng, kết quả phải là "3/7 (P)" / "4/5 (P)", không phải một dòng
// "Lớp không xác định (P)" tách rời khỏi lớp đang có trong block.
for(const className of['3/7','4/5']){
  const localKnown={className,classRaw:className,classType:'single',classCount:1,groupNote:''};
  const picked=P.selectAssistClass(missingCandidates,null,localKnown);
  assert.equal(picked.className,className);
  assert.equal(P.formatClassText(picked),`${className} (P)`);
}

const ambiguous=[
  {code:'DO',row:21,col:4,day:3,session:'Chiều',className:'2/1',classRaw:'2/1',classType:'single'},
  {code:'DO',row:21,col:6,day:3,session:'Chiều',className:'2/2',classRaw:'2/2',classType:'single'}
];
const ambiguousCandidates=P.sameRowMainCandidates(ambiguous,21,5,'DO',{day:3,session:'Chiều'});
assert.equal(P.pairedMainAssignment(ambiguous,21,5,'DO',{day:3,session:'Chiều'}),null,'Hai mã chính cách đều thì không chọn bừa một lượt chính');
const ambiguousWithLocal=P.selectAssistClass(ambiguousCandidates,null,{className:'3/1',classRaw:'3/1',classType:'single'});
assert.equal(ambiguousWithLocal.className,'3/1','Nếu lượt chính mơ hồ nhưng block P có đúng một lớp cục bộ chuẩn thì vẫn dùng lớp cục bộ');

assert.equal(P.selectAssistClass([],null,{className:'ghi chú',classRaw:'ghi chú',classType:'unknown'}).className,'','Text mơ hồ không được coi là lớp');
console.log('OK assist P class: valid main wins; otherwise use clear local class; unresolved only when neither source is safe');
