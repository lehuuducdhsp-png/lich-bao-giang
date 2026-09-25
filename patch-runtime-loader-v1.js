'use strict';
(function(){
  const VERSION='20260925.2';
  const LOOKAHEAD=6;
  const YIELD_EVERY=5;
  const warmed=new Set();
  const state=window.LBGPatchRuntime={
    version:VERSION,
    coreReady:false,
    runtimeReady:false,
    checkinReady:false,
    coreStartedAt:null,
    coreFinishedAt:null,
    runtimeStartedAt:null,
    runtimeFinishedAt:null,
    errors:[]
  };

  const CORE_PATCHES=[
    ['tkb-class-typo-fix-v1.js?v=20260913.2','lbgTkbClassTypoFixV1Script'],
    ['class-typo-report-path-safe-v1.js?v=20260916.1','lbgClassTypoReportPathSafeV1Script'],
    ['tkb-roster-group-period-safe-v1.js?v=20260919.1','lbgTkbRosterGroupPeriodSafeV1Script'],
    ['tkb-assignment-cache-safe-v1.js?v=20260913.1','lbgTkbAssignmentCacheSafeV1Script'],
    ['grouped-plus-report-safe-v1.js?v=20260919.1','lbgGroupedPlusReportSafeV1Script'],
    ['ga-per-class-history-safe-v1.js?v=20260913.1','lbgGaPerClassHistorySafeV1Script'],
    ['ga-group-split-history-safe-v1.js?v=20260920.1','lbgGaGroupSplitHistorySafeV1Script'],
    ['ga-group-split-stale-repair-v1.js?v=20260920.1','lbgGaGroupSplitStaleRepairV1Script'],
    ['ga-role-track-stale-repair-v1.js?v=20260920.4','lbgGaRoleTrackStaleRepairV1Script']
  ];

  const RUNTIME_PATCHES=[
    ['ga-suggestion-multi-apply-v1.js?v=20260920.3','lbgGaSuggestionMultiApplyV1Script'],
    ['ga-per-class-v2.js?v=20260920.5','lbgGaPerClassV2Script'],
    ['ga-multi-selection-bridge-v1.js?v=20260914.2','lbgGaMultiSelectionBridgeV1Script'],
    ['sheets-ga-save-safe-v1.js?v=20260913.1','lbgSheetsGaSaveSafeV1Script'],
    ['report-branding-v1.js?v=20260925.2','lbgReportBrandingV1Script'],
    ['assist-p-preview-safe-v1.js?v=20260918.1','lbgAssistPPreviewSafeV1Script'],
    ['assist-p-summary-monthly-safe-v1.js?v=20260912.1','lbgAssistPSummaryMonthlySafeV1Script'],
    ['assist-p-web-footer-safe-v1.js?v=20260912.1','lbgAssistPWebFooterSafeV1Script'],
    ['multi-preview-assist-sync-v1.js?v=20260914.1','lbgMultiPreviewAssistSyncV1Script'],
    ['assist-p-excel-export-parity-v1.js?v=20260918.1','lbgAssistPExcelExportParityV1Script'],
    ['assist-p-export-safe-v1.js?v=20260912.1','lbgAssistPExportSafeV1Script'],
    ['school-report-v1.js?v=20260914.3','lbgSchoolReportV1Script'],
    ['assist-p-sheets-label-safe-v1.js?v=20260912.3','lbgAssistPSheetsLabelSafeV1Script'],
    ['assist-p-sheets-location-safe-v1.js?v=20260912.1','lbgAssistPSheetsLocationSafeV1Script'],
    ['monthly-excel-polish-safe-v1.js?v=20260912.1','lbgMonthlyExcelPolishSafeV1Script']
  ];

  function preload(src){
    if(!src||warmed.has(src))return;
    warmed.add(src);
    if(document.querySelector(`link[rel="preload"][href="${src}"]`))return;
    const link=document.createElement('link');
    link.rel='preload';link.as='script';link.href=src;
    document.head.appendChild(link);
  }
  function preloadWindow(items,start,count){
    const end=Math.min(items.length,start+count);
    for(let i=start;i<end;i++)preload(items[i][0]);
  }
  function yieldToBrowser(){
    return new Promise(resolve=>{
      if(document.hidden||typeof requestAnimationFrame!=='function'){setTimeout(resolve,0);return}
      requestAnimationFrame(()=>resolve());
    });
  }
  function add(src,id){
    return new Promise((resolve,reject)=>{
      if(document.getElementById(id)){resolve();return}
      const s=document.createElement('script');
      s.id=id;s.src=src;s.async=false;
      s.onload=()=>resolve();
      s.onerror=()=>reject(new Error('Không tải được '+src));
      document.body.appendChild(s);
    });
  }
  async function loadSequence(items){
    for(let i=0;i<items.length;i++){
      preloadWindow(items,i,LOOKAHEAD);
      const [src,id]=items[i];
      await add(src,id);
      if((i+1)%YIELD_EVERY===0&&i+1<items.length)await yieldToBrowser();
    }
  }
  let corePromise=null,runtimePromise=null;
  function now(){return typeof performance!=='undefined'&&performance.now?performance.now():Date.now()}
  function loadCore(){
    if(state.coreReady)return Promise.resolve();
    if(corePromise)return corePromise;
    state.coreLoading=true;state.coreStartedAt=now();
    corePromise=(async()=>{
      try{
        await loadSequence(CORE_PATCHES);
        state.coreReady=true;state.coreFinishedAt=now();
        document.dispatchEvent(new CustomEvent('lbg-patch-core-ready',{detail:{version:VERSION}}));
      }catch(error){state.errors.push(String(error?.message||error));console.error('Patch core:',error);throw error}
      finally{state.coreLoading=false}
    })();
    return corePromise;
  }
  function loadRuntime(){
    if(state.runtimeReady)return Promise.resolve();
    if(runtimePromise)return runtimePromise;
    state.runtimeLoading=true;state.runtimeStartedAt=now();
    runtimePromise=(async()=>{
      try{
        await loadCore();
        await loadSequence(RUNTIME_PATCHES);
        state.runtimeReady=true;state.runtimeFinishedAt=now();
        document.dispatchEvent(new CustomEvent('lbg-patch-runtime-ready',{detail:{version:VERSION}}));
        armCheckin();
      }catch(error){state.errors.push(String(error?.message||error));console.error('Patch runtime:',error);throw error}
      finally{state.runtimeLoading=false}
    })();
    return runtimePromise;
  }

  let checkinStarted=false,checkinArmed=false;
  function armCheckin(){
    if(checkinStarted||checkinArmed)return;
    const start=async()=>{
      if(checkinStarted||!window.LBGAuth||!window.LBGAccess?.context)return;
      checkinStarted=true;
      try{
        await loadSequence([
          ['checkin-shared-scan-context-v1.js?v=20260810.2','lbgCheckinSharedScanContextV1Script'],
          ['checkin-v2.js?v=20260810.1','lbgCheckinV2Script'],
          ['checkin-date-label-v1.js?v=20260810.1','lbgCheckinDateLabelV1Script'],
          ['checkin-professional-labels-v1.js?v=20260814.1','lbgCheckinProfessionalLabelsV1Script']
        ]);
        state.checkinReady=true;
      }catch(error){state.errors.push(String(error?.message||error));console.error('Check-in loader:',error)}
    };
    if(window.LBGAuth&&window.LBGAccess?.context){start();return}
    checkinArmed=true;
    document.addEventListener('lbg-access-ready',()=>{checkinArmed=false;start()},{once:true});
  }

  const coreNow=()=>Boolean(window.LBGRuntimeLoader?.reportCoreReady);
  const runtimeNow=()=>Boolean(window.LBGRuntimeLoader?.ready);

  if(coreNow())loadCore();else document.addEventListener('lbg-report-core-ready',loadCore,{once:true});
  if(runtimeNow())loadRuntime();else document.addEventListener('lbg-runtime-ready',loadRuntime,{once:true});
  if(runtimeNow())armCheckin();
})();
