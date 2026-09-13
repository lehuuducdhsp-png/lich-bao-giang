'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGSheetsGaSaveSafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260913.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const validGa=v=>{const s=txt(v);if(!/^\d+$/.test(s))return null;const n=Number(s);return Number.isSafeInteger(n)&&n>=0?String(n):null};
  const gaKey=(day,session,location)=>`${Number(day)}|${txt(session)}|${txt(location)}`;
  const sourceCell=e=>txt(e?.sourceCell||e?.address);

  function locationCandidates(entry){
    if(!entry||typeof entry!=='object')return[];
    const schoolName=txt(entry.schoolName||entry.school),site=txt(entry.siteDisplay||entry.siteName);
    const canonical=txt(entry.locationKey)||(schoolName?`${fold(schoolName)}|${fold(site)}`:'');
    const full=txt(entry.locationLabel)||(site?[schoolName,site].filter(Boolean).join('\n'):schoolName);
    return[canonical,txt(entry.locationKey),full,txt(entry.school),schoolName].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
  }

  function findLocationGa(values,entry){
    if(!values||typeof values!=='object'||!entry)return null;
    for(const location of locationCandidates(entry)){
      const value=validGa(values[gaKey(entry.day,entry.session,location)]);
      if(value!==null)return value;
    }
    return null;
  }

  function gaAnnotatedLabel(entry){
    const label=txt(entry?.className||entry?.classRaw||entry?.classDisplay);
    return /\(\s*GA\s*\d+\s*\)\s*$/i.test(label)?label:'';
  }

  function copyClassAnnotation(entry,label){
    if(!entry||!label)return entry;
    return{
      ...entry,
      className:label,
      classRaw:label,
      classBase:label,
      classDisplay:label,
      displayClass:label,
      classLabel:label,
      classText:label
    };
  }

  function normalizePayload(payload,currentReport){
    if(!payload||typeof payload!=='object')return payload;
    const current=currentReport&&typeof currentReport==='object'?currentReport:{};
    const values={
      ...(payload.gaValues&&typeof payload.gaValues==='object'?payload.gaValues:{}),
      ...(current.gaValues&&typeof current.gaValues==='object'?current.gaValues:{})
    };
    const currentByCell=new Map();
    for(const entry of Array.isArray(current.entries)?current.entries:[]){
      const key=sourceCell(entry);if(key&&!currentByCell.has(key))currentByCell.set(key,entry);
    }
    let aliasesAdded=0,annotationsCopied=0;
    const patchedByCell=new Map();
    const patchEntry=entry=>{
      if(!entry||typeof entry!=='object')return entry;
      const cell=sourceCell(entry),match=cell?currentByCell.get(cell):null,reference=match||entry;
      const value=findLocationGa(values,reference)??findLocationGa(values,entry);
      if(value!==null){
        const aliases=[...locationCandidates(reference),...locationCandidates(entry)].filter((v,i,a)=>a.indexOf(v)===i);
        for(const location of aliases){
          const key=gaKey(entry.day,entry.session,location);
          if(validGa(values[key])===value)continue;
          values[key]=value;aliasesAdded++;
        }
      }
      const label=gaAnnotatedLabel(match);
      const patched=label?(annotationsCopied++,copyClassAnnotation(entry,label)):entry;
      if(cell)patchedByCell.set(cell,patched);
      return patched;
    };
    const entries=Array.isArray(payload.entries)?payload.entries.map(patchEntry):payload.entries;
    const schedule=Array.isArray(payload.schedule)?payload.schedule.map(entry=>{
      const cell=sourceCell(entry);return(cell&&patchedByCell.get(cell))||patchEntry(entry);
    }):payload.schedule;
    return{
      ...payload,
      gaValues:values,
      lessonPlanCounts:{...values},
      entries,
      schedule,
      gaPayloadSemantics:'preserve-location-ga-and-per-class-annotations',
      gaPayloadAliasesAdded:aliasesAdded,
      gaPayloadAnnotationsCopied:annotationsCopied
    };
  }

  function currentReport(){try{return typeof result!=='undefined'?result:null}catch{return null}}
  let installed=false;
  function install(){
    if(installed||typeof root.fetch!=='function')return false;
    installed=true;
    const original=root.fetch.bind(root);
    root.fetch=async function(input,init){
      try{
        const url=typeof input==='string'?input:txt(input?.url);
        if(url.includes('/functions/v1/google-sheets-owner')&&init&&typeof init.body==='string'){
          const parsed=JSON.parse(init.body);
          const patched=normalizePayload(parsed,currentReport());
          return original(input,{...init,body:JSON.stringify(patched)});
        }
      }catch(error){console.warn('LBG Sheets GA: giữ payload gốc do không thể chuẩn hóa GA.',error)}
      return original(input,init);
    };
    root.__lbgSheetsGaSaveSafeV1=true;
    return true;
  }

  return{VERSION,validGa,gaKey,locationCandidates,findLocationGa,gaAnnotatedLabel,copyClassAnnotation,normalizePayload,install};
});
