'use strict';
const assert=require('node:assert/strict');
const P=require('../assist-p-preview-safe-v1.js');

assert.equal(P.VERSION,'20260913.5');

// Quy tắc mới: lớp của (P) chỉ được lấy từ CHÍNH CỘT có mã P.
// Không được mượn lớp ở cột kế bên, kể cả đó là lượt dạy chính của cùng giáo viên.

// Hoài Thanh - VỸ DẠ trong file TKB thực tế:
// AX37 = 1/1, AX38 = ĐÔ, AX39 = THANHP  => 1/1 (P)
// AZ37 = 1/3, AZ38 = ĐÔ, AZ39 = THANHP  => 1/3 (P)
for(const className of['1/1','1/3']){
  const local={className,classRaw:className,classType:'single',classCount:1,groupNote:''};
  const picked=P.selectAssistClass([],null,local);
  assert.equal(picked.className,className);
  assert.equal(P.formatClassText(picked),`${className} (P)`);
}

// Đức trong file TKB thực tế:
// AB176 = 3/2, AB177 = ĐỨC, AC177 = ĐỨCP.
// Cột AC của ĐỨCP không có nhãn lớp, nên KHÔNG được lấy 3/2 ở cột AB.
const ducMain={code:'ĐỨC',row:177,col:28,address:'AB177',className:'3/2',classRaw:'3/2',classType:'single',classCount:1};
const ducCandidates=[{entry:ducMain,distance:1}];
const ducPicked=P.selectAssistClass(ducCandidates,ducMain,{className:'',classRaw:'',classType:'unknown'});
assert.equal(ducPicked.className,'','ĐỨCP không có lớp trong chính cột AC thì phải để không xác định');
assert.equal(P.formatClassText(ducPicked),'Lớp không xác định (P)');

// Dù cột bên cạnh có một lớp hợp lệ, selectAssistClass vẫn không được lấy nó.
const neighborOnly=P.selectAssistClass(ducCandidates,{...ducMain,className:'4/5',classRaw:'4/5'},{className:'',classRaw:'',classType:'unknown'});
assert.equal(neighborOnly.className,'');

// Khi chính cột P có lớp hợp lệ thì dùng lớp đó, bất kể giáo viên chính bên cạnh là ai.
const ownColumn=P.selectAssistClass([{entry:{className:'9/9',classRaw:'9/9',classType:'single'},distance:1}],null,{className:'4/2',classRaw:'4/2',classType:'single',classCount:1});
assert.equal(ownColumn.className,'4/2');
assert.equal(P.formatClassText(ownColumn),'4/2 (P)');

// Text mơ hồ không được coi là lớp.
assert.equal(P.selectAssistClass([],null,{className:'ghi chú',classRaw:'ghi chú',classType:'unknown'}).className,'');

console.log('OK assist P class: own-column class only; Hoài Thanh Vỹ DẠ gets class, Đức stays unresolved when P column has none');
