'use strict';
(function(){
  const VERSION='20260907.1';
  const txt=v=>String(v??'').trim();

  function normalizeBody(body){
    if(!body||typeof body!=='object')return body;
    const entries=Array.isArray(body.entries)?body.entries:null;
    const schedule=Array.isArray(body.schedule)?body.schedule:null;
    const fixList=list=>list?.map(entry=>{
      if(!entry||typeof entry!=='object')return entry;
      const raw=txt(entry.classRaw);
      if(!raw)return entry;
      return {...entry,classBase:txt(entry.classBase||entry.className),className:raw};
    });
    const next={...body};
    if(entries)next.entries=fixList(entries);
    if(schedule)next.schedule=fixList(schedule);
    return next;
  }

  function patchClient(client){
    const fn=client?.functions;
    if(!fn||typeof fn.invoke!=='function'||fn.__lbgClassRawPatched)return false;
    const original=fn.invoke.bind(fn);
    fn.invoke=function(name,options){
      if(name==='google-sheets-owner'&&options&&typeof options==='object'){
        const body=normalizeBody(options.body);
        return original(name,{...options,body});
      }
      return original(name,options);
    };
    fn.__lbgClassRawPatched=true;
    return true;
  }

  function install(){
    const auth=window.LBGAuth;
    if(!auth)return false;
    let ok=patchClient(auth.client);
    auth.onReady?.(a=>{ok=patchClient(a?.client)||ok});
    return ok;
  }

  window.LBGSheetsClassRawHotfixV1={version:VERSION,normalizeBody,patchClient};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
