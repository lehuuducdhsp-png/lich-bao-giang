'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

global.window={};
global.document={dispatchEvent(){}};
global.CustomEvent=function(name){this.type=name};

const fixture=[
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

console.log('OK atomic teaching regression: source=3, actual events=2, pay=3, order periods=4→5');
