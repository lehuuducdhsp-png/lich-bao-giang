'use strict';
(function(){
  const VERSION='20260909.1';
  const txt=v=>String(v??'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  let installed=false;

  function currentBook(){try{return typeof wb!=='undefined'?wb:null}catch{return null}}
  function worksheetFor(body){
    const book=currentBook(),name=txt(body?.sourceSheet||body?.weekLabel||document.getElementById('week')?.value);
    return book&&name?book.getWorksheet?.(name):null;
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
      sourceCode:txt(e?.code||e?.sourceCode),sourceCells:address?[address]:[],sourceCell:explicit?'':address,address:explicit?'':address
    };
  }
  function atomicEntries(body){
    const ws=worksheetFor(body),parser=window.LBGTkbParserV2,base=txt(body?.teacherCode).toUpperCase();
    if(!ws||!parser?.scanAssignments||!base)return null;
    const all=parser.scanAssignments(ws)||[],targetPlus=`${base}+`;
    return all.filter(e=>{const code=txt(e?.code).toUpperCase();return code===base||code===targetPlus}).map(normalizeAtomic).map((e,i)=>({...e,index:i+1}));
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
      sourceCountSemantics:'atomicTeacherCodeCells'
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
  window.LBGSheetsAtomicPayloadV2={version:VERSION,explicitPeriod,normalizeAtomic,atomicEntries,normalizeBody,patchClient};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
