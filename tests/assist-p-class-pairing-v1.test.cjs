'use strict';
const assert=require('node:assert/strict');
const P=require('../assist-p-preview-safe-v1.js');

assert.equal(P.VERSION,'20261011.1');

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

// Ngoại lệ hẹp của TKB 21T9 mới: ĐÔ ở BB61 thuộc cụm KHỐI 1 - DẠY TIẾT 4,
 // còn ĐÔP được xếp ngay ô BC61 bên cạnh. Chỉ cụm roster đã được parser xác nhận mới được ghép.
const rosterMain={code:'ĐÔ',row:61,col:54,address:'BB61',className:'1/5',classRaw:'1/5',classType:'single',classCount:1,day:6,session:'Chiều',period:5,teachingPeriod:4,rosterTeachingPeriod:4};
const special=P.specialPairedMainAssignment([rosterMain],61,55,'ĐÔ',{rosterTeachingPeriodAt:()=>4},{});
assert.equal(special?.address,'BB61');
const rosterPicked=P.selectAssistClass([],null,{className:'',classRaw:'',classType:'unknown'},special);
assert.equal(rosterPicked.className,'1/5');
assert.equal(P.formatClassText(rosterPicked),'1/5 (P)');

// Ca bình thường ĐỨCP vẫn không được mượn lớp bên cạnh vì không có cờ roster đặc biệt.
assert.equal(P.specialPairedMainAssignment([ducMain],177,29,'ĐỨC',{rosterTeachingPeriodAt:()=>null},{}),null);

// Khi lớp chính và lớp P trùng nhau trong cùng ô báo giảng, chỉ thêm nhãn (P), không lặp "1/3 & 1/3 (P)".
assert.equal(P.assistAppendFragment('1/3','1/3 (P)'),' (P)');
assert.equal(P.assistAppendFragment('1/3 (GA 2)','1/3 (P)'),' (P)');
assert.equal(P.assistAppendFragment('1/3','1/4 (P)'),' & 1/4 (P)');


// THỦY PHƯƠNG – TRỤ SỞ CHÍNH 25 DẠ LÊ: nhiều lượt GV chính và DƯƠNGP đan xen.
// Cấu trúc ô theo cột (không được ghép nhầm lớp ở cột liền kề).
// J100=4/2 -> J101=ĐỨC -> J102=DƯƠNGP => P lớp 4/2.
// L102=4/5 -> L103=THANH -> L104=DƯƠNGP => P lớp 4/5.
// K104=4/3 -> K105=DƯƠNG => lớp chính DƯƠNG là 4/3, không phải lớp của P tại L104.
const siteKey='THỦY PHƯƠNG|TRỤ SỞ CHÍNH|25 DẠ LÊ';
const cells=new Map([
  ['100,10','4/2'],['100,11','4/1'],
  ['101,10','ĐỨC'],['101,11','ĐỨC'],
  ['102,10','DƯƠNGP'],['102,11','4/4'],['102,12','4/5'],
  ['103,11','THANH'],['103,12','THANH'],
  ['104,11','4/3'],['104,12','DƯƠNGP'],
  ['105,11','DƯƠNG']
]);
const sheet={
  rowCount:110,
  getCell(row,col){return {value:cells.get(`${row},${col}`)||'',address:`${col}:${row}`};}
};
const codes=new Set(['ĐỨC','THANH','DƯƠNG']);
const parsed={
  buildHeader(){return{headerRow:4}},
  locationAt(sheet,row){return{locationKey:siteKey}},
  classMeta(raw){
    const name=String(raw||'');
    return /^[1-5]\/\d+$/.test(name)?
      {className:name,classRaw:name,classType:'single',classDisplay:name,classCount:1}:
      {className:name,classRaw:name,classType:'unknown',classCount:1};
  },
  resolveTeacherCode(sheet,raw){return codes.has(String(raw||'').toUpperCase())?{code:String(raw).toUpperCase()}:null}
};
const loc={locationKey:siteKey};
const firstP=P.strictClassForPColumn(sheet,102,10,'DƯƠNG',loc,parsed);
const secondP=P.strictClassForPColumn(sheet,104,12,'DƯƠNG',loc,parsed);
assert.equal(firstP.className,'4/2','DƯƠNGP ở cột J nhận lớp 4/2, không nhận lớp của ĐỨC làm GV chính');
assert.equal(firstP.assistClassRow,100);
assert.equal(secondP.className,'4/5','DƯƠNGP ở cột L nhận lớp 4/5, không mượn 4/3 ở cột K');
assert.equal(secondP.assistClassRow,102);
assert.equal(P.formatClassText(firstP),'4/2 (P)');
assert.equal(P.formatClassText(secondP),'4/5 (P)');
assert.equal(P.assistantCode('DƯƠNG'),'DƯƠNGP','mã DƯƠNG là GV chính khác với mã DƯƠNGP');
assert.equal(P.strictClassForPColumn(sheet,104,13,'DƯƠNG',loc,parsed).className,'','cột P không có lớp phải giữ chưa xác định, không mượn 4/3 từ cột kề');

// Không dò nhầm lớp/P qua ranh giới điểm dạy.
const shifted={...parsed,locationAt(sheet,row){return{locationKey:row<=101?'KHÁC CƠ SỞ':siteKey}}};
assert.equal(P.strictClassForPColumn(sheet,102,10,'DƯƠNG',loc,shifted).className,'',
  'P không được vượt qua ranh giới điểm trường để lấy lớp 4/2');

console.log('OK assist P class: own-column by default; special roster adjacency only; duplicate same-class P label compacted');
