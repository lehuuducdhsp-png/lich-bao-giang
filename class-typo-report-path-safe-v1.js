'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGClassTypoReportPathSafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260916.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim().replace(/\s+/g,' ');
  let renderWrapped=null,analyzeWrapped=null,readyNotified=false;

  // Chỉ tự sửa lỗi nhập liệu hẹp đã chốt: /31 -> 3/1, /24 -> 2/4...
  // Có thể giữ hậu tố (GA N) nếu report đã được trang trí trước khi qua lớp an toàn này.
  function fallbackNormalize(value){
    const source=txt(value);
    const m=source.match(/^\/\s*([1-5])\s*([1-9])(\s*\(\s*GA\s*\d+\s*\))?$/i);
    if(!m)return{source,value:source,changed:false};
    return{source,value:`${m[1]}/${m[2]}${m[3]||''}`,changed:true};
  }
  function normalizeClassText(value){
    const source=txt(value),decorated=source.match(/^(\/\s*[1-5]\s*[1-9])(\s*\(\s*GA\s*\d+\s*\))$/i);
    try{
      const common=root.LBGTkbClassTypoFixV1?.normalizeLeadingSlashClass;
      if(typeof common==='function'){
        const base=decorated?decorated[1]:source,fix=common(base);
        if(fix?.changed)return decorated?`${fix.value}${decorated[2]}`:fix.value;
      }
    }catch{}
    return fallbackNormalize(source).value;
  }
  const stripGa=value=>txt(value).replace(/\s*\(\s*GA\s*\d+\s*\)\s*$/i,'');
  function normalizeEntry(entry){
    if(!entry||typeof entry!=='object')return entry;
    const oldName=txt(entry.className),oldRaw=txt(entry.classRaw),oldBase=txt(entry.__lbgBaseClassName);
    const source=oldBase||oldRaw||oldName;
    const newName=normalizeClassText(oldName||source),newRaw=normalizeClassText(oldRaw||stripGa(source)),newBase=normalizeClassText(oldBase||stripGa(source));
    const changed=(oldName&&newName!==oldName)||(oldRaw&&newRaw!==oldRaw)||(oldBase&&newBase!==oldBase)||(!oldRaw&&source&&normalizeClassText(source)!==source);
    if(!changed)return entry;
    if(!entry.classSourceRaw&&source)entry.classSourceRaw=source;
    if(oldBase)entry.__lbgBaseClassName=stripGa(newBase);
    entry.classRaw=stripGa(newRaw||newBase||newName);
    entry.className=newName||newBase||newRaw;
    entry.classType='single';entry.classCount=1;entry.classTypoNormalized=true;
    return entry;
  }
  function normalizeReport(report){
    if(!report||typeof report!=='object'||!Array.isArray(report.entries))return report;
    report.entries.forEach(normalizeEntry);return report;
  }

  function wrapRender(){
    const current=root.render;
    if(typeof current!=='function')return false;
    if(current.__lbgClassTypoReportPathSafe===VERSION){renderWrapped=current;return true}
    const wrapped=function(report,...rest){normalizeReport(report);return current.call(this,report,...rest)};
    wrapped.__lbgClassTypoReportPathSafe=VERSION;wrapped.__lbgOriginalRender=current;
    root.render=wrapped;renderWrapped=wrapped;return true;
  }
  function wrapAnalyze(){
    const current=root.analyzeNow;
    if(typeof current!=='function')return false;
    if(current.__lbgClassTypoReportPathSafe===VERSION){analyzeWrapped=current;return true}
    const wrapped=function(...args){
      const out=current.apply(this,args);
      return out&&typeof out.then==='function'?out.then(normalizeReport):normalizeReport(out);
    };
    wrapped.__lbgClassTypoReportPathSafe=VERSION;wrapped.__lbgOriginalAnalyze=current;
    root.analyzeNow=wrapped;analyzeWrapped=wrapped;return true;
  }
  function wrapBefore(target,key,argIndex){
    const current=target?.[key];if(typeof current!=='function')return false;
    if(current.__lbgClassTypoReportPathSafe===VERSION)return true;
    const wrapped=function(...args){normalizeReport(args[argIndex]);return current.apply(this,args)};
    wrapped.__lbgClassTypoReportPathSafe=VERSION;wrapped.__lbgOriginal=current;target[key]=wrapped;return true;
  }
  function installOnce(){
    const renderOk=wrapRender(),analyzeOk=wrapAnalyze();
    const perClass=root.LBGGaPerClassV2;
    if(perClass){wrapBefore(perClass,'decorateReport',0);wrapBefore(perClass,'applyReport',0)}
    const engine=root.LBGReportEngineV4;
    if(engine){wrapBefore(engine,'renderPreview',0);wrapBefore(engine,'addReportSheet',1)}
    if(renderOk&&analyzeOk&&perClass&&engine&&!readyNotified){
      readyNotified=true;try{root.document?.dispatchEvent(new CustomEvent('lbg-class-typo-report-path-ready',{detail:{version:VERSION}}))}catch{}
    }
    return renderOk&&analyzeOk;
  }
  function install(){
    let tries=0;
    const tick=()=>{tries++;installOnce();if(tries<600)setTimeout(tick,50)};
    tick();
    root.document?.addEventListener?.('lbg-runtime-ready',installOnce);
    root.document?.addEventListener?.('lbg-atomic-teaching-v1-ready',installOnce);
    root.document?.addEventListener?.('lbg-ga-per-class-ready',installOnce);
    return true;
  }

  return{VERSION,fallbackNormalize,normalizeClassText,normalizeEntry,normalizeReport,install};
});
