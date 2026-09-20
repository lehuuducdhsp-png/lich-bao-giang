'use strict';
const assert=require('node:assert/strict');
const V7=require('../ga-suggestion-v7.js');
const R=require('../ga-role-track-stale-repair-v1.js');
const Per=require('../ga-per-class-v2.js');

assert.equal(R.VERSION,'20260920.1');
assert.equal(Per.VERSION,'20260920.3');
assert.equal(V7.roleTrack('STEM').track,'stem');
assert.equal(V7.roleTrack('KNS').track,'kns');

// Ca thực tế lớp 3/9 tại THỦY PHƯƠNG:
// 7T9 HUỆ (KNS) -> 14T9 HƯƠNG đỏ (STEM) -> 21T9 HUỆ (KNS).
const sheets=[{name:'7T9'},{name:'14T9'},{name:'21T9'}];
const entriesBySheet={
  '7T9':[{
    code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:4,teachingPeriod:4,
    locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
    schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'AM176',row:176,col:39
  }],
  '14T9':[{
    code:'HƯƠNG',teacherName:'Phan Thị Quý Hương',day:5,session:'Sáng',period:4,teachingPeriod:4,
    locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
    schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'AM170',row:170,col:39
  }],
  '21T9':[{
    code:'HUỆ',teacherName:'Phan Thị Huệ',day:5,session:'Sáng',period:4,teachingPeriod:4,
    locationKey:'THUY PHUONG|25 DA LE',locationLabel:'THỦY PHƯƠNG\nTrụ sở chính: 25 DẠ LÊ',
    schoolName:'THỦY PHƯƠNG',className:'3/9',classRaw:'3/9',address:'AM170',row:170,col:39
  }]
};
const starts={
  '7T9':new Date(2026,8,7,12),
  '14T9':new Date(2026,8,14,12),
  '21T9':new Date(2026,8,21,12)
};
const redCell={font:{color:{argb:'FFFF0000'}}};
const blackCell={font:{color:{argb:'FF000000'}}};
const parser={scanAssignments(ws){return entriesBySheet[ws.name]||[]}};
const sheetCells={
  '7T9':{'AM176':blackCell},
  '14T9':{'AM170':redCell},
  '21T9':{'AM170':blackCell}
};
for(const ws of sheets){
  ws.getCell=(row,col)=>{
    const address=row===170&&col===39?'AM170':row===176&&col===39?'AM176':'';
    return sheetCells[ws.name]?.[address]||blackCell;
  };
}

// Fallback cố tình sai KNS; màu đỏ trong nguồn phải thắng.
const roleResolver=()=> 'KNS';
const safeBuild=R.wrapBuildHistory(V7.buildHistory);
const history=safeBuild({worksheets:sheets},'21T9',{
  parser,roleResolver,startDateFor:ws=>starts[ws.name],weekLike:()=>true
});
const kns=history.events.filter(x=>x.track==='kns');
const stem=history.events.filter(x=>x.track==='stem');
assert.deepEqual(kns.map(x=>x.ga),[1,2],'HUỆ KNS 7T9 -> 21T9 must be GA1 -> GA2');
assert.deepEqual(stem.map(x=>x.ga),[3],'HƯƠNG red 14T9 must stay on STEM sequence');

// Nếu history chọn snapshot cũ bị mất màu, workbook đang mở vẫn quyết định ban STEM.
const stale14={name:'14T9',getCell(){return blackCell}};
const current7={name:'7T9'},current14={name:'14T9'},current21={name:'21T9'};
const referenceBook={
  worksheets:[current7,current14,current21],
  getWorksheet(name){return this.worksheets.find(x=>x.name===name)||null}
};
const intelligence={
  summaryRoles(ws){
    if(ws===current14)return new Map([['HƯƠNG',{role:'STEM'}]]);
    return new Map();
  }
};
assert.equal(R.workbookRole(intelligence,referenceBook,'HƯƠNG'),'STEM');
assert.equal(R.roleFor(stale14,'HƯƠNG',{row:170,col:39},()=> 'KNS',referenceBook,intelligence),'STEM');

// Giả lập GA4 cũ đã được lưu trước khi tách đúng STEM/KNS.
const prev=kns[0],current=kns[1],middle=stem[0];
current.ga=4;
current.gaSource='manual';
current.previousEvents=[prev];
const staleHistory={events:[prev,middle,current]};
R.repairHistory(staleHistory);
assert.equal(current.ga,2,'stale GA4 must be repaired to canonical KNS GA2');
assert.equal(current.__lbgStaleRoleTrackManual,4);
assert.equal(current.__lbgRoleTrackExpected,2);

// Role-track repair chỉ được đánh dấu ứng viên stale, không được tự cấp quyền ghi đè storage.
const entries=[{
  day:5,session:'Sáng',schoolName:'THỦY PHƯƠNG',
  locationKey:'THUY PHUONG|25 DA LE',className:'3/9',classRaw:'3/9',address:'AM170'
}];
const loc=Per.locOf(entries[0]).key;
const classKey=Per.classGaKey(5,'Sáng',loc,'3/9');
const values={[classKey]:'4'};
const candidateEvent={...current,addresses:['AM170'],classId:'3/9',classDisplay:'3/9'};
const candidatePlan=Per.planApplications([candidateEvent],entries,values,v=>String(v||'').trim());
assert.equal(candidatePlan.apply.length,0,'role history marker alone must not overwrite stored class GA');
assert.equal(candidatePlan.conflicts.length,1);
assert.equal(candidateEvent.__lbgStaleRoleTrackVerified,undefined);

// Manual GA không có marker stale vẫn được bảo vệ.
const manualEvent={...candidateEvent,ga:2,gaSource:'previous'};
delete manualEvent.__lbgStaleRoleTrackManual;
delete manualEvent.__lbgRoleTrackExpected;
const protectedPlan=Per.planApplications([manualEvent],entries,values,v=>String(v||'').trim());
assert.equal(protectedPlan.apply.length,0);
assert.equal(protectedPlan.conflicts.length,1);

console.log('OK GA role-track repair: active workbook STEM is authoritative; 3/9 KNS is GA2; verified stale GA4 is overwritten safely');
