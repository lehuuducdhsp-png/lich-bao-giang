'use strict';
(function(){
  const VERSION='20260909.1';
  const txt=v=>String(v??'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const current=()=>{try{return typeof result!=='undefined'?result:null}catch{return null}};

  function explicitPeriod(entry){
    const values=[entry?.groupNote,entry?.classRaw,entry?.className];
    for(const value of values){const m=txt(value).match(/(?:^|[-–—\s])TI[ẾE]T\s*([1-9]\d*)\s*$/i);if(m)return Number(m[1])}
    return null;
  }
  function actualPeriod(entry){const n=explicitPeriod(entry);if(n)return n;const x=Number(entry?.teachingPeriod??entry?.period);return Number.isFinite(x)&&x>0?x:null}
  function locationId(entry){return txt(entry?.locationKey)||[fold(entry?.schoolName||entry?.school),fold(entry?.siteDisplay||entry?.siteName)].join('|')}
  function fullClass(entry){return txt(entry?.classRaw||entry?.className)}
  function normalizeOne(entry){
    const sourcePeriod=Number(entry?.slotPeriod??entry?.sourcePeriod??entry?.period)||null,teachingPeriod=actualPeriod(entry)||sourcePeriod||null,raw=fullClass(entry);
    return{...entry,period:teachingPeriod,teachingPeriod,slotPeriod:sourcePeriod,sourcePeriod,className:raw||txt(entry?.className),classRaw:raw||txt(entry?.classRaw),classBase:txt(entry?.classBase||entry?.className),sourceCells:[...new Set([...(Array.isArray(entry?.sourceCells)?entry.sourceCells:[]),txt(entry?.sourceCell||entry?.address)].filter(Boolean))]}
  }
  function normalizeEntries(list){
    const out=[],grouped=new Map();
    for(const source of Array.isArray(list)?list:[]){
      if(!source||typeof source!=='object')continue;const entry=normalizeOne(source),explicit=explicitPeriod(source);
      if(!explicit){out.push(entry);continue}
      const key=[Number(entry.day),txt(entry.session),locationId(entry),fold(entry.classRaw||entry.className),Number(entry.teachingPeriod)].join('|');
      const old=grouped.get(key);if(!old){grouped.set(key,entry);out.push(entry);continue}
      old.sourceCells=[...new Set([...(old.sourceCells||[]),...(entry.sourceCells||[])])];old.sourceCell=old.sourceCells[0]||old.sourceCell;old.address=old.sourceCell||old.address;
    }
    return out.map((e,i)=>({...e,index:i+1}));
  }
  function totalsFromCurrent(body){
    const a=current();if(!a||txt(body?.teacherCode).toUpperCase()!==txt(a?.code).toUpperCase())return null;
    try{return window.LBGReportEngineV4?.reportTotals?.(a)||null}catch{return null}
  }
  function normalizeBody(body){
    if(!body||typeof body!=='object')return body;
    const next={...body},entries=normalizeEntries(body.entries||body.schedule||[]),totals=totalsFromCurrent(body);
    next.entries=entries;next.schedule=entries.map(e=>({...e}));next.reportSemanticsVersion=VERSION;next.entriesAreTeachingEvents=true;next.periodSemantics='teachingPeriod';
    if(totals){next.mainPeriods=Number(totals.main)||0;next.plusPeriods=Number(totals.plus)||0;next.total=Number(totals.total)||0;next.totalPeriods=Number(totals.total)||0;next.totalText=window.LBGReportEngineV4?.reportTotalText?.(current())||''}
    const a=current();if(a&&txt(body?.teacherCode).toUpperCase()===txt(a?.code).toUpperCase()){
      try{window.LBGSheetsGaSyncCompatV1?.hydrate?.(a)}catch{}
      if(a.gaValues&&typeof a.gaValues==='object'){next.gaValues={...a.gaValues};next.lessonPlanCounts={...a.gaValues}}
    }
    return next;
  }
  function patchClient(client){
    const fn=client?.functions;if(!fn||typeof fn.invoke!=='function'||fn.__lbgModernSheetsPatched)return false;
    const original=fn.invoke.bind(fn);fn.invoke=function(name,options){if(name==='google-sheets-owner'&&options&&typeof options==='object')return original(name,{...options,body:normalizeBody(options.body)});return original(name,options)};fn.__lbgModernSheetsPatched=true;return true;
  }
  function syncPrompt(){
    const p=document.getElementById('sheetSavePrompt'),a=current();if(!p||!a)return;let totals=null;try{totals=window.LBGReportEngineV4?.reportTotals?.(a)}catch{}if(!totals)return;
    p.textContent=p.textContent.replace(/•\s*\d+\s*tiết\s*•/i,`• ${Number(totals.total)||0} tiết •`);if(Number(totals.plus)>0&&!/cộng/i.test(p.textContent))p.textContent+=` • ${Number(totals.main)||0} chính + ${Number(totals.plus)||0} cộng`;
  }
  function install(){const auth=window.LBGAuth;if(!auth)return false;let ok=patchClient(auth.client);auth.onReady?.(a=>{ok=patchClient(a?.client)||ok});return ok}
  document.addEventListener('click',event=>{if(event.target?.closest?.('#saveSheets'))setTimeout(syncPrompt,30)},true);
  window.LBGSheetsModernSyncV1={version:VERSION,explicitPeriod,actualPeriod,normalizeOne,normalizeEntries,normalizeBody,patchClient};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
