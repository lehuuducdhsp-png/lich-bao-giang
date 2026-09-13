'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaMixedClassBatchFixV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260913.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();

  function planMixedClassApplications(rows,entries,values,perClassApi,normalizer){
    if(!perClassApi?.planApplications)throw new Error('Bộ GA theo lớp chưa sẵn sàng.');
    return perClassApi.planApplications(rows||[],entries||[],values&&typeof values==='object'?values:{},normalizer);
  }

  function applyMixedClassApplications(rows,entries,values,perClassApi,normalizer){
    const plan=planMixedClassApplications(rows,entries,values,perClassApi,normalizer);
    if(!perClassApi?.applyPlan)throw new Error('Bộ ghi GA theo lớp chưa sẵn sàng.');
    const write=perClassApi.applyPlan(plan,values&&typeof values==='object'?values:{});
    return{
      plan,
      values:write.values,
      applied:Number(write.applied)||0,
      protectedCount:Number(write.protectedCount)||0,
      same:plan.same?.length||0,
      conflicts:plan.conflicts?.length||0,
      skipped:plan.skipped?.length||0
    };
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,planMixedClassApplications,applyMixedClassApplications};
  }

  const q=id=>root.document?.getElementById(id);
  const per=()=>root.LBGGaPerClassV2||null;
  const multi=()=>root.LBGGaSuggestionMultiApplyV1||null;
  const v7=()=>root.LBGGaSuggestionV7||null;
  const engine=()=>root.LBGReportEngineV4||null;
  const bookNow=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const resultNow=()=>{try{return typeof result!=='undefined'?result:null}catch{return null}};
  const activeVersion=()=>{try{return typeof activeId!=='undefined'&&activeId?txt(activeId):'active'}catch{return'active'}};
  const analyzeFn=()=>{try{return typeof analyzeNow==='function'?analyzeNow:root.analyzeNow}catch{return root.analyzeNow}};
  const normalizer=()=>v7()?.normalizeClass;
  let installed=false,running=false;

  function currentWorksheet(){
    const book=bookNow(),name=txt(q('week')?.value);
    return book&&name?book.getWorksheet?.(name):null;
  }

  function selectedTeachers(){
    try{return multi()?.selectedTeachers?.()||[]}catch{return[]}
  }

  function persist(a,values){
    const api=per();if(!a||!api?.storageKey)return false;
    try{
      const code=txt(a.code||a.teacherName);
      root.localStorage.setItem(api.storageKey(activeVersion(),a.sheet,code),JSON.stringify(values&&typeof values==='object'?values:{}));
      a.gaValues={...(values||{})};
      return true;
    }catch(error){
      console.error('GA mixed-class persist:',error);
      return false;
    }
  }

  function refreshCurrent(a,values){
    const now=resultNow(),api=per();
    if(!now||!a||txt(now.sheet)!==txt(a.sheet)||txt(now.code).toUpperCase()!==txt(a.code).toUpperCase())return false;
    now.gaValues={...(values||{})};
    try{api?.decorateReport?.(now,now.gaValues)}catch(error){console.warn('GA mixed-class decorate:',error)}
    try{engine()?.renderPreview?.(now)}catch(error){console.warn('GA mixed-class render:',error)}
    setTimeout(()=>{try{root.LBGAssistPPreviewSafe?.placeAssist?.()}catch{}},60);
    return true;
  }

  async function applyTeacher(a){
    const m=multi(),api=per();
    if(!m?.analyzeReport||!api?.planApplications||!api?.applyPlan)throw new Error('Bộ áp dụng GA theo lớp chưa sẵn sàng.');
    engine()?.ensureGa?.(a);
    const analyzed=await m.analyzeReport(a),rows=analyzed?.rows||[];
    const current=a.gaValues&&typeof a.gaValues==='object'?a.gaValues:{};
    const out=applyMixedClassApplications(rows,a.entries||[],current,api,normalizer());
    if(out.applied){persist(a,out.values)}
    return{...out,history:analyzed?.history,rows,report:a};
  }

  async function runBatch(){
    if(running)return;
    const button=q('lbgGaMultiApplyButton'),status=q('lbgGaMultiApplyStatus'),teachers=selectedTeachers(),ws=currentWorksheet(),analyze=analyzeFn();
    if(!button||teachers.length<2){if(typeof toast==='function')toast('Hãy chọn từ 2 giáo viên trở lên.');return}
    if(!ws||typeof analyze!=='function'){if(typeof toast==='function')toast('Hãy chọn tuần và kiểm tra dữ liệu trước.');return}
    running=true;button.dataset.busy='1';button.disabled=true;
    let applied=0,affected=0,conflicts=0,skipped=0,same=0,failed=0,currentUpdate=null;
    try{
      for(let i=0;i<teachers.length;i++){
        const t=teachers[i];button.textContent=`Đang xử lý GA theo lớp ${i+1}/${teachers.length}: ${t.name||t.code}`;
        try{
          const a=analyze(ws,t.code,t.name||t.code);
          if(!a?.entries?.length){skipped++;continue}
          const out=await applyTeacher(a);
          applied+=out.applied;same+=out.same;conflicts+=out.conflicts;skipped+=out.skipped+out.protectedCount;
          if(out.applied)affected++;
          const now=resultNow();
          if(now&&txt(now.code).toUpperCase()===txt(a.code).toUpperCase()&&txt(now.sheet)===txt(a.sheet))currentUpdate={a,values:out.values};
        }catch(error){failed++;console.error('GA mixed-class batch:',t.code,error)}
      }
      if(currentUpdate)refreshCurrent(currentUpdate.a,currentUpdate.values);
      const details=[`${applied} GA theo lớp`,`${teachers.length} giáo viên`];
      if(affected)details.push(`${affected} GV có thay đổi`);
      if(same)details.push(`${same} GA đã đúng`);
      if(conflicts)details.push(`${conflicts} xung đột`);
      if(skipped)details.push(`${skipped} mục bỏ qua`);
      if(failed)details.push(`${failed} GV lỗi`);
      if(status)status.innerHTML=`<b>Đã xử lý theo lớp:</b> ${details.join(' • ')}. GA chiếm đa số sẽ ở đầu buổi; lớp khác GA được ghi ngay sau tên lớp.`;
      if(typeof toast==='function')toast(applied?`Đã áp dụng ${applied} GA theo lớp cho ${affected} giáo viên.`:`Không có GA theo lớp mới để áp dụng cho ${teachers.length} giáo viên.`);
    }finally{
      running=false;delete button.dataset.busy;button.disabled=false;button.textContent=`✓ Phân tích & áp dụng GA cho ${teachers.length} giáo viên`;
    }
  }

  function captureClick(event){
    const button=event.target?.closest?.('#lbgGaMultiApplyButton');if(!button)return;
    if(selectedTeachers().length<2)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    runBatch();
  }

  function markReady(){
    const button=q('lbgGaMultiApplyButton');
    if(!button||!per()?.planApplications||!multi()?.analyzeReport||!v7()||!engine())return false;
    button.dataset.gaMixedClassFix=VERSION;
    button.title='Áp dụng GA riêng theo từng lớp; trường hợp 2/1=GA1, 2/4=GA1, 2/2=GA2 sẽ giữ GA1 ở đầu buổi và ghi 2/2 (GA 2).';
    return true;
  }

  function install(){
    if(installed)return true;installed=true;
    root.document.addEventListener('click',captureClick,true);
    let tries=0;const timer=setInterval(()=>{tries++;if(markReady()||tries>600)clearInterval(timer)},150);markReady();
    return true;
  }

  return{VERSION,planMixedClassApplications,applyMixedClassApplications,applyTeacher,runBatch,install};
});
