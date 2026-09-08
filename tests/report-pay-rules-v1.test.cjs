'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('report-pay-rules-v1.js','utf8');
const cells=new Map([['2|5','ĐỨC+'],['2|6','ĐỨC'],['2|7','THANH']]);
const ws={rowCount:3,getCell:(r,c)=>({text:cells.get(`${r}|${c}`)||''})};
const window={LBGTkbParserV2:{timetableColumns:()=>[5,6,7],buildHeader:()=>({headerRow:1}),colInfoFor:(_ws,c)=>({day:c===5?2:c===6?3:4})}};
vm.runInNewContext(code,{window,console});
const R=window.LBGReportPayRulesV1;
assert(R,'Phải xuất API quy tắc báo giảng.');
assert.strictEqual(R.scanPlus(ws,'ĐỨC'),1,'Phải nhận đúng ĐỨC+ là một tiết cộng.');
assert.strictEqual(R.scanPlus(ws,'ĐỨC',{allowedDays:[3]}),0,'Lọc ngày không được kéo tiết cộng ngoài phần tháng.');
assert.strictEqual(R.scanPlus(ws,'ĐỨC',{allowedDays:[2]}),1,'Lọc ngày phải giữ tiết cộng đúng ngày.');
const base={day:2,session:'Sáng',locationKey:'TRUONG|CS',className:'KHỐI 4 (4 LỚP)',classRaw:'KHỐI 4 (4 LỚP) - TIẾT 4'};
const entries=[
 {...base,period:1,slotPeriod:1,teachingPeriod:4,address:'E10'},
 {...base,period:2,slotPeriod:2,teachingPeriod:4,address:'F10'},
 {day:2,session:'Sáng',locationKey:'TRUONG|CS',className:'4/1',classRaw:'4/1',period:3,slotPeriod:3,teachingPeriod:3,address:'G10'}
];
assert.strictEqual(R.displayEntries(entries,2,'Sáng',4).length,1,'Lớp ghép cùng TIẾT 4 phải chỉ hiện một lần ở hàng Tiết 4.');
assert.strictEqual(R.displayEntries(entries,2,'Sáng',1).length,0,'Lớp ghi - TIẾT 4 không được nằm ở hàng tiết nguồn.');
assert.strictEqual(R.displayEntries(entries,2,'Sáng',3).length,1,'Lớp bình thường vẫn giữ đúng tiết nguồn.');
assert.strictEqual(R.totalText(15,1),'TỔNG: 15 tiết + 1 tiết = 16 tiết');
assert.strictEqual(R.totalText(15,0),'TỔNG: 15 tiết');
assert.strictEqual(R.weekLabel(15,1),'15 Chính (T) + Cộng 1');
console.log('OK report/pay rules: teachingPeriod, dedupe, plus count, total labels');
