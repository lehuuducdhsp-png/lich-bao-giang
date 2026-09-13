'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGMultiPreviewAssistSyncV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260914.1';
  const txt=v=>String(v??'').trim();

  function previewCode(report,fallback=''){
    return txt(report?.code||fallback);
  }

  function withTeacherValue(select,code,fn){
    if(!select||!txt(code)||typeof fn!=='function')return false;
    const before=select.value;
    try{
      select.value=txt(code);
      fn();
      return true;
    }finally{
      select.value=before;
    }
  }

  if(typeof module==='object'&&module.exports)return{VERSION,previewCode,withTeacherValue};

  const q=id=>root.document.getElementById(id);
  let installed=false,queued=false;

  function currentReport(){
    try{return typeof result!=='undefined'?result:null}catch{return root.result||null}
  }

  function isMultiPreview(){
    return Boolean(q('multiPreviewPicker')?.classList?.contains('show'));
  }

  function syncNow(){
    if(!isMultiPreview())return false;
    const report=currentReport(),code=previewCode(report);
    const select=q('teacher');
    if(!report||!code||!select)return false;
    return withTeacherValue(select,code,()=>{
      root.LBGAssistPPreviewSafe?.placeAssist?.();
      root.LBGAssistPWebFooterSafe?.patchFooter?.();
    });
  }

  function scheduleSync(delay=0){
    if(delay>0){setTimeout(()=>scheduleSync(0),delay);return}
    if(queued)return;queued=true;
    const run=()=>{queued=false;syncNow()};
    if(typeof root.requestAnimationFrame==='function')root.requestAnimationFrame(run);else setTimeout(run,0);
  }

  function waitAnalyzeDone(){
    let tries=0;
    const tick=()=>{
      tries++;
      const button=q('analyze');
      if(!button||!button.disabled){scheduleSync();scheduleSync(80);return}
      if(tries<600)setTimeout(tick,50);
    };
    setTimeout(tick,0);
  }

  function waitGaDone(){
    let tries=0;
    const tick=()=>{
      tries++;
      const button=q('lbgGaMultiApplyButton');
      if(!button||button.dataset.busy!=='1'){scheduleSync();scheduleSync(80);return}
      if(tries<1200)setTimeout(tick,50);
    };
    setTimeout(tick,0);
  }

  function install(){
    if(installed)return true;installed=true;
    root.document.addEventListener('change',event=>{
      if(event.target?.id==='multiPreviewSelect'){scheduleSync();scheduleSync(60)}
    },false);
    root.document.addEventListener('click',event=>{
      if(event.target?.closest?.('#analyze'))waitAnalyzeDone();
      if(event.target?.closest?.('#lbgGaMultiApplyButton'))waitGaDone();
    },false);
    scheduleSync(500);
    return true;
  }

  return{VERSION,previewCode,withTeacherValue,syncNow,scheduleSync,install};
});
