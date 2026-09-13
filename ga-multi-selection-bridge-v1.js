'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260914.2';
  const txt=v=>String(v??'').trim();
  function chooseTeachers(all,codes,fallbackCode=''){
    const byCode=new Map((all||[]).map(x=>[txt(x?.code).toUpperCase(),x]));
    const seen=new Set(),out=[];
    for(const raw of codes||[]){
      const code=txt(raw).toUpperCase();if(!code||seen.has(code))continue;
      const x=byCode.get(code);if(!x)continue;
      seen.add(code);out.push({code:txt(x.code),name:txt(x.name||x.teacherName||x.code)});
    }
    if(out.length)return out;
    const code=txt(fallbackCode).toUpperCase(),x=byCode.get(code);
    return code?[{code:txt(x?.code||fallbackCode),name:txt(x?.name||x?.teacherName||fallbackCode)}]:[];
  }
  function reportKey(a){return`${txt(a?.sheet)}|${txt(a?.code).toUpperCase()}`}
  function mergeReportState(target,source){
    const tk=reportKey(target),sk=reportKey(source);if(!target||!source||!tk||tk!==sk)return false;
    for(const [k,v] of Object.entries(source))target[k]=v;
    return true;
  }
  if(typeof module==='object'&&module.exports)return{VERSION,chooseTeachers,reportKey,mergeReportState};

  const q=id=>root.document.getElementById(id);
  let selectedCodes=[];
  const reportCache=new Map();
  const yieldUi=()=>new Promise(resolve=>root.requestAnimationFrame?root.requestAnimationFrame(()=>resolve()):setTimeout(resolve,0));
  function worksheet(){try{const book=typeof wb!=='undefined'?wb:null,name=txt(q('week')?.value);return book&&name?book.getWorksheet(name):null}catch{return null}}
  function teacherList(){const ws=worksheet();try{return ws&&typeof root.teachers==='function'?(root.teachers(ws)||[]):[]}catch{return[]}}
  function currentTeachers(){
    if(selectedCodes.length)return chooseTeachers(teacherList(),selectedCodes,q('teacher')?.value);
    const checked=[...root.document.querySelectorAll('#multiTeacherList input[type="checkbox"]:checked')].map(x=>x.value);
    return chooseTeachers(teacherList(),checked,q('teacher')?.value);
  }
  function perClass(){return root.LBGGaPerClassV2||null}
  function refresh(){
    const box=q('lbgGaMultiApplyBox'),button=q('lbgGaMultiApplyButton');if(!box||!button)return false;
    const count=currentTeachers().length,ready=typeof perClass()?.applyReport==='function';box.classList.toggle('show',count>0);
    if(!button.dataset.busy){
      button.disabled=count<1||!ready;
      button.textContent=!ready&&count>0?'Đang chuẩn bị bộ phân tích GA…':count===1?'✓ Phân tích & áp dụng GA cho 1 giáo viên':count>1?`✓ Phân tích & áp dụng GA cho ${count} giáo viên`:'✓ Phân tích & áp dụng GA';
    }
    button.onclick=runBatch;button.dataset.lbgSelectionBridge='2';return true;
  }
  function renderCurrent(now){
    try{
      if(typeof root.render==='function')root.render(now);
      else root.LBGReportEngineV4?.renderPreview?.(now);
    }catch(error){console.error('GA multi bridge render:',error)}
  }
  function syncCurrentResult(source){
    try{
      const now=typeof result!=='undefined'?result:null;
      if(!mergeReportState(now,source))return false;
      perClass()?.decorateReport?.(now,source.gaValues||{});
      renderCurrent(now);return true;
    }catch{return false}
  }
  function rememberReport(a){const k=reportKey(a);if(!k)return;reportCache.set(k,a);syncCurrentResult(a)}
  function syncCurrentFromCache(){
    try{const now=typeof result!=='undefined'?result:null,cached=reportCache.get(reportKey(now));if(cached)syncCurrentResult(cached)}catch{}
  }
  async function runBatch(){
    const button=q('lbgGaMultiApplyButton'),status=q('lbgGaMultiApplyStatus'),teachers=currentTeachers(),ws=worksheet(),analyze=typeof analyzeNow==='function'?analyzeNow:null,api=perClass();
    if(!button||!teachers.length){root.toast?.('Hãy chọn ít nhất 1 giáo viên.');return}
    if(!ws||!analyze||!api?.applyReport){root.toast?.('Bộ phân tích GA theo lớp chưa sẵn sàng. Hãy thử lại sau vài giây.');return}
    button.dataset.busy='1';button.disabled=true;
    let applied=0,affected=0,conflicts=0,skipped=0,failed=0;
    try{
      for(let i=0;i<teachers.length;i++){
        const t=teachers[i];button.textContent=`Đang xử lý GA ${i+1}/${teachers.length}: ${t.name||t.code}`;await yieldUi();
        try{
          const a=analyze(ws,t.code,t.name||t.code);if(!a?.entries?.length){skipped++;continue}
          const out=await api.applyReport(a);applied+=out.applied||0;conflicts+=out.conflicts||0;skipped+=(out.skipped||0)+(out.protectedCount||0);if(out.applied)affected++;rememberReport(a)
        }catch(error){failed++;console.error('GA selection bridge:',t.code,error)}
        if(i+1<teachers.length)await yieldUi();
      }
      syncCurrentFromCache();
      const details=[`${applied} GA theo lớp`,`${teachers.length} giáo viên`];if(affected)details.push(`${affected} GV có thay đổi`);if(conflicts)details.push(`${conflicts} xung đột`);if(skipped)details.push(`${skipped} mục bỏ qua`);if(failed)details.push(`${failed} GV lỗi`);
      if(status)status.innerHTML=`<b>Đã xử lý:</b> ${details.join(' • ')}. GA đã áp dụng được đồng bộ lại vào từng lịch đang xem.`;
      root.toast?.(applied?`Đã áp dụng ${applied} GA theo lớp cho ${affected} giáo viên.`:`Không có GA theo lớp mới để áp dụng cho ${teachers.length} giáo viên.`)
    }finally{delete button.dataset.busy;refresh()}
  }
  function install(){
    root.document.addEventListener('lbg-multi-selection-change',event=>{selectedCodes=Array.isArray(event.detail?.codes)?event.detail.codes.map(txt).filter(Boolean):[];setTimeout(refresh,0)});
    root.document.addEventListener('lbg-ga-per-class-ready',()=>setTimeout(refresh,0));
    root.document.addEventListener('input',event=>{if(event.target?.id==='multiTeacherSearch')setTimeout(refresh,0)},true);
    root.document.addEventListener('change',event=>{
      if(event.target?.id==='week'){selectedCodes=[];reportCache.clear();setTimeout(refresh,40);return}
      if(event.target?.id==='multiPreviewSelect')setTimeout(syncCurrentFromCache,0);
    });
    let tries=0;const tick=()=>{tries++;if(!refresh()&&tries<400)setTimeout(tick,50)};tick();
    return true;
  }
  return{VERSION,chooseTeachers,reportKey,mergeReportState,install};
});
