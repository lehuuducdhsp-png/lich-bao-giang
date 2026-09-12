'use strict';
(function(){
  const VERSION='20260912.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const isAssist=e=>Boolean(e&&(e.isAssist===true||txt(e.assignmentType).toLowerCase()==='assist'));
  const norm=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();

  function canonicalSchool(entry,entries){
    if(!isAssist(entry))return txt(entry?.school);
    const day=Number(entry?.day),session=txt(entry?.session),own=txt(entry?.school),locKey=txt(entry?.locationKey);
    const candidates=(entries||[]).filter(e=>!isAssist(e)&&Number(e?.day)===day&&txt(e?.session)===session&&txt(e?.school));
    if(!candidates.length)return own;

    if(locKey){
      const exact=candidates.find(e=>txt(e?.locationKey)&&txt(e?.locationKey)===locKey);
      if(exact)return txt(exact.school);
    }

    const unique=[...new Set(candidates.map(e=>txt(e.school)).filter(Boolean))];
    if(unique.length===1)return unique[0];

    const ownParts=[entry?.schoolName,entry?.siteDisplay,entry?.siteName,entry?.school].map(norm).filter(Boolean);
    let best='';let bestScore=0;
    for(const school of unique){
      const ns=norm(school);let score=0;
      for(const part of ownParts){
        if(ns===part)score=Math.max(score,1000+part.length);
        else if(ns.includes(part)||part.includes(ns))score=Math.max(score,part.length);
      }
      if(score>bestScore){bestScore=score;best=school}
    }
    return best||own;
  }

  function normalizePayloadLocations(payload){
    if(!payload||typeof payload!=='object'||!Array.isArray(payload.entries))return payload;
    const original=payload.entries;
    const entries=original.map(e=>{
      if(!isAssist(e))return e;
      const school=canonicalSchool(e,original);
      return school?{...e,school,locationLabel:school}:e;
    });
    const byKey=new Map(entries.map(e=>[`${Number(e?.day)}|${txt(e?.session)}|${txt(e?.sourceCell||e?.address)}|${txt(e?.className)}`,e]));
    const schedule=Array.isArray(payload.schedule)?payload.schedule.map(e=>{
      const key=`${Number(e?.day)}|${txt(e?.session)}|${txt(e?.sourceCell||e?.address)}|${txt(e?.className)}`;
      return byKey.get(key)||e;
    }):payload.schedule;
    return{...payload,entries,schedule,assistLocationSemantics:'reuse-canonical-main-school-when-safe'};
  }

  if(typeof module!=='undefined'&&module.exports){
    module.exports={VERSION,isAssist,norm,canonicalSchool,normalizePayloadLocations};
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
          const patched=normalizePayloadLocations(parsed);
          return original(input,{...init,body:JSON.stringify(patched)});
        }
      }catch(error){console.warn('LBG Sheets P location: giữ payload gốc do không chuẩn hóa được.',error)}
      return original(input,init);
    };
    window.__lbgAssistPSheetsLocationSafeV1=true;
    return true;
  }

  window.LBGAssistPSheetsLocationSafe={version:VERSION,isAssist,norm,canonicalSchool,normalizePayloadLocations,install};
  install();
})();
