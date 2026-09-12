'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaSuggestionMultiApplyV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260912.1';
  const GA_PREFIX='lbgGaManualV2';
  const LEGACY_GA_PREFIX='lbgGaManualV1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const cache=new Map();

  function normalizedGa(value){
    if(value===null||value===undefined||txt(value)==='')return null;
    const n=Number(value);
    return Number.isFinite(n)&&n>=0?Math.round(n):null;
  }
  function currentRaw(values,target){
    if(!values||typeof values!=='object')return undefined;
    for(const key of [target?.key,target?.legacyKey].filter(Boolean)){
      if(!Object.prototype.hasOwnProperty.call(values,key))continue;
      const raw=values[key];
      if(raw!==undefined&&raw!==null&&txt(raw)!=='')return raw;
    }
    return undefined;
  }
  function applyPlanToValues(plan,values={}){
    const out=values&&typeof values==='object'?values:{};
    let applied=0,protectedCount=0;
    for(const item of plan?.apply||[]){
      const key=txt(item?.target?.key),ga=normalizedGa(item?.ga);
      if(!key||ga===null)continue;
      const existing=currentRaw(out,item.target);
      if(existing!==undefined&&existing!==null&&txt(existing)!==''){
        protectedCount++;
        continue;
      }
      out[key]=String(ga);
      applied++;
    }
    return{values:out,applied,protectedCount};
  }
  function storageKey(version,sheet,code,prefix=GA_PREFIX){
    return`${prefix}:${txt(version)||'active'}:${txt(sheet)}:${txt(code)}`;
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,GA_PREFIX,LEGACY_GA_PREFIX,normalizedGa,currentRaw,applyPlanToValues,storageKey};
  }

  const q=id=>root.document?.getElementById(id);
  const cross=()=>root.LBGGaSuggestionCrossVersionV1||null;
  const v7=()=>root.LBGGaSuggestionV7||null;
  const parser=()=>root.LBGTkbParserV2||null;
  const engine=()=>root.LBGReportEngineV4||null;
  const currentBook=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const versionList=()=>{try{return typeof versions!=='undefined'&&Array.isArray(versions)?versions:[]}catch{return[]}};
  const activeVersion=()=>{try{return typeof activeId!=='undefined'&&activeId?txt(activeId):'active'}catch{return'active'}};
  const startDateFor=ws=>{try{return typeof startDate==='function'?startDate(ws.name):null}catch{return null}};
  const weekLikeFor=ws=>{try{return typeof weekLike==='function'?weekLike(ws):true}catch{return true}};
  const analyzeFn=()=>{try{return typeof analyzeNow==='function'?analyzeNow:null}catch{return null}};

  function roleResolver(ws,code){
    const m=root.LBGTeacherIntelligenceV6?.summaryRoles?.(ws)?.get?.(txt(code).toUpperCase());
    return m?.role||'KNS';
  }
  function manualResolverFor(a){
    return(e,ws)=>{
      if(ws?.name!==a?.sheet||txt(e?.code).toUpperCase()!==txt(a?.code).toUpperCase())return null;
      const values=a?.gaValues&&typeof a.gaValues==='object'?a.gaValues:{};
      const locations=[txt(e?.locationKey),txt(e?.locationLabel),txt(e?.school),txt(e?.schoolName)].filter(Boolean);
      for(const loc of locations){
        const raw=values[`${Number(e.day)}|${txt(e.session)}|${loc}`];
        if(raw===undefined||raw===null||txt(raw)==='')continue;
        const n=Number(raw);if(Number.isFinite(n))return Math.round(n);
      }
      return null;
    };
  }
  async function loadSources(book){
    const list=versionList(),active=activeVersion(),out=[];
    for(const v of list){
      if(v?.id===active&&book){out.push({id:v.id,created:v.created,book,active:true});continue}
      if(!v?.buffer||!root.ExcelJS?.Workbook)continue;
      const key=`${txt(v.id)}|${txt(v.created)}|${txt(v.size)}`;
      let parsed=cache.get(key);
      if(!parsed){
        parsed=new root.ExcelJS.Workbook();
        await parsed.xlsx.load(v.buffer.slice(0));
        cache.set(key,parsed);
      }
      out.push({id:v.id,created:v.created,book:parsed,active:false});
    }
    if(book&&!out.some(x=>x.book===book))out.push({id:active,created:new Date().toISOString(),book,active:true});
    return out;
  }
  function rowsFor(history,a){
    const unique=new Map();
    for(const entry of a?.entries||[]){
      const ev=history?.byAddress?.get?.(`${a.sheet}!${entry.address}`);
      if(ev&&!unique.has(ev.id))unique.set(ev.id,ev);
    }
    return[...unique.values()];
  }
  async function analyzeReport(a){
    const book=currentBook(),c=cross(),base=v7(),p=parser();
    if(!book||!a?.sheet||!a?.entries?.length)throw new Error('Báo giảng chưa có dữ liệu để phân tích GA.');
    if(!c?.buildHistoryAcrossSources||!c?.planGaApplications||!base||!p)throw new Error('Bộ phân tích GA chưa sẵn sàng.');
    engine()?.ensureGa?.(a);
    const sources=await loadSources(book);
    const history=c.buildHistoryAcrossSources(base,sources,book,a.sheet,{parser:p,roleResolver,startDateFor,weekLike:weekLikeFor,manualResolver:manualResolverFor(a)});
    return{history,rows:rowsFor(history,a)};
  }
  function persistReport(a){
    if(!a)return false;
    try{
      const code=txt(a.code||a.teacherName);
      root.localStorage.setItem(storageKey(activeVersion(),a.sheet,code),JSON.stringify(a.gaValues&&typeof a.gaValues==='object'?a.gaValues:{}));
      return true;
    }catch{return false}
  }
  async function applyReport(a){
    engine()?.ensureGa?.(a);
    const{history,rows}=await analyzeReport(a),c=cross();
    const plan=c.planGaApplications(rows,a.entries||[],a.gaValues||{});
    const write=applyPlanToValues(plan,a.gaValues||{});
    a.gaValues=write.values;
    if(write.applied)persistReport(a);
    return{
      report:a,history,rows,plan,
      applied:write.applied,
      protectedCount:write.protectedCount,
      same:plan.same?.length||0,
      conflicts:plan.conflicts?.length||0,
      skipped:plan.skipped?.length||0
    };
  }

  function currentWorksheet(){
    const book=currentBook(),name=txt(q('week')?.value);
    return book&&name?book.getWorksheet?.(name):null;
  }
  function teacherList(){
    const ws=currentWorksheet();
    try{return ws&&typeof root.teachers==='function'?(root.teachers(ws)||[]):[]}catch{return[]}
  }
  function selectedTeachers(){
    const all=teacherList(),byCode=new Map(all.map(x=>[txt(x.code).toUpperCase(),x]));
    const checked=[...(root.document?.querySelectorAll?.('#multiTeacherList input[type="checkbox"]:checked')||[])].map(x=>txt(x.value)).filter(Boolean);
    const picked=[];
    for(const code of checked){const x=byCode.get(code.toUpperCase());if(x)picked.push({code:txt(x.code),name:txt(x.name||x.teacherName||x.code)})}
    if(picked.length)return picked;
    const code=txt(q('teacher')?.value),x=byCode.get(code.toUpperCase());
    return code?[{code,name:txt(x?.name||x?.teacherName||code)}]:[];
  }
  function currentResult(){try{return typeof result!=='undefined'?result:null}catch{return null}}
  function setCurrentResultGa(from){
    const now=currentResult();
    if(!now||!from||txt(now.sheet)!==txt(from.sheet)||txt(now.code).toUpperCase()!==txt(from.code).toUpperCase())return;
    now.gaValues={...(from.gaValues||{})};
    try{engine()?.renderPreview?.(now)}catch{}
  }

  function ensureStyle(){
    if(q('lbgGaMultiApplyStyle'))return;
    const style=root.document.createElement('style');style.id='lbgGaMultiApplyStyle';
    style.textContent=`
      .lbg-ga-multi-box{display:none;margin:10px 0;padding:11px 13px;border:1px solid #bbf7d0;border-radius:12px;background:#f0fdf4;align-items:center;gap:12px;flex-wrap:wrap}
      .lbg-ga-multi-box.show{display:flex}.lbg-ga-multi-main{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
      .lbg-ga-multi-btn{border:1px solid #16a34a;border-radius:10px;background:#16a34a;color:#fff;padding:9px 13px;font-weight:850;cursor:pointer}
      .lbg-ga-multi-btn:disabled{opacity:.55;cursor:not-allowed}.lbg-ga-multi-note{font-size:12px;color:#475569}.lbg-ga-multi-status{width:100%;font-size:12px;color:#166534}
    `;
    root.document.head.appendChild(style);
  }
  function ensureUi(){
    ensureStyle();
    let box=q('lbgGaMultiApplyBox');
    if(!box){
      box=root.document.createElement('div');box.id='lbgGaMultiApplyBox';box.className='lbg-ga-multi-box';
      box.innerHTML='<div class="lbg-ga-multi-main"><button type="button" class="lbg-ga-multi-btn" id="lbgGaMultiApplyButton">✓ Áp dụng GA cho nhiều giáo viên</button><span class="lbg-ga-multi-note">Tự phân tích lịch sử GA của từng giáo viên; chỉ điền ô trống, không ghi đè GA nhập tay.</span></div><div class="lbg-ga-multi-status" id="lbgGaMultiApplyStatus"></div>';
      const anchor=q('multiExportOptions')||q('analyze')?.closest?.('.controls');
      if(anchor)anchor.insertAdjacentElement('afterend',box);
      q('lbgGaMultiApplyButton').onclick=runBatch;
    }
    refreshUi();
    return box;
  }
  function refreshUi(){
    const box=q('lbgGaMultiApplyBox'),button=q('lbgGaMultiApplyButton');if(!box||!button)return;
    const count=selectedTeachers().length;
    box.classList.toggle('show',count>1);
    if(!button.dataset.busy){
      button.disabled=count<2;
      button.textContent=count>1?`✓ Phân tích & áp dụng GA cho ${count} giáo viên`:'✓ Áp dụng GA cho nhiều giáo viên';
    }
  }
  async function runBatch(){
    const button=q('lbgGaMultiApplyButton'),status=q('lbgGaMultiApplyStatus'),teachers=selectedTeachers(),ws=currentWorksheet(),analyze=analyzeFn();
    if(!button||teachers.length<2){if(typeof toast==='function')toast('Hãy chọn từ 2 giáo viên trở lên.');return}
    if(!ws||!analyze){if(typeof toast==='function')toast('Hãy chọn tuần và kiểm tra dữ liệu trước.');return}
    button.dataset.busy='1';button.disabled=true;
    let applied=0,affected=0,conflicts=0,skipped=0,same=0,failed=0,lastCurrent=null;
    try{
      for(let i=0;i<teachers.length;i++){
        const t=teachers[i];button.textContent=`Đang xử lý GA ${i+1}/${teachers.length}: ${t.name||t.code}`;
        try{
          const a=analyze(ws,t.code,t.name||t.code);
          if(!a?.entries?.length){skipped++;continue}
          const out=await applyReport(a);
          applied+=out.applied;same+=out.same;conflicts+=out.conflicts;skipped+=out.skipped+out.protectedCount;
          if(out.applied)affected++;
          const now=currentResult();if(now&&txt(now.code).toUpperCase()===txt(a.code).toUpperCase()&&txt(now.sheet)===txt(a.sheet))lastCurrent=a;
        }catch(error){failed++;console.error('GA multi apply:',t.code,error)}
      }
      if(lastCurrent)setCurrentResultGa(lastCurrent);
      const details=[`${applied} ô GA`,`${teachers.length} giáo viên`];
      if(affected)details.push(`${affected} GV có thay đổi`);
      if(conflicts)details.push(`${conflicts} ô xung đột`);
      if(skipped)details.push(`${skipped} mục bỏ qua`);
      if(failed)details.push(`${failed} GV lỗi`);
      if(status)status.innerHTML=`<b>Đã xử lý:</b> ${details.join(' • ')}. Các GA đã áp dụng được lưu để dùng khi xuất Excel.`;
      if(typeof toast==='function')toast(applied?`Đã áp dụng ${applied} ô GA cho ${affected} giáo viên.`:`Không có ô GA trống hợp lệ để áp dụng cho ${teachers.length} giáo viên.`);
    }finally{
      delete button.dataset.busy;refreshUi();
    }
  }

  function install(){
    let tries=0;
    const tick=()=>{
      tries++;
      if(q('teacher')&&q('analyze')&&cross()&&v7()&&parser()&&engine()&&analyzeFn())ensureUi();
      if(tries<600)setTimeout(tick,150);
    };
    root.document.addEventListener('change',event=>{if(event.target?.matches?.('#multiTeacherList input[type="checkbox"],#teacher,#week'))setTimeout(()=>{ensureUi();refreshUi()},0)},true);
    root.document.addEventListener('click',event=>{if(event.target?.closest?.('#multiSelectAll,#multiClearAll'))setTimeout(()=>{ensureUi();refreshUi()},20)},true);
    tick();
    return true;
  }

  return{VERSION,GA_PREFIX,LEGACY_GA_PREFIX,normalizedGa,currentRaw,applyPlanToValues,storageKey,analyzeReport,applyReport,selectedTeachers,install};
});
