'use strict';
const assert=require('node:assert/strict');
const api=require('../school-report-v1.js');

assert.equal(api.VERSION,'20260914.3');
assert.deepEqual(api.MODES,{class:'Lớp',teacher:'Giáo viên','teacher-class':'Giáo viên - lớp'});
assert.deepEqual(api.layoutSpec(),{headerRow:4,morningStart:5,afternoonStart:10,footerRow:15,periods:5},'web và Excel phải chỉ có đúng 5 hàng tiết mỗi buổi, không còn hàng Tiết dư');

const mainA={day:2,session:'Sáng',period:1,teachingPeriod:1,schoolName:'PHÚ BÌNH',siteDisplay:'Cơ sở 1: PHÚ HẬU CŨ',teacherName:'Diệu Tâm',code:'TÂM',className:'5/4',classType:'single',address:'A1'};
const mainB={day:2,session:'Sáng',period:1,teachingPeriod:1,schoolName:'PHÚ BÌNH',siteDisplay:'Cơ sở 2: PHÚ BÌNH CŨ',teacherName:'Hoài Thanh',code:'THANH',className:'1/1',classType:'single',address:'A2'};
const other={day:2,session:'Sáng',period:1,teachingPeriod:1,schoolName:'VỸ DẠ',teacherName:'Lê Hữu Đức',code:'ĐỨC',className:'3/2',classType:'single',address:'A3'};
const assistKnown={day:6,session:'Chiều',period:1,teachingPeriod:1,schoolName:'PHÚ BÌNH',siteDisplay:'Cơ sở 2: PHÚ BÌNH CŨ',teacherName:'Hoài Thanh',code:'THANH',className:'1/1',classType:'single',isAssist:true,address:'P1'};
const assistUnknown={day:6,session:'Chiều',period:5,teachingPeriod:5,schoolName:'PHÚ BÌNH',siteDisplay:'Cơ sở 1: PHÚ HẬU CŨ',teacherName:'Lê Hữu Đức',code:'ĐỨC',className:'Lớp không xác định',classType:'unknown',isAssist:true,address:'P2'};

const schools=api.collectSchoolOptions([mainA,mainB,other,assistKnown]);
assert.equal(schools.length,2,'danh sách trường tổng quát vẫn nhận PHÚ BÌNH là một trường');
assert.ok(schools.some(x=>x.name==='PHÚ BÌNH'));
assert.equal(api.filterBySchool([mainA,mainB,other,assistKnown],'PHÚ BÌNH').length,3,'helper lọc trường tổng quát vẫn giữ tương thích');

const targets=api.collectSchoolSiteOptions([mainA,mainB,other,assistKnown]);
assert.equal(targets.length,3,'PHÚ BÌNH có hai cơ sở phải thành hai lựa chọn riêng, VỸ DẠ là lựa chọn thứ ba');
const phuBinhTargets=targets.filter(x=>x.school==='PHÚ BÌNH');
assert.equal(phuBinhTargets.length,2);
assert.ok(phuBinhTargets.some(x=>x.site==='Cơ sở 1: PHÚ HẬU CŨ'));
assert.ok(phuBinhTargets.some(x=>x.site==='Cơ sở 2: PHÚ BÌNH CŨ'));
const site1=phuBinhTargets.find(x=>x.site==='Cơ sở 1: PHÚ HẬU CŨ');
const site2=phuBinhTargets.find(x=>x.site==='Cơ sở 2: PHÚ BÌNH CŨ');
assert.deepEqual(api.filterBySchoolSite([mainA,mainB,other,assistKnown,assistUnknown],site1.key).map(x=>x.address).sort(),['A1','P2']);
assert.deepEqual(api.filterBySchoolSite([mainA,mainB,other,assistKnown,assistUnknown],site2.key).map(x=>x.address).sort(),['A2','P1']);

assert.equal(api.teacherCodeText(mainA),'TÂM');
assert.equal(api.displayEntry(mainA,'class'),'5/4');
assert.equal(api.displayEntry(mainA,'teacher'),'TÂM');
assert.equal(api.displayEntry(mainA,'teacher-class'),'TÂM - 5/4');
assert.equal(api.displayEntry(assistKnown,'class'),'1/1 (P)');
assert.equal(api.displayEntry(assistKnown,'teacher'),'THANH (P)');
assert.equal(api.displayEntry(assistKnown,'teacher-class'),'THANH - 1/1 (P)');
assert.equal(api.displayEntry(assistUnknown,'class'),'Lớp không xác định (P)');
assert.equal(api.displayEntry(assistUnknown,'teacher-class'),'ĐỨC - Lớp không xác định (P)');
assert.doesNotMatch(api.displayEntry(mainA,'teacher-class'),/Diệu Tâm/,'lịch trường không dùng họ tên giáo viên');

const grouped={...mainA,className:'KHỐI 1 (4 LỚP)',groupNote:'TIẾT 3 & KHỐI 1 (4 LỚP) - TIẾT 3'};
assert.match(api.displayEntry(grouped,'teacher-class'),/^TÂM - KHỐI 1 \(4 LỚP\)/,'lớp/khối gộp phải được giữ nguyên khi xem theo trường');

const slots=api.buildSlots([mainA,mainB,assistKnown],'teacher-class');
assert.equal(slots.get('2|Sáng|1').length,2,'không được làm mất phân công khi hai giáo viên cùng một khung giờ');
assert.equal(slots.get('6|Chiều|1').length,1);

assert.equal(api.reportLocationText('PHÚ BÌNH','Cơ sở 1: PHÚ HẬU CŨ'),'PHÚ BÌNH • Cơ sở 1: PHÚ HẬU CŨ');
const footer=api.footerText('PHÚ BÌNH',19,2,'Cơ sở 1: PHÚ HẬU CŨ');
assert.match(footer,/TỔNG: 19 lượt phân công/);
assert.match(footer,/2 Trợ \(P\)/);
assert.match(footer,/Trường: PHÚ BÌNH • Cơ sở 1: PHÚ HẬU CŨ/);
assert.doesNotMatch(footer,/Giáo viên:/,'LBG theo trường phải ghi Trường thay cho Giáo viên');

console.log('OK school report: compact 5-row sessions, split sites, teacher codes only, P labels, no slot dedupe, school footer');
