'use strict';
const assert=require('node:assert/strict');
const D=require('../daily-report-v1.js');

assert.equal(D.VERSION,'20260929.7');
const date=D.dateFromKey('2026-09-29');
assert.ok(date instanceof Date);
assert.equal(D.dayNoForDate(date),3,'29/9/2026 là Thứ Ba => day 3');
assert.equal(D.formatDateTitle(date),'Thứ Ba, ngày 29/09/2026');

const weekStart=new Date(2026,8,28,12);
const sixDays=D.weekDates(weekStart,false);
assert.deepEqual(sixDays.map(x=>[x.day,x.dateKey]),[
  [2,'2026-09-28'],[3,'2026-09-29'],[4,'2026-09-30'],[5,'2026-10-01'],[6,'2026-10-02'],[7,'2026-10-03']
],'Theo tuần mặc định phải tạo Thứ Hai đến Thứ Bảy');
const sevenDays=D.weekDates(weekStart,true);
assert.equal(sevenDays.length,7);
assert.deepEqual([sevenDays[6].day,sevenDays[6].dateKey],[8,'2026-10-04'],'chỉ thêm Chủ Nhật khi TKB có dạy Chủ Nhật');
assert.equal(D.sheetNameForDate(2,sixDays[0].date),'T2 28-09');
assert.equal(D.sheetNameForDate(8,sevenDays[6].date),'CN 04-10');
assert.deepEqual(D.DAILY_LAYOUT,{teacherColumn:1,morningStart:2,morningEnd:6,afternoonStart:7,afternoonEnd:11,totalColumn:12},
  'bố cục phải là GV dọc + 5 tiết sáng + 5 tiết chiều + tổng ngày');
const dailySource=require('fs').readFileSync('daily-report-v1.js','utf8');
assert.match(dailySource,/Theo tuần/,'giao diện phải có chế độ Theo tuần');
assert.match(dailySource,/LBG_THEO_TUAN_/,'phải có file Excel nguyên tuần');
assert.match(dailySource,/for\(const day of d\.days\)addExcelSheet/,'Excel tuần phải tạo mỗi ngày một worksheet');
assert.match(dailySource,/\.lbg-daily-controls \[hidden\]\{display:none!important\}/,'Ngày/Tuần không dùng phải ẩn thật để tiết kiệm chiều ngang');
assert.match(dailySource,/grid-template-columns:minmax\(110px/,'desktop phải dùng lưới điều khiển gọn');
assert.match(dailySource,/max-content max-content/,'Xem lịch và Xuất Excel phải nằm cạnh nhau khi đủ rộng');
assert.match(dailySource,/id="lbgDailyExportPng"/,'phải có nút Xuất PNG');
const oldAuth=globalThis.LBGAuth,oldAccess=globalThis.LBGAccess;
globalThis.LBGAuth={isOwner(){return true},profile:{role:'owner'}};
delete globalThis.LBGAccess;
assert.equal(D.authOwner(),true,'chủ sở hữu phải được nhận diện ngay từ Auth');
assert.equal(D.accessReady(),false);
assert.equal(D.canView(),true,'chủ sở hữu không được bị chặn trong lúc Access đang tải');
globalThis.LBGAccess={context:{is_owner:false,can_review_all_reports:true},isOwner(){return false},canReviewAllReports(){return true}};
assert.equal(D.accessReady(),true);
assert.equal(D.canView(),true,'khi Access sẵn sàng phải dùng đúng quyền can_review_all_reports');
globalThis.LBGAccess={context:{is_owner:false,can_review_all_reports:false},isOwner(){return false},canReviewAllReports(){return false}};
assert.equal(D.canView(),false,'không được mở quyền nhiều GV cho tài khoản không có quyền');
if(oldAuth===undefined)delete globalThis.LBGAuth;else globalThis.LBGAuth=oldAuth;
if(oldAccess===undefined)delete globalThis.LBGAccess;else globalThis.LBGAccess=oldAccess;
assert.match(dailySource,/LBGAuth\?\.onReady\?\.\(\(\)=>setTimeout\(refresh,0\)\)/,'module phải refresh lại khi Auth sẵn sàng');
assert.match(dailySource,/groupsLoaded=false/,'lỗi tải nhóm không được cache rỗng vĩnh viễn');
assert.match(dailySource,/daily-png-export-v1\.js\?v=20260929\.1/,'PNG exporter phải lazy-load từ module riêng');
assert.match(dailySource,/if\(d\.range!==['"]day['"]\)/,'giai đoạn 1 chỉ cho phép xuất PNG Theo ngày');
assert.match(dailySource,/width:2400,preferredScale:2/,'PNG ngày phải dùng khổ export cố định rõ nét');
assert.doesNotMatch(dailySource,/html2canvas@/,'daily report không được tải trực tiếp thư viện nặng lúc khởi động');
assert.match(dailySource,/BUỔI SÁNG/,'web phải có nhóm cột BUỔI SÁNG');
assert.match(dailySource,/BUỔI CHIỀU/,'web phải có nhóm cột BUỔI CHIỀU');
assert.match(dailySource,/B4:F4/,'Excel phải gộp 5 cột cho buổi sáng');
assert.match(dailySource,/G4:K4/,'Excel phải gộp 5 cột cho buổi chiều');
assert.match(dailySource,/morning-head/,'buổi sáng phải có theme riêng');
assert.match(dailySource,/afternoon-head/,'buổi chiều phải có theme riêng');

const book={worksheets:[
  {name:'21T9'},{name:'28T9'},{name:'5T10'}
]};
const found=D.findWeekForDate(book,date);
assert.ok(found,'phải tìm thấy tuần chứa ngày');
assert.equal(found.ws.name,'28T9','29/9 phải thuộc sheet 28T9');
assert.equal(found.day,3);

assert.equal(D.gradeOfEntry({classRaw:'3/9'}),3);
assert.equal(D.gradeOfEntry({className:'1/B - P 1.5'}),1);
assert.equal(D.gradeOfEntry({className:'KHỐI 4 (4 LỚP)'}),4);
assert.equal(D.gradeOfEntry({className:'LỚP 5'}),5);
assert.equal(D.gradeOfEntry({className:'Chưa xác định'}),0);

const teachers=[
  {code:'TÂM',name:'Diệu Tâm'},
  {code:'THANH',name:'Hoài Thanh'},
  {code:'LINH',name:'Mỹ Linh'},
  {code:'ĐỨC',name:'Lê Hữu Đức'}
];
const events=[
  {code:'TÂM',day:3,session:'Sáng',teachingPeriod:1,className:'1/2',schoolName:'QUANG TRUNG',ga:1},
  {code:'THANH',day:3,session:'Sáng',teachingPeriod:1,className:'3/9',schoolName:'VỸ DẠ',ga:2},
  {code:'LINH',day:3,session:'Chiều',teachingPeriod:2,className:'3/7',schoolName:'PHÚ HẬU',ga:2},
  {code:'ĐỨC',day:4,session:'Sáng',teachingPeriod:1,className:'3/6',schoolName:'TÂY LỘC',ga:2}
];

assert.deepEqual(
  D.resolveScopeCodes('teachers',{teachers,events,day:3,selectedCodes:['TÂM','ĐỨC']}),
  ['TÂM','ĐỨC'],
  'chọn giáo viên phải giữ đúng danh sách người dùng chọn'
);
const group={id:'g1',name:'KHỐI A',members:[{teacher_code:'TÂM'},{teacher_code:'ĐỨC'},{teacher_code:'KHÔNG-CÓ'}]};
assert.deepEqual(
  D.resolveScopeCodes('group',{teachers,group}),
  ['TÂM','ĐỨC'],
  'khối / nhóm phải lấy đúng thành viên đã quản lý và giao với GV khả dụng trong tuần'
);
assert.doesNotMatch(dailySource,/<option value="grade">/,'không được tạo scope Khối lớp giả');
assert.doesNotMatch(dailySource,/\[1,2,3,4,5\]\.map/,'không được hard-code Khối 1–5');
assert.match(dailySource,/report_picker_groups/,'khối / nhóm phải lấy từ dữ liệu quản lý hiện có');

const slots=D.buildDailySlots(events,['TÂM','THANH','LINH'],3);
assert.equal(slots.get('TÂM|Sáng|1').length,1);
assert.equal(slots.get('THANH|Sáng|1').length,1);
assert.equal(slots.get('LINH|Chiều|2').length,1);
assert.equal(slots.has('ĐỨC|Sáng|1'),false,'GV không được chọn không được tạo slot');

const lines=D.eventLines({schoolName:'LÊ LỢI',className:'1/B',roomRaw:'P 1.5',ga:1},'full');
assert.deepEqual(lines,['LÊ LỢI','1/B • P 1.5','GA 1']);
const pLines=D.eventLines({schoolName:'LÊ LỢI',className:'1/B',roomRaw:'P 1.5',ga:1,isAssist:true},'compact');
assert.match(pLines[0],/Trợ \(P\)/);
assert.match(pLines[0],/GA 1/);

const oldCleaner=globalThis.LBGReportEngineV4;
globalThis.LBGReportEngineV4={dailyLocationText(){return'THỦY LƯƠNG'}};
assert.equal(D.schoolText({schoolName:'THỦY LƯƠNG',locationLabel:'THỦY LƯƠNG\n+ Buổi sáng: 7h15 có mặt ở trường'}),'THỦY LƯƠNG','Lịch theo ngày phải dùng lớp làm sạch địa điểm');
if(oldCleaner===undefined)delete globalThis.LBGReportEngineV4;else globalThis.LBGReportEngineV4=oldCleaner;

const summaryEvents=[
  {code:'TÂM',day:3,isPlus:false,isAssist:false},
  {code:'TÂM',day:3,isPlus:true,isAssist:false},
  {code:'TÂM',day:3,isPlus:false,isAssist:true},
  {code:'TÂM',day:4,isPlus:false,isAssist:false}
];
assert.deepEqual(D.summarizeTeacher(summaryEvents,'TÂM',3),{main:1,plus:1,assist:1,total:3});

console.log('OK daily report: day/week modes, PNG day export lazy hook, one worksheet per day, GV rows, colors, groups, GA/room and totals');
