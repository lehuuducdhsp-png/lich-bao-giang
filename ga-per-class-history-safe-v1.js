'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaPerClassHistorySafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260913.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();

  function normalizedGa(value){
    if(value===undefined||value===null||txt(value)==='')return null;
    const n=Number(value);return Number.isFinite(n)&&n>=0?Math.round(n):null;
  }

  function classSpecificManualValue(values,e,per,normalizer){
    if(!values||typeof values!=='object'||!e||!per)return null;
    const classKey=per.entryClassKey?.(e,normalizer);
    const loc=per.locOf?.(e)||{};
    if(!classKey)return null;
    const locations=[loc.key,loc.label,loc.legacySchool,loc.schoolName].map(txt).filter(Boolean);
    for(const location of locations){
      const key=per.classGaKey?.(Number(e.day),txt(e.session),location,classKey);
      if(!key||!Object.prototype.hasOwnProperty.call(values,key))continue;
      const ga=normalizedGa(values[key]);
      if(ga!==null)return ga;
    }
    return null;
  }

  function sanitizeManualResolver(original,selectedSheet,valuesProvider,per,normalizer){
    return function(e,ws,grade){
      if(txt(ws?.name)===txt(selectedSheet)){
        let values={};
        try{values=typeof valuesProvider==='function'?(valuesProvider(e,ws)||{}):{}}catch{}
        // Trong chế độ GA theo lớp, GA chung ở đầu khối chỉ là giá trị hiển thị/kế thừa.
        // Không dùng nó làm mốc manual cho mọi lớp vì sẽ che mất lịch sử riêng của lớp mới/cũ.
        const exact=classSpecificManualValue(values,e,per,normalizer);
        return exact;
      }
      if(typeof original==='function'){
        try{return original(e,ws,grade)}catch{return null}
      }
      return null;
    };
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,normalizedGa,classSpecificManualValue,sanitizeManualResolver};
  }

  function activeVersion(){try{return typeof activeId!=='undefined'&&activeId?txt(activeId):'active'}catch{return'active'}}
  function loadValues(e,selectedSheet){
    const per=root.LBGGaPerClassV2;if(!per)return{};
    const code=txt(e?.code||e?.teacherName).toUpperCase();if(!code)return{};
    try{
      const key=per.storageKey?.(activeVersion(),selectedSheet,code);
      if(!key)return{};
      const parsed=JSON.parse(root.localStorage.getItem(key)||'null');
      return parsed&&typeof parsed==='object'?parsed:{};
    }catch{return{}}
  }

  function installOnce(){
    const cross=root.LBGGaSuggestionCrossVersionV1,per=root.LBGGaPerClassV2,v7=root.LBGGaSuggestionV7;
    if(!cross?.buildHistoryAcrossSources||!per?.classGaKey||!v7?.normalizeClass)return false;
    if(cross.buildHistoryAcrossSources.__lbgPerClassHistorySafe===VERSION)return true;
    const original=cross.buildHistoryAcrossSources.bind(cross);
    const wrapped=function(base,sources,currentBook,selectedSheet,opts={}){
      const next={...opts};
      if(typeof opts.manualResolver==='function'){
        next.manualResolver=sanitizeManualResolver(
          opts.manualResolver,
          selectedSheet,
          e=>loadValues(e,selectedSheet),
          per,
          v7.normalizeClass
        );
      }
      return original(base,sources,currentBook,selectedSheet,next);
    };
    wrapped.__lbgPerClassHistorySafe=VERSION;
    wrapped.__lbgOriginalBuildHistoryAcrossSources=original;
    cross.buildHistoryAcrossSources=wrapped;
    return true;
  }

  function install(){
    let tries=0;
    const tick=()=>{
      tries++;
      if(installOnce())return;
      if(tries<400)setTimeout(tick,50);
    };
    tick();return true;
  }

  return{VERSION,normalizedGa,classSpecificManualValue,sanitizeManualResolver,install};
});
