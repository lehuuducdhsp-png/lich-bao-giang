'use strict';
(function(factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof window!=='undefined'){
    window.LBGTkbClassTypoFixV1=api;
    if(typeof document!=='undefined')api.installWhenReady(window);
  }
})(function(){
  const VERSION='20260913.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim().replace(/\s+/g,' ');

  // Lỗi nhập liệu hẹp: "/31" được hiểu là "3/1".
  // Chỉ chấp nhận mẫu /<khối 1-5><lớp 1-9> để tránh sửa nhầm ghi chú hay dữ liệu khác.
  function normalizeLeadingSlashClass(value){
    const source=txt(value);
    const m=source.match(/^\/\s*([1-5])\s*([1-9])$/);
    if(!m)return{source,value:source,changed:false};
    return{source,value:`${m[1]}/${m[2]}`,changed:true};
  }

  function normalizeEntry(entry){
    if(!entry||typeof entry!=='object')return entry;
    const fix=normalizeLeadingSlashClass(entry.classRaw||entry.className||'');
    if(!fix.changed)return entry;
    return{
      ...entry,
      classSourceRaw:entry.classSourceRaw||fix.source,
      classRaw:fix.value,
      className:fix.value,
      classType:'single',
      classCount:1,
      classTypoNormalized:true
    };
  }

  function normalizeAnalysis(result){
    if(!result||typeof result!=='object')return result;
    const entries=Array.isArray(result.entries)?result.entries.map(normalizeEntry):result.entries;
    if(!Array.isArray(entries))return result;
    const corrected=entries.filter(e=>e?.classTypoNormalized&&e?.address&&e?.classSourceRaw);
    if(!corrected.length)return{...result,entries};
    const staleWarnings=new Set(corrected.map(e=>`Lớp/nhóm lớp tại ô ${e.address} có định dạng cần kiểm tra: ${e.classSourceRaw}.`));
    const warnings=Array.isArray(result.warnings)?result.warnings.filter(w=>!staleWarnings.has(String(w))):result.warnings;
    return{...result,entries,warnings};
  }

  function patchApi(api,root){
    if(!api?.scanAssignments)return false;
    if(api.__lbgClassTypoFixV1)return true;

    const originalScan=api.scanAssignments.bind(api);
    const originalAnalyze=typeof api.analyze==='function'?api.analyze.bind(api):null;

    api.scanAssignments=function(ws,onlyCode=''){
      return(originalScan(ws,onlyCode)||[]).map(normalizeEntry);
    };
    if(originalAnalyze){
      api.analyze=function(ws,code,name){return normalizeAnalysis(originalAnalyze(ws,code,name))};
      if(root)root.analyzeNow=api.analyze;
    }

    api.normalizeLeadingSlashClass=normalizeLeadingSlashClass;
    api.__lbgClassTypoFixV1=true;
    return true;
  }

  function installWhenReady(root){
    let tries=0;
    const install=()=>{
      const api=root?.LBGTkbParserV2;
      // Chờ lớp atomic cài xong để không bị module sau ghi đè scanAssignments/analyze.
      if(!api?.__lbgAtomicTeachingV1)return false;
      return patchApi(api,root);
    };
    if(install())return true;
    const timer=setInterval(()=>{tries++;if(install()||tries>600)clearInterval(timer)},50);
    return false;
  }

  return{version:VERSION,normalizeLeadingSlashClass,normalizeEntry,normalizeAnalysis,patchApi,installWhenReady};
});
