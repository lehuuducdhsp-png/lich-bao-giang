'use strict';
(function(){
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const keyText=v=>fold(v).replace(/[^A-Z0-9/+&.-]/g,'');
  const dateKey=d=>d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';
  let installed=false;

  function curriculum(){return window.LBGGaCurriculumV1}
  function dateFor(ws,dayNo){
    try{const start=typeof window.startDate==='function'?window.startDate(ws.name):null;if(!(start instanceof Date)||Number.isNaN(start.getTime()))return null;const d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d.setDate(d.getDate()+Math.max(0,Number(dayNo)-2));return d}catch{return null}
  }
  function splitMembers(e){
    if(e.classType==='combined-explicit')return txt(e.className).split(/\s*\+\s*/).map(txt).filter(Boolean);
    return e.className?[e.className]:[]
  }
  function actualPeriod(e){const direct=Number(e?.teachingPeriod);if(Number.isFinite(direct)&&direct>0)return direct;const m=txt(e?.groupNote||e?.classRaw).match(/\bTIẾT\s*([1-5])\b/i);if(m)return Number(m[1]);return Number(e?.period)||null}
  function payUnits(e){const n=Number(e?.payUnits);return Number.isFinite(n)&&n>0?n:1}

  function scanSheet(ws,api){
    const parser=window.LBGTkbParserV2,roles=api.summaryRoles(ws),assignments=parser.scanAssignments(ws),source=[];
    for(const e of assignments){const meta=roles.get(txt(e.code).toUpperCase()),date=dateFor(ws,e.day);source.push({...e,sheet:ws.name,teacherName:meta?.name||e.teacherName||e.code,role:meta?.role||'UNKNOWN',teacherColor:meta?.color||'',date,dateKey:dateKey(date)})}

    // source = từng ô mã GV để báo giảng/tính tiết. groups = sự kiện thực dạy của từng GV trước khi gộp phối hợp.
    const grouped=new Map();
    for(const e of source){
      const eventPeriod=actualPeriod(e),slotPeriod=Number(e.slotPeriod??e.period)||null,k=[e.code,e.locationKey,e.dateKey,e.day,e.session,eventPeriod].join('|');
      if(!grouped.has(k))grouped.set(k,{id:`${ws.name}|${k}`,sheet:ws.name,code:e.code,teacherName:e.teacherName,role:e.role,teacherColor:e.teacherColor,makeUp:false,day:e.day,session:e.session,period:eventPeriod,teachingPeriod:eventPeriod,slotPeriods:[],school:e.locationLabel||e.schoolName||e.school,schoolName:e.schoolName||e.school,schoolKey:fold(e.schoolName||e.school),siteName:e.siteName||'',siteDisplay:e.siteDisplay||'',locationLabel:e.locationLabel||e.school,locationKey:e.locationKey,locationNotes:[...(e.locationNotes||[])],date:e.date,dateKey:e.dateKey,source:[],addresses:[],classTexts:[],members:[],row:e.row,col:e.col,payPeriods:0});
      const g=grouped.get(k);g.source.push(e);g.addresses.push(e.address);g.payPeriods+=payUnits(e);g.makeUp=g.makeUp||e.makeUp;g.row=Math.min(g.row,e.row);g.col=Math.min(g.col,e.col);
      if(slotPeriod&&!g.slotPeriods.includes(slotPeriod))g.slotPeriods.push(slotPeriod);
      if(e.className&&!g.classTexts.includes(e.className))g.classTexts.push(e.className);
      for(const note of e.locationNotes||[])if(!g.locationNotes.includes(note))g.locationNotes.push(note);
      for(const m of splitMembers(e))if(!g.members.some(x=>keyText(x)===keyText(m)))g.members.push(m)
    }
    const groups=[...grouped.values()];groups.forEach(g=>{g.classDisplay=g.classTexts.join(' & ');g.slotPeriods.sort((a,b)=>a-b)});
    groups.sort((a,b)=>(a.date?.getTime()||0)-(b.date?.getTime()||0)||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||a.period-b.period||a.row-b.row||a.col-b.col);
    return{ws,roles,source,groups}
  }

  function orderedWeekSheets(){
    const book=(()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}})();if(!book)return[];
    const all=book.worksheets.map((ws,index)=>({ws,index,start:typeof window.startDate==='function'?window.startDate(ws.name):null})).filter(x=>typeof window.weekLike==='function'?window.weekLike(x.ws):true);
    return all.sort((a,b)=>{const at=a.start instanceof Date&&!Number.isNaN(a.start.getTime())?a.start.getTime():null,bt=b.start instanceof Date&&!Number.isNaN(b.start.getTime())?b.start.getTime():null;if(at!==null&&bt!==null&&at!==bt)return at-bt;if(at!==null)return-1;if(bt!==null)return 1;return a.index-b.index}).map(x=>x.ws)
  }

  function buildHistory(selectedSheet,api){
    const curr=curriculum();if(!curr)throw new Error('Bộ quy tắc GA KNS/STEM chưa sẵn sàng.');
    const sheets=orderedWeekSheets(),idx=sheets.findIndex(x=>x.name===selectedSheet);if(idx<0)throw new Error('Không tìm thấy tuần đang chọn trong file TKB.');
    // Gộp theo sự kiện thực dạy trên toàn bộ các tuần đã có. KNS + CTV cùng lớp/tiết chỉ làm GA tiến đúng 1 lần.
    const rawEvents=sheets.slice(0,idx+1).flatMap(ws=>scanSheet(ws,api).groups).map(e=>({...e,actualCategory:curr.category(e.role)}));
    const events=curr.assignProgression(curr.coalesce(rawEvents)),byAddress=new Map();
    for(const event of events){
      event.expectedCategory=event.actualCategory;
      event.cooperative=(event.teacherCodes||[]).length>1;
      event.cooperationLabel=event.cooperative?`Phối hợp: ${(event.teacherNames||[]).join(' + ')}`:'';
      for(const a of event.addresses||[])byAddress.set(`${event.sheet}!${a}`,event)
    }
    return{selectedSheet,sheets:sheets.slice(0,idx+1).map(x=>x.name),events,byAddress}
  }

  function install(){
    if(installed)return true;const parser=window.LBGTkbParserV2,api=window.LBGTeacherIntelligenceV6;if(!parser||!api?.summaryRoles||!curriculum())return false;
    api.scanSheet=ws=>scanSheet(ws,api);api.buildHistory=sheet=>buildHistory(sheet,api);api.__lbgParserV2=true;api.__lbgParserBridgeV2=true;api.__lbgAtomicTeachingEvents=true;api.__lbgCategoryProgression=true;
    installed=true;document.dispatchEvent(new CustomEvent('lbg-tkb-parser-v2-ready'));document.dispatchEvent(new CustomEvent('lbg-ga-progression-ready'));return true
  }
  if(install())return;let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>300)clearInterval(timer)},50);
})();
