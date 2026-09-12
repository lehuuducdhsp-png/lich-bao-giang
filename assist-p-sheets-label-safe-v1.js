'use strict';
(function(){
  const VERSION='20260912.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const withP=value=>{const text=txt(value)||'Lớp chưa xác định';return /\(P\)\s*$/i.test(text)?text:`${text} (P)`};
  const isAssistEntry=e=>Boolean(e&&(e.isAssist===true||txt(e.assignmentType).toLowerCase()==='assist'));

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
      payEligible:false
    };
  }

  function normalizePayloadForSheets(payload){
    if(!payload||typeof payload!=='object')return payload;
    const patch=list=>Array.isArray(list)?list.map(normalizeAssistEntryForSheets):list;
    const next={...payload};
    next.entries=patch(payload.entries);
    next.schedule=patch(payload.schedule);
    if(Array.isArray(payload.assistEntries))next.assistEntries=patch(payload.assistEntries);
    return next;
  }

  if(typeof module!=='undefined'&&module.exports){
    module.exports={VERSION,withP,isAssistEntry,normalizeAssistEntryForSheets,normalizePayloadForSheets};
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

  window.LBGAssistPSheetsLabelSafe={version:VERSION,withP,isAssistEntry,normalizeAssistEntryForSheets,normalizePayloadForSheets,install};
  install();
})();
