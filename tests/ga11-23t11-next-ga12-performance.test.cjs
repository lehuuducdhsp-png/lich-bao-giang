'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const N=require('../ga-kns-november-2026-safe-v1.js');
const D=require('../ga-progress-dashboard-v1.js');
assert.equal(N.VERSION,'20261127.2');
assert.equal(D.VERSION,'20261127.2');
const when={ '26T10':'2026-10-26','09T11':'2026-11-09','16T11':'2026-11-16',
 '23T11':'2026-11-23','30T11':'2026-11-30','07T12':'2026-12-07'};
let id=0;
function make({school='PHÚ TÂN',site='PHU TAN|',cls='4/6',code='ĐỨC',sheet='23T11',
  ga=11,source='previous',track='kns',day=6,session='Chiều',period=4}={}){
 const dateKey=when[sheet];
 return{id:String(++id),sheet,dateKey,date:new Date(dateKey+'T12:00:00+07:00'),
   school,locationKey:site,grade:Number(cls[0]),members:[cls],classDisplay:cls,track,
   ga,gaSource:source,day,session,period,teachingPeriod:period,
   participants:[{code}],atoms:[{code,schoolName:school}]};
}
const phuTan=[
 make({sheet:'26T10',ga:8}),make({sheet:'09T11',ga:10}),
 make({sheet:'16T11',ga:9}),make({sheet:'23T11',ga:12}),
 make({sheet:'30T11',ga:9,code:'THẢO'}),make({sheet:'07T12',ga:9,code:'THẢO'})];
const hth={
 school:'HÀ THẾ HẠNH',site:'HA THE HANH|TU HA 1 CU',cls:'3/4',
 code:'M.LINH',day:4,session:'Sáng',period:5
};
const haTheHanh=[
 make({...hth,sheet:'26T10',ga:8}),make({...hth,sheet:'09T11',ga:10}),
 make({...hth,sheet:'16T11',ga:9}),make({...hth,sheet:'23T11',ga:12}),
 make({...hth,sheet:'30T11',ga:9,code:'TÂM'})];
const otherSite=[make({school:'THỦY DƯƠNG',site:'THUY DUONG|40 VO DUY NINH',cls:'5/3',
 code:'ĐỨC',sheet:'23T11',day:5,session:'Chiều',period:4,ga:12}),
 make({school:'THỦY DƯƠNG',site:'THUY DUONG|40 VO DUY NINH',cls:'5/3',
 code:'ĐỨC',sheet:'30T11',day:5,session:'Chiều',period:4,ga:14})];
assert.equal(N.confirmedGa11At23(phuTan[3],['4/6']),true,'Phú Tân 4/6 xác nhận GA11');
assert.equal(N.confirmedGa11At23(haTheHanh[3],['3/4']),true,'Hà Thế Hạnh 3/4 GA11');
assert.equal(N.confirmedGa11At23(otherSite[0],['5/3']),false,'Không ảnh hưởng Thủy Dương');
assert.equal(N.confirmedGa11At23(make({cls:'4/5'}),['4/5']),false,'Không đổi lớp khác');
assert.equal(N.confirmedGa11At23(make({code:'NHUNG'}),['4/6']),false,'Không đổi giáo viên khác');
assert.equal(N.confirmedGa11At23(make({sheet:'16T11'}),['4/6']),false,'Không sửa tuần đặc biệt');
const result=N.apply({events:[...phuTan,...haTheHanh,...otherSite],warnings:[]});
assert.deepEqual(phuTan.map(x=>x.ga),[8,10,9,11,12,14],
 'Phú Tân: 23T11 GA11 → 30T11 GA12 → 07T12 GA14');
assert.deepEqual(haTheHanh.map(x=>x.ga),[8,10,9,11,12],
 'Hà Thế Hạnh: 23T11 GA11 → 30T11 GA12');
assert.deepEqual(otherSite.map(x=>x.ga),[12,14],
 'Thủy Dương không bị sửa nhầm');
assert.match(phuTan[3].gaSource,/confirmed-23t11-ga11/);
assert.match(phuTan[4].gaSource,/kns-after-ga11-anchor/);
const original=result.events.map(x=>x.ga);
N.apply(result);assert.deepEqual(result.events.map(x=>x.ga),original,'áp dụng lại không tăng GA');
const summary=D.summarizeTrack(phuTan.slice(0,4),'kns');
assert.equal(summary.lastGa,11);assert.equal(summary.nextGa,12,'Bảng tiến độ đề xuất GA12');
const future=D.summarizeTrack(phuTan.slice(0,5),'kns');
assert.equal(future.nextGa,14,'Sau GA12 thì đến GA14 theo chuỗi KNS');
const manual=[
 make({sheet:'23T11',ga:11,source:'manual'}),make({sheet:'30T11',ga:14,source:'manual'})];
const inspected=N.apply({events:manual,warnings:[]});
assert.equal(manual[1].ga,14,'Không ghi đè GA nhập tay tuần sau');
assert.equal(manual[1].__lbgGaNeedsConfirmation.expected,12);
assert.ok(inspected.warnings.some(x=>x.includes('không ghi đè')));
const dashboard=fs.readFileSync('ga-progress-dashboard-v1.js','utf8');
const teacher=fs.readFileSync('teacher-intelligence-v6.js','utf8');
const engine=fs.readFileSync('report-engine-v4.js','utf8');
assert.doesNotMatch(dashboard,/setTimeout\(runAnalysis,120\)/,
 'Dashboard không tự chạy quét toàn trường khi mở trang');
assert.match(dashboard,/setInterval\(tick,1500\)/,
 'Polling chỉ đọc danh sách tuần theo nhịp chậm hơn');
assert.doesNotMatch(teacher,/setInterval\(\(\)=>\{if\(!document\.hidden\)start\(\)\},3500\)/);
assert.match(teacher,/clearInterval\(timer\);return;/,
 'Đã gắn UI thì dừng polling');
assert.match(engine,/queueTimer=setTimeout\(\(\)=>\{queueTimer=null;install\(\)\},400\)/,
 'DOM refresh giới hạn tối đa 2.5 lần/giây');
console.log('PASS: GA11 23T11 → GA12 30T11, GA14 tiếp theo; bảo vệ Thủy Dương, GA nhập tay; giảm polling và bỏ auto scan.');
