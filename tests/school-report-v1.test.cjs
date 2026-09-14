'use strict';
const assert=require('node:assert/strict');
const api=require('../school-report-v1.js');

assert.equal(api.VERSION,'20260914.1');
assert.deepEqual(api.MODES,{class:'Lớp',teacher:'Giáo viên','teacher-class':'Giáo viên - lớp'});

const mainA={day:2,session:'Sáng',period:1,teachingPeriod:1,schoolName:'PHÚ BÌNH',siteDisplay:'Cơ sở 1: PHÚ HẬU CŨ',teacherName:'Diệu Tâm',code:'TÂM',className:'5/4',classType:'single',address:'A1'};
const mainB={day:2,session:'Sáng',period:1,teachingPeriod:1,schoolName:'PHÚ BÌNH',siteDisplay:'Cơ sở 2: PHÚ BÌNH CŨ',teacherName:'Hoài Thanh',code:'THANH',className:'1/1',classType:'single',address:'A2'};
const other={day:2,session:'Sáng',period:1,teachingPeriod:1,schoolName:'VỸ DẠ',teacherName:'Lê Hữu Đức',code:'ĐỨC',className:'3/2',classType:'single',address:'A3'};
const assistKnown={day:6,session:'Chiều',period:1,teachingPeriod:1,schoolName:'PHÚ BÌNH',teacherName:'Hoài Thanh',code:'THANH',className:'1/1',classType:'single',isAssist:true,address:'P1'};
const assistUnknown={day:6,session:'Chiều',period:5,teachingPeriod:5,schoolName:'PHÚ BÌNH',teacherName:'Lê Hữu Đức',code:'ĐỨC',className:'Lớp không xác định',classType:'unknown',isAssist:true,address:'P2'};

const schools=api.collectSchoolOptions([mainA,mainB,other,assistKnown]);
assert.equal(schools.length,2,'cùng một trường ở nhiều cơ sở chỉ xuất hiện một lần trong danh sách trường');
assert.ok(schools.some(x=>x.name==='PHÚ BÌNH'));
assert.equal(api.filterBySchool([mainA,mainB,other,assistKnown],'PHÚ BÌNH').length,3,'lọc trường phải gom cả hai cơ sở của PHÚ BÌNH');

assert.equal(api.displayEntry(mainA,'class'),'5/4');
assert.equal(api.displayEntry(mainA,'teacher'),'Diệu Tâm');
assert.equal(api.displayEntry(mainA,'teacher-class'),'Diệu Tâm - 5/4');
assert.equal(api.displayEntry(assistKnown,'class'),'1/1 (P)');
assert.equal(api.displayEntry(assistKnown,'teacher'),'Hoài Thanh (P)');
assert.equal(api.displayEntry(assistKnown,'teacher-class'),'Hoài Thanh - 1/1 (P)');
assert.equal(api.displayEntry(assistUnknown,'class'),'Lớp không xác định (P)');
assert.equal(api.displayEntry(assistUnknown,'teacher-class'),'Lê Hữu Đức - Lớp không xác định (P)');

const grouped={...mainA,className:'KHỐI 1 (4 LỚP)',groupNote:'TIẾT 3 & KHỐI 1 (4 LỚP) - TIẾT 3'};
assert.match(api.displayEntry(grouped,'teacher-class'),/^Diệu Tâm - KHỐI 1 \(4 LỚP\)/,'lớp/khối gộp phải được giữ nguyên khi xem theo trường');

const slots=api.buildSlots([mainA,mainB,assistKnown],'teacher-class');
assert.equal(slots.get('2|Sáng|1').length,2,'không được làm mất phân công khi hai giáo viên cùng một khung giờ');
assert.equal(slots.get('6|Chiều|1').length,1);

const footer=api.footerText('PHÚ BÌNH',19,2);
assert.match(footer,/TỔNG: 19 lượt phân công/);
assert.match(footer,/2 Trợ \(P\)/);
assert.match(footer,/Trường: PHÚ BÌNH/);
assert.doesNotMatch(footer,/Giáo viên:/,'LBG theo trường phải ghi Trường thay cho Giáo viên');

console.log('OK school report: 3 modes, school aggregation, P labels, no slot dedupe, school footer');
