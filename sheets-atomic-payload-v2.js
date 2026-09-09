'use strict';
(function(){
  const VERSION='20260909.2';
  const txt=v=>String(v??'').trim();
  let installed=false;

  function currentBook(){try{return typeof wb!=='undefined'?wb:null}catch{return null}}
  function worksheetFor(body){
    const book=currentBook(),name=txt(body?.sourceSheet||body?.weekLabel||document.getElementById('week')?.value);
    return book&&name?book.getWorksheet?.(name):null;
  }
  function cellText(cell){
    try{
      const t=txt(cell?.text);if(t)return t;
      const v=cell?.value;if(v===null||v===undefined)return'';
      if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return txt(v);
      if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));
      if(v?.result!==null&&v?.result!==undefined)return txt(v.result);
      return'';
    }catch{return''}
  }
  function explicitPeriod(e){
    for(const value of [e?.groupNote,e?.classRaw,e?.className]){
      const m=txt(value).match(/(?:^|[-–—\s])TI[ẾE]T\s*([1-9]\d*)\s*$/i);if(m)return Number(m[1]);
    }
    return null;
  }
  function fullClass(e){
    const raw=txt(e?.classRaw);if(raw)return raw;
    const base=txt(e?.className),note=txt(e?.groupNote);return note?`${base} - ${note}`:base;
  }
  function fullLocation(e){
    const explicit=txt(e?.locationLabel);if(explicit)return explicit;
    const school=txt(e?.schoolName||e?.school),site=txt(e?.siteDisplay||e?.siteName);return site?[school,site].filter(Boolean).join('\n'):school;
  }
  function normalizeAtomic(e){
    const sourcePeriod=Number(e?.slotPeriod??e?.period)||null,teachingPeriod=explicitPeriod(e)||Number(e?.teachingPeriod)||sourcePeriod||null,raw=fullClass(e),address=txt(e?.address||e?.sourceCell),explicit=explicitPeriod(e);
    return{
      index:0,day:Number(e?.day),session:txt(e?.session),period:teachingPeriod,teachingPeriod,slotPeriod:sourcePeriod,sourcePeriod,
      school:fullLocation(e),schoolName:txt(e?.schoolName||e?.school),siteName:txt(e?.siteName),siteDisplay:txt(e?.siteDisplay||e?.siteName),locationKey:txt(e?.locationKey),
      className:raw,classBase:txt(e?.className),classRaw:raw,classType:txt(e?.classType),classCount:Number(e?.classCount)||1,groupNote:txt(e?.groupNote),
      sourceCode:txt(e?.sourceCode||e?.code),sourceCells:address?[address]:[],sourceCell:explicit?'':address,address:explicit?'':address
    };
  }
  function plusAssignments(ws,parser,base,mainAssignments){
    if(!ws||!parser?.timetableColumns||!parser?.colInfoFor)return[];
    const target=`${base}+`,cols=parser.timetableColumns(ws)||[],start=Math.max(1,Number(parser?.buildHeader?.(ws)?.headerRow||4)+1),out=[];
    for(const col of cols){
      const info=parser.colInfoFor(ws,col);if(!info)continue;
      for(let row=start;row<=Number(ws.rowCount||0);row++){
        const cell=ws.getCell(row,col);if(cellText(cell).toUpperCase()!==target)continue;
        const candidates=mainAssignments.filter(e=>Number(e.row)===row&&Number(e.day)===Number(info.day)&&txt(e.session)===txt(info.session));
        const nearest=[...candidates].sort((a,b)=>Math.abs(Number(a.col)-col)-Math.abs(Number(b.col)-col))[0];
        if(!nearest)continue;
        out.push({...nearest,code:base,sourceCode:target,address:cell.address||`${col}:${row}`,row,col,period:Number(info.period)||Number(nearest.period)||null,slotPeriod:Number(info.period)||Number(nearest.period)||null});
      }
    }
    return out;
  }
  function atomicEntries(body){
    const ws=worksheetFor(body),parser=window.LBGTkbParserV2,base=txt(body?.teacherCode).toUpperCase();
    if(!ws||!parser?.scanAssignments||!base)return null;
    const main=parser.scanAssignments(ws,base)||[],plus=plusAssignments(ws,parser,base,main),all=[...main,...plus];
    all.sort((a,b)=>Number(a.day)-Number(b.day)||((txt(a.session)==='Sáng'?0:1)-(txt(b.session)==='Sáng'?0:1))||Number(a.period)-Number(b.period)||Number(a.row)-Number(b.row)||Number(a.col)-Number(b.col));
    return all.map(normalizeAtomic).map((e,i)=>({...e,index:i+1}));
  }
  function normalizeBody(body){
    if(!body||typeof body!=='object')return body;
    const entries=atomicEntries(body);if(!entries?.length)return body;
    const base=txt(body.teacherCode).toUpperCase(),main=entries.filter(e=>txt(e.sourceCode).toUpperCase()===base).length,plus=entries.filter(e=>txt(e.sourceCode).toUpperCase()===`${base}+`).length,total=main+plus;
    return{
      ...body,
      entries,
      schedule:entries.map(e=>({...e})),
      mainPeriods:main,
      plusPeriods:plus,
      total,
      totalPeriods:total,
      totalText:plus?`TỔNG: ${main} tiết + ${plus} tiết = ${total} tiết`:`TỔNG: ${main} tiết`,
      reportSemanticsVersion:VERSION,
      entriesAreAtomicAssignments:true,
      entriesAreTeachingEvents:false,
      periodSemantics:'teachingPeriod',
      sourceCountSemantics:'atomicTeacherCodeCellsIncludingPlus'
    };
  }
  function patchClient(client){
    const fn=client?.functions;if(!fn||typeof fn.invoke!=='function'||fn.__lbgAtomicSheetsPatched)return false;
    const original=fn.invoke.bind(fn);fn.invoke=function(name,options){
      if(name==='google-sheets-owner'&&options&&typeof options==='object')return original(name,{...options,body:normalizeBody(options.body)});
      return original(name,options);
    };fn.__lbgAtomicSheetsPatched=true;return true;
  }
  function install(){
    if(installed)return true;const auth=window.LBGAuth;if(!auth)return false;
    let ok=patchClient(auth.client);auth.onReady?.(a=>{ok=patchClient(a?.client)||ok});installed=ok;return ok;
  }
  function boot(){if(install())return;let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>200)clearInterval(t)},50)}
  window.LBGSheetsAtomicPayloadV2={version:VERSION,explicitPeriod,normalizeAtomic,plusAssignments,atomicEntries,normalizeBody,patchClient};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
