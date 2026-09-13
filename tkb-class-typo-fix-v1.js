'use strict';
(function(factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof window!=='undefined'){
    window.LBGTkbClassTypoFixV1=api;
    if(typeof document!=='undefined')api.installWhenReady(window);
  }
})(function(){
  const VERSION='20260913.2';
  const txt=v=>String(v??'').replace(/\r/g,'').trim().replace(/\s+/g,' ');

  // Lỗi nhập liệu hẹp: "/31" được hiểu là "3/1".
  // Chỉ chấp nhận mẫu /<khối 1-5><lớp 1-9> để tránh sửa nhầm ghi chú hay dữ liệu khác.
  function normalizeLeadingSlashClass(value){
    const source=txt(value);
    const m=source.match(/^\/\s*([1-5])\s*([1-9])$/);
    if(!m)return{source,value:source,changed:false};
    return{source,value:`${m[1]}/${m[2]}`,changed:true};
  }

  // Những mẫu dưới đây chỉ được GỢI Ý để người dùng kiểm tra, không tự sửa.
  function suggestLikelyClass(value){
    const source=txt(value);
    const auto=normalizeLeadingSlashClass(source);
    if(auto.changed)return{source,suggestion:auto.value,kind:'leading-slash',auto:true};
    let m=source.match(/^([1-5])\s*([1-9])$/);
    if(m)return{source,suggestion:`${m[1]}/${m[2]}`,kind:'missing-slash',auto:false};
    m=source.match(/^([1-5])\s*[-\\]\s*([1-9])$/);
    if(m)return{source,suggestion:`${m[1]}/${m[2]}`,kind:'wrong-separator',auto:false};
    m=source.match(/^\/\s*([1-5])\s*\/\s*([1-9])$/);
    if(m)return{source,suggestion:`${m[1]}/${m[2]}`,kind:'extra-leading-slash',auto:false};
    return null;
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

  function genericWarning(entry,raw){
    return entry?.address?`Lớp/nhóm lớp tại ô ${entry.address} có định dạng cần kiểm tra: ${raw}.`:'';
  }
  function likelyWarning(entry,issue){
    if(!entry?.address||!issue?.suggestion)return'';
    return `Lớp/nhóm lớp tại ô ${entry.address} có định dạng nghi ngờ: ${issue.source}. Có thể bạn muốn ghi ${issue.suggestion}; hệ thống chưa tự sửa.`;
  }

  function normalizeAnalysis(result){
    if(!result||typeof result!=='object')return result;
    const entries=Array.isArray(result.entries)?result.entries.map(normalizeEntry):result.entries;
    if(!Array.isArray(entries))return result;
    let warnings=Array.isArray(result.warnings)?[...result.warnings]:[];

    for(const entry of entries){
      const raw=txt(entry?.classSourceRaw||entry?.classRaw||entry?.className||'');
      if(!raw)continue;
      if(entry?.classTypoNormalized){
        const stale=genericWarning(entry,entry.classSourceRaw||raw);
        warnings=warnings.filter(w=>String(w)!==stale);
        continue;
      }
      if(entry?.classType!=='unknown')continue;
      const issue=suggestLikelyClass(raw);
      if(!issue||issue.auto)continue;
      const generic=genericWarning(entry,raw),precise=likelyWarning(entry,issue);
      warnings=warnings.filter(w=>String(w)!==generic);
      if(precise&&!warnings.includes(precise))warnings.push(precise);
    }

    return{...result,entries,warnings:[...new Set(warnings)]};
  }

  function patchApi(api,root){
    if(!api?.scanAssignments)return false;
    if(api.__lbgClassTypoFixV1)return true;

    const originalScan=api.scanAssignments.bind(api);
    const originalAnalyze=typeof api.analyze==='function'?api.analyze.bind(api):null;

    // scanAssignments là đường chung cho tuần hiện tại lẫn các workbook lịch sử.
    // Vì vậy /31 ở tuần trước cũng trở thành 3/1 trước khi bộ GA V7 đối chiếu lịch sử lớp.
    api.scanAssignments=function(ws,onlyCode=''){
      return(originalScan(ws,onlyCode)||[]).map(normalizeEntry);
    };
    if(originalAnalyze){
      api.analyze=function(ws,code,name){return normalizeAnalysis(originalAnalyze(ws,code,name))};
      if(root)root.analyzeNow=api.analyze;
    }

    api.normalizeLeadingSlashClass=normalizeLeadingSlashClass;
    api.suggestLikelyClass=suggestLikelyClass;
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

  return{version:VERSION,normalizeLeadingSlashClass,suggestLikelyClass,normalizeEntry,normalizeAnalysis,patchApi,installWhenReady};
});
