'use strict';
(function(){
  const VERSION='20260912.3';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const withP=value=>{const text=txt(value)||'Lớp chưa xác định';return /\(P\)\s*$/i.test(text)?text:`${text} (P)`};
  const isAssistEntry=e=>Boolean(e&&(e.isAssist===true||txt(e.assignmentType).toLowerCase()==='assist'));
  const stripAssistFromTotalText=value=>txt(value).replace(/\s*[•|]\s*\d+\s*Trợ\s*\(P\)\s*$/i,'').trim();

  function normalizeAssistEntryForSheets(entry){
    if(!isAssistEntry(entry))return entry;
    const source=txt(entry.classRaw||entry.className||entry.classBase||entry.classDisplay||entry.displayClass);
    const label=withP(source);
    return{
      ...entry,
      className:label,
      classRaw:label,
      classBase:label,
      classDisplay:label,
      displayClass:label,
      classLabel:label,
      classText:label,
      originalGroupNote:txt(entry.originalGroupNote||entry.groupNote),
      groupNote:'',
      assistLabel:label,
      assistMarker:'P',
      isAssist:true,
      assignmentType:'assist',
      payEligible:false,
      countInTotal:false,
      countInPay:false
    };
  }

  function finiteNumber(value){const n=Number(value);return Number.isFinite(n)?n:null}

  function normalizePayloadForSheets(payload){
    if(!payload||typeof payload!=='object')return payload;
    const patch=list=>Array.isArray(list)?list.map(normalizeAssistEntryForSheets):list;
    const next={...payload};
    next.entries=patch(payload.entries);
    next.schedule=patch(payload.schedule);
    if(Array.isArray(payload.assistEntries))next.assistEntries=patch(payload.assistEntries);

    const entries=Array.isArray(next.entries)?next.entries:[];
    const assistEntries=entries.filter(isAssistEntry);
    const paidEntries=entries.filter(e=>!isAssistEntry(e));
    const assistCount=Math.max(0,finiteNumber(payload.assistPeriods)??finiteNumber(payload.assistCount)??assistEntries.length);
    const payTotal=finiteNumber(payload.payPeriods)??finiteNumber(payload.totalPeriods)??finiteNumber(payload.total)??0;
    const payAtomic=finiteNumber(payload.payAtomicCount)??paidEntries.length;

    next.total=payTotal;
    next.totalPeriods=payTotal;
    next.payPeriods=payTotal;
    next.atomicCount=payAtomic;
    next.payAtomicCount=payAtomic;
    next.assistPeriods=assistCount;
    next.assistCount=assistCount;
    next.assistText=`${assistCount} Trợ (P)`;
    next.assistEntries=assistEntries;
    next.totalText=stripAssistFromTotalText(payload.totalText);
    next.excludeAssistFromTotal=true;
    next.assistSemantics='suffix-P-is-assist-not-pay-period';
    delete next.totalWithAssist;
    return next;
  }

  if(typeof module!=='undefined'&&module.exports){
    module.exports={VERSION,withP,isAssistEntry,stripAssistFromTotalText,normalizeAssistEntryForSheets,normalizePayloadForSheets};
    return;
  }

  let installed=false;
  function install(){
    if(installed||typeof window.fetch!=='function')return false;
    installed=true;
    const original=window.fetch.bind(window);
    window.fetch=async function(input,init){
      try{
        const url=typeof input==='string'?input:txt(input?.url);
        if(url.includes('/functions/v1/google-sheets-owner')&&init&&typeof init.body==='string'){
          const parsed=JSON.parse(init.body);
          const patched=normalizePayloadForSheets(parsed);
          return original(input,{...init,body:JSON.stringify(patched)});
        }
      }catch(error){console.warn('LBG Sheets P label: giữ payload gốc do không thể chuẩn hóa.',error)}
      return original(input,init);
    };
    window.__lbgAssistPSheetsLabelSafeV1=true;
    return true;
  }

  window.LBGAssistPSheetsLabelSafe={version:VERSION,withP,isAssistEntry,stripAssistFromTotalText,normalizeAssistEntryForSheets,normalizePayloadForSheets,install};
  install();
})();