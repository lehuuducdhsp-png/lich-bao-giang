'use strict';
const assert=require('node:assert/strict');
const D=require('../daily-report-v1.js');

assert.equal(D.VERSION,'20260929.1');
const date=D.dateFromKey('2026-09-29');
assert.ok(date instanceof Date);
assert.equal(D.dayNoForDate(date),3,'29/9/2026 là Thứ Ba => day 3');
assert.equal(D.formatDateTitle(date),'Thứ Ba, ngày 29/09/2026');

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
assert.deepEqual(
  D.resolveScopeCodes('grade',{teachers,events,day:3,grade:3}).sort(),
  ['LINH','THANH'],
  'Khối 3 chỉ chọn GV thực sự dạy khối 3 trong ngày'
);
const group={id:'g1',members:[{teacher_code:'TÂM'},{teacher_code:'ĐỨC'},{teacher_code:'KHÔNG-CÓ'}]};
assert.deepEqual(
  D.resolveScopeCodes('group',{teachers,events,day:3,group}),
  ['TÂM','ĐỨC'],
  'nhóm phải giao với danh sách GV khả dụng trong tuần'
);

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

const summaryEvents=[
  {code:'TÂM',day:3,isPlus:false,isAssist:false},
  {code:'TÂM',day:3,isPlus:true,isAssist:false},
  {code:'TÂM',day:3,isPlus:false,isAssist:true},
  {code:'TÂM',day:4,isPlus:false,isAssist:false}
];
assert.deepEqual(D.summarizeTeacher(summaryEvents,'TÂM',3),{main:1,plus:1,assist:1,total:3});

console.log('OK daily report: 29/9 -> 28T9, horizontal teacher scopes, grade/group filtering, GA/room display, daily totals');
