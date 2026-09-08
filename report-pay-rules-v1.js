'use strict';
(function(){
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');

  function reportPeriod(entry){
    const direct=Number(entry?.teachingPeriod);
    if(Number.isFinite(direct)&&direct>=1&&direct<=5)return direct;
    const m=txt(entry?.groupNote||entry?.classRaw).match(/\bTIẾT\s*([1-5])\b/i);
    if(m)return Number(m[1]);
    const slot=Number(entry?.slotPeriod??entry?.period);
    return Number.isFinite(slot)&&slot>=1&&slot<=5?slot:null;
  }

  function classText(entry){
    const raw=txt(entry?.classRaw);
    if(raw)return raw;
    const base=txt(entry?.className),note=txt(entry?.groupNote);
    return note?`${base} - ${note}`:base;
  }

  function displayEntries(entries,day,session,period){
    const out=[],seen=new Set();
    for(const entry of entries||[]){
      if(Number(entry?.day)!==Number(day)||txt(entry?.session)!==txt(session)||reportPeriod(entry)!==Number(period))continue;
      const location=txt(entry?.locationKey||entry?.locationLabel||entry?.schoolName||entry?.school);
      const key=[fold(location),fold(classText(entry)),reportPeriod(entry)].join('|');
      if(seen.has(key))continue;
      seen.add(key);out.push(entry);
    }
    return out;
  }

  function cellText(cell){
    try{
      const t=txt(cell?.text);if(t)return t;
      const v=cell?.value;
      if(v===null||v===undefined)return'';
      if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return txt(v);
      if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));
      if(v?.result!==null&&v?.result!==undefined)return txt(v.result);
      return'';
    }catch{return''}
  }

  function scanPlus(ws,teacherCode,options={}){
    if(!ws)return 0;
    const base=txt(teacherCode).toUpperCase();if(!base)return 0;
    const parser=window.LBGTkbParserV2;
    const cols=typeof parser?.timetableColumns==='function'?parser.timetableColumns(ws):[];
    if(!cols.length)return 0;
    const allowed=new Set((options.allowedDays||[]).map(Number).filter(Number.isFinite));
    const header=typeof parser?.buildHeader==='function'?parser.buildHeader(ws):null;
    const start=Math.max(1,Number(header?.headerRow||4)+1),target=`${base}+`;
    let total=0;
    for(const col of cols){
      const info=typeof parser?.colInfoFor==='function'?parser.colInfoFor(ws,col):null;
      if(allowed.size&&(!info||!allowed.has(Number(info.day))))continue;
      for(let row=start;row<=Number(ws.rowCount||0);row++)if(cellText(ws.getCell(row,col)).toUpperCase()===target)total++;
    }
    return total;
  }

  function totals(main,plus){
    const m=Math.max(0,Math.round(Number(main)||0)),p=Math.max(0,Math.round(Number(plus)||0));
    return{main:m,plus:p,total:m+p};
  }
  function totalText(main,plus){const t=totals(main,plus);return t.plus?`TỔNG: ${t.main} tiết + ${t.plus} tiết = ${t.total} tiết`:`TỔNG: ${t.main} tiết`}
  function weekLabel(main,plus){const t=totals(main,plus);return t.plus?`${t.main} Chính (T) + Cộng ${t.plus}`:`${t.main} Chính (T)`}

  window.LBGReportPayRulesV1={version:'20260908.1',reportPeriod,classText,displayEntries,scanPlus,totals,totalText,weekLabel};
})();
