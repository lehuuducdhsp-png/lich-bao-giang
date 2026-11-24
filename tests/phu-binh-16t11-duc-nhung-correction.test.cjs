'use strict';
const assert=require('node:assert/strict');
const R=require('../tkb-roster-group-period-safe-v1.js');
const GA=require('../ga-suggestion-v7.js');
assert.equal(R.VERSION,'20261124.1');
const oldSite='PHU BINH|CO SO 2|PHU BINH CU';
const base={schoolName:'PHÚ BÌNH',school:'PHÚ BÌNH',siteName:'Phú Bình',
  siteDisplay:'Cơ sở: Phú Bình',locationKey:oldSite,day:4,session:'Chiều',
  period:4,classType:'single',classCount:1};
const duc={...base,code:'ĐỨC',className:'2/7',classRaw:'2/7',row:85,col:33,address:'AG85'};
const nhung={...base,code:'NHUNG',className:'3/7',classRaw:'3/7',row:88,col:33,address:'AG88'};
const other={...base,code:'TÂM',className:'3/5',classRaw:'3/5',row:89,col:32,address:'AF89'};
const ws={name:'16T11'};
const original=[duc,nhung,other];
const corrected=R.confirmedNov18PhuBinh(original,ws);
assert.equal(corrected[0].className,'3/7');
assert.equal(corrected[0].classRaw,'3/7');
assert.equal(corrected[1].className,'2/7');
assert.equal(corrected[1].classRaw,'2/7');
assert.equal(corrected[0].confirmedOriginalClass,'2/7');
assert.equal(corrected[1].confirmedOriginalClass,'3/7');
assert.equal(corrected[0].confirmedActualClass,'3/7');
assert.equal(corrected[1].confirmedActualClass,'2/7');
assert.equal(original[0].className,'2/7','không ghi đè file TKB nguồn');
assert.equal(original[1].className,'3/7');
assert.equal(corrected[2],other,'giáo viên/lớp khác không bị chạm');
assert.equal(corrected[0].address,duc.address,'bảo toàn tọa độ ô');
assert.equal(corrected[1].period,4,'không thay tiết học');
assert.equal(R.confirmedNov18PhuBinh(original,{name:'23T11'}),original,'tuần sau không đảo');
assert.equal(R.confirmedNov18PhuBinh([duc],ws)[0],duc,'thiếu cặp không tự suy diễn');
assert.equal(R.confirmedNov18PhuBinh([
  {...duc,className:'5/6',classRaw:'5/6'},nhung],ws)[1],nhung,'TKB bản cũ Đức 5/6, Nhung 3/7 không đảo một phía');
assert.equal(R.confirmedNov18PhuBinh([
  {...duc,siteName:'Phú Hậu',siteDisplay:'Cơ sở: Phú Hậu'},
  {...nhung,siteName:'Phú Hậu',siteDisplay:'Cơ sở: Phú Hậu'}],ws)[0].className,'2/7','không đổi cơ sở Phú Hậu');
assert.equal(R.confirmedNov18PhuBinh([{...duc,day:5}, {...nhung,day:5}],ws)[0].className,'2/7','không đổi thứ Năm');
assert.equal(R.confirmedNov18PhuBinh([duc,{...nhung,period:5}],ws)[0].className,'2/7','không hoán đổi hai tiết khác nhau');
const p={scanAssignments(_ws,code=''){return corrected.filter(e=>!code||e.code===code)}};
const dp=R.confirmedNov18Assist(ws,86,33,'ĐỨC',p);
const np=R.confirmedNov18Assist(ws,89,33,'NHUNG',p);
assert.equal(dp.className,'3/7','ĐỨCP cùng lớp thực dạy của Đức');
assert.equal(np.className,'2/7','NHUNGP cùng lớp thực dạy của Nhung');
assert.equal(R.confirmedNov18Assist(ws,87,33,'ĐỨC',p),null,'P không đúng hàng không bị sửa');
assert.equal(R.confirmedNov18Assist(ws,86,32,'ĐỨC',p),null,'P khác cột không bị mượn lớp');
assert.equal(R.confirmedNov18Assist({name:'23T11'},86,33,'ĐỨC',p),null);
const dates={'09T11':new Date(2026,10,9,12),'16T11':new Date(2026,10,16,12),'23T11':new Date(2026,10,23,12)};
const prior=(code,cls,row,week)=>({...base,code,className:cls,classRaw:cls,row,
 col:33,address:'AG'+row});
const weeks=[
{name:'09T11',rows:[prior('NHUNG','2/7',65,'09T11'),prior('ĐỨC','3/7',68,'09T11')]},
{name:'16T11',rows:corrected.slice(0,2)},
{name:'23T11',rows:[prior('THẢO','2/7',55,'23T11'),prior('HƯƠNG','3/7',58,'23T11')]}
];
const history=GA.buildHistory({worksheets:weeks},'23T11',{
 parser:{scanAssignments(w){return w.rows}},
 roleResolver:()=> 'KNS',
 startDateFor:w=>dates[w.name],
 weekLike:()=>true
});
const d16=history.byAddress.get('16T11!AG85');
const n16=history.byAddress.get('16T11!AG88');
assert.ok(d16&&n16);
assert.deepEqual(d16.members,['3/7']);
assert.deepEqual(n16.members,['2/7']);
assert.equal(d16.participants[0].code,'ĐỨC');
assert.equal(n16.participants[0].code,'NHUNG');
const three23=history.events.find(e=>e.sheet==='23T11'&&e.members.includes('3/7'));
const two23=history.events.find(e=>e.sheet==='23T11'&&e.members.includes('2/7'));
assert.ok(three23.previousEvents.some(e=>e.sheet==='16T11'&&e.participants.some(p=>p.code==='ĐỨC')),
 'GA lớp 3/7 phải tiếp nối lịch sử buổi Đức thực dạy');
assert.ok(two23.previousEvents.some(e=>e.sheet==='16T11'&&e.participants.some(p=>p.code==='NHUNG')),
 'GA lớp 2/7 phải tiếp nối lịch sử buổi Nhung thực dạy');
console.log('PASS: Phú Bình CS2 16T11 thứ Tư: ĐỨC/ĐỨCP 3/7, NHUNG/NHUNGP 2/7; GA lịch sử đúng, các tuần khác không bị đổi.');
