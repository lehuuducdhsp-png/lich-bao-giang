'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

global.window={};
global.document={dispatchEvent(){}};
global.CustomEvent=function(name){this.type=name};

let fixture=[
  {address:'G176',day:2,session:'Sáng',period:3,row:176,col:7,groupNote:'TIẾT 4',classRaw:'KHỐI 3 (3 LỚP) - TIẾT 4',className:'KHỐI 3 (3 LỚP)',code:'THANH',locationKey:'THUY PHUONG|TRU SO CHINH',schoolName:'THỦY PHƯƠNG'},
  {address:'H176',day:2,session:'Sáng',period:4,row:176,col:8,groupNote:'TIẾT 4',classRaw:'KHỐI 3 (3 LỚP) - TIẾT 4',className:'KHỐI 3 (3 LỚP)',code:'THANH',locationKey:'THUY PHUONG|TRU SO CHINH',schoolName:'THỦY PHƯƠNG'},
  {address:'I176',day:2,session:'Sáng',period:5,row:176,col:9,groupNote:'',classRaw:'4/5',className:'4/5',classType:'single',code:'THANH',locationKey:'THUY PHUONG|TRU SO CHINH',schoolName:'THỦY PHƯƠNG'}
];

window.LBGTkbParserV2={
  scanAssignments(){return fixture.map(x=>({...x}))},
  analyze(){return{sheet:'7T9',code:'THANH',teacherName:'Hoài Thanh',entries:[],total:0,warnings:[]}}
};
vm.runInThisContext(fs.readFileSync('tkb-atomic-teaching-v1.js','utf8'),{filename:'tkb-atomic-teaching-v1.js'});

const atomic=window.LBGTkbParserV2.scanAssignments({name:'7T9'},'THANH');
assert.strictEqual(atomic.length,3,'Phải giữ đủ 3 ô mã giáo viên nguồn');
assert.deepStrictEqual(atomic.map(x=>x.slotPeriod),[3,4,5],'Phải giữ tiết vị trí nguồn 3,4,5');
assert.deepStrictEqual(atomic.map(x=>x.teachingPeriod),[4,4,5],'Hai ô lớp gộp cùng dạy thực tế Tiết 4; lớp 4/5 ở Tiết 5');
assert.strictEqual(atomic.reduce((s,x)=>s+x.payUnits,0),3,'Ba ô nguồn phải tính đủ 3 lượt lương');
assert.strictEqual(window.LBGTkbParserV2.analyze({name:'7T9'},'THANH','Hoài Thanh').total,3,'Tổng báo giảng/tính lương phải là 3');

window.startDate=()=>null;
window.weekLike=()=>true;
window.LBGTeacherIntelligenceV6={
  summaryRoles(){return new Map([['THANH',{code:'THANH',name:'Hoài Thanh',role:'KNS'}]])}
};
vm.runInThisContext(fs.readFileSync('tkb-parser-bridge-v2.js','utf8'),{filename:'tkb-parser-bridge-v2.js'});

const scan=window.LBGTeacherIntelligenceV6.scanSheet({name:'7T9'});
assert.strictEqual(scan.source.length,3,'Tầng nguồn phải giữ 3 lượt riêng');
assert.strictEqual(scan.groups.length,2,'Tầng lịch thực tế phải gom thành 2 sự kiện: Tiết 4 và Tiết 5');
const p4=scan.groups.find(x=>x.period===4),p5=scan.groups.find(x=>x.period===5);
assert.ok(p4&&p5,'Phải có sự kiện thực tế Tiết 4 và Tiết 5');
assert.strictEqual(p4.payPeriods,2,'Sự kiện Tiết 4 vẫn phải nhớ có 2 lượt nguồn tính lương');
assert.deepStrictEqual(p4.slotPeriods,[3,4],'Hai lượt nguồn Tiết 3,4 thuộc sự kiện thực tế Tiết 4');
assert.strictEqual(p5.payPeriods,1,'Lớp 4/5 Tiết 5 là 1 lượt nguồn');
assert.deepStrictEqual(p5.members,['4/5'],'Lớp 4/5 phải nằm ở sự kiện Tiết 5');

// Hồi quy trên toàn bộ 15 ô nguồn của Hoài Thanh trong file TKB 7T9 thực tế.
fixture=[
  {address:'G176',day:2,session:'Sáng',period:3,row:176,col:7,groupNote:'TIẾT 4',classRaw:'KHỐI 3 (3 LỚP) - TIẾT 4',className:'KHỐI 3 (3 LỚP)',code:'THANH',locationKey:'THUY PHUONG|TRU SO CHINH',schoolName:'THỦY PHƯƠNG'},
  {address:'H176',day:2,session:'Sáng',period:4,row:176,col:8,groupNote:'TIẾT 4',classRaw:'KHỐI 3 (3 LỚP) - TIẾT 4',className:'KHỐI 3 (3 LỚP)',code:'THANH',locationKey:'THUY PHUONG|TRU SO CHINH',schoolName:'THỦY PHƯƠNG'},
  {address:'I176',day:2,session:'Sáng',period:5,row:176,col:9,groupNote:'',classRaw:'4/5',className:'4/5',classType:'single',code:'THANH',locationKey:'THUY PHUONG|TRU SO CHINH',schoolName:'THỦY PHƯƠNG'},
  {address:'M172',day:2,session:'Chiều',period:4,row:172,col:13,groupNote:'TIẾT 4',classRaw:'KHỐI 3 (3 LỚP) - TIẾT 4',className:'KHỐI 3 (3 LỚP)',code:'THANH',locationKey:'THUY PHUONG|THANH LAM',schoolName:'THỦY PHƯƠNG'},
  {address:'N172',day:2,session:'Chiều',period:5,row:172,col:14,groupNote:'TIẾT 4',classRaw:'KHỐI 3 (3 LỚP) - TIẾT 4',className:'KHỐI 3 (3 LỚP)',code:'THANH',locationKey:'THUY PHUONG|THANH LAM',schoolName:'THỦY PHƯƠNG'},
  {address:'R183',day:3,session:'Sáng',period:4,row:183,col:18,groupNote:'TIẾT 4',classRaw:'KHỐI 1 (4 LỚP) - TIẾT 4',className:'KHỐI 1 (4 LỚP)',code:'THANH',locationKey:'THUY DUONG|TRUONG CHINH',schoolName:'THỦY DƯƠNG'},
  {address:'S183',day:3,session:'Sáng',period:5,row:183,col:19,groupNote:'TIẾT 4',classRaw:'KHỐI 1 (4 LỚP) - TIẾT 4',className:'KHỐI 1 (4 LỚP)',code:'THANH',locationKey:'THUY DUONG|TRUONG CHINH',schoolName:'THỦY DƯƠNG'},
  {address:'W187',day:3,session:'Chiều',period:4,row:187,col:23,groupNote:'TIẾT 4',classRaw:'KHỐI 1 (3 LỚP) - TIẾT 4',className:'KHỐI 1 (3 LỚP)',code:'THANH',locationKey:'THUY DUONG|PHAN HIEU',schoolName:'THỦY DƯƠNG'},
  {address:'X187',day:3,session:'Chiều',period:5,row:187,col:24,groupNote:'TIẾT 4',classRaw:'KHỐI 1 (3 LỚP) - TIẾT 4',className:'KHỐI 1 (3 LỚP)',code:'THANH',locationKey:'THUY DUONG|PHAN HIEU',schoolName:'THỦY DƯƠNG'},
  {address:'AQ172',day:5,session:'Chiều',period:4,row:172,col:43,groupNote:'TIẾT 3',classRaw:'KHỐI 1 (4 LỚP) - TIẾT 3',className:'KHỐI 1 (4 LỚP)',code:'THANH',locationKey:'THUY PHUONG|THANH LAM',schoolName:'THỦY PHƯƠNG'},
  {address:'AR172',day:5,session:'Chiều',period:5,row:172,col:44,groupNote:'TIẾT 3',classRaw:'KHỐI 1 (4 LỚP) - TIẾT 3',className:'KHỐI 1 (4 LỚP)',code:'THANH',locationKey:'THUY PHUONG|THANH LAM',schoolName:'THỦY PHƯƠNG'},
  {address:'AX38',day:6,session:'Chiều',period:1,row:38,col:50,groupNote:'',classRaw:'1/1',className:'1/1',classType:'single',code:'THANH',locationKey:'VY DA|',schoolName:'VỸ DẠ'},
  {address:'AY38',day:6,session:'Chiều',period:2,row:38,col:51,groupNote:'',classRaw:'3/7',className:'3/7',classType:'single',code:'THANH',locationKey:'VY DA|',schoolName:'VỸ DẠ'},
  {address:'AZ38',day:6,session:'Chiều',period:3,row:38,col:52,groupNote:'',classRaw:'1/3',className:'1/3',classType:'single',code:'THANH',locationKey:'VY DA|',schoolName:'VỸ DẠ'},
  {address:'BA38',day:6,session:'Chiều',period:4,row:38,col:53,groupNote:'',classRaw:'4/5',className:'4/5',classType:'single',code:'THANH',locationKey:'VY DA|',schoolName:'VỸ DẠ'}
];

const fullAtomic=window.LBGTkbParserV2.scanAssignments({name:'7T9'},'THANH');
assert.strictEqual(fullAtomic.length,15,'Toàn tuần Hoài Thanh phải giữ đúng 15 ô nguồn');
assert.strictEqual(window.LBGTkbParserV2.analyze({name:'7T9'},'THANH','Hoài Thanh').total,15,'Tổng Lịch Báo giảng/tính lương toàn tuần của Hoài Thanh phải là 15');

const fullScan=window.LBGTeacherIntelligenceV6.scanSheet({name:'7T9'});
assert.strictEqual(fullScan.source.length,15,'Bridge phải giữ đủ 15 nguồn của Hoài Thanh');
assert.strictEqual(fullScan.groups.length,10,'15 nguồn của Hoài Thanh phải tạo 10 sự kiện dạy thực tế');
assert.strictEqual(fullScan.groups.reduce((sum,g)=>sum+g.payPeriods,0),15,'Tổng payPeriods qua các sự kiện vẫn phải bằng 15');

const monMorning=fullScan.groups.filter(g=>g.day===2&&g.session==='Sáng'&&g.locationKey==='THUY PHUONG|TRU SO CHINH');
assert.deepStrictEqual(monMorning.map(g=>g.period),[4,5],'Lịch sáng Thứ 2 phải hiển thị Tiết 4 rồi Tiết 5');
assert.deepStrictEqual(monMorning[0].members,['KHỐI 3 (3 LỚP)'],'KHỐI 3 phải đứng trước Lớp 4/5');
assert.deepStrictEqual(monMorning[1].members,['4/5'],'Lớp 4/5 phải đứng sau KHỐI 3');
assert.strictEqual(monMorning[0].payPeriods,2,'KHỐI 3 sáng Thứ 2 phải giữ 2 lượt tính lương');

const thuAfternoon=fullScan.groups.find(g=>g.day===5&&g.session==='Chiều'&&g.locationKey==='THUY PHUONG|THANH LAM');
assert.ok(thuAfternoon,'Phải có sự kiện chiều Thứ 5 tại Thanh Lam');
assert.strictEqual(thuAfternoon.period,3,'Nhãn - TIẾT 3 phải đưa sự kiện thực tế về Tiết 3');
assert.deepStrictEqual(thuAfternoon.slotPeriods,[4,5],'Lịch Báo giảng vẫn phải nhớ hai ô nguồn vật lý Tiết 4 và 5');
assert.strictEqual(thuAfternoon.payPeriods,2,'Hai ô nguồn chiều Thứ 5 phải tính đủ 2 lượt');

console.log('OK atomic teaching regression: Hoài Thanh source=15, actual events=10, pay=15, Monday order=4→5, Thursday teachingPeriod=3');
