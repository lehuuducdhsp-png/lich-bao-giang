'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaPerClassV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260912.1';
  const GA_PREFIX='lbgGaManualV2';
  const LEGACY_GA_PREFIX='lbgGaManualV1';
  const CLASS_PREFIX='@CLASS';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]||c));
  const dayRank=s=>txt(s).toLowerCase().startsWith('sáng')?0:1;
  const cache=new Map();

  function normalizedGa(value){
    if(value===null||value===undefined||txt(value)==='')return null;
    const n=Number(value);
    return Number.isFinite(n)&&n>=0?Math.round(n):null;
  }
  function normalizeClassValue(value,normalizer){
    if(typeof normalizer==='function'){
      try{const out=txt(normalizer(value));if(out)return out}catch{}
    }
    return fold(value).replace(/\s*-\s*TIET\s*[1-5]\b/g,'').replace(/\s+/g,' ').trim();
  }
  function entryBaseClass(entry){
    return txt(entry?.__lbgBaseClassName||entry?.className||entry?.classRaw);
  }
  function entryClassSource(entry){
    const raw=txt(entry?.classRaw);if(raw)return raw;
    const base=entryBaseClass(entry),note=txt(entry?.groupNote);
    return note?`${base} - ${note}`:base;
  }
  function entryClassKey(entry,normalizer){
    return normalizeClassValue(entryClassSource(entry),normalizer)||'CHUA-XAC-DINH';
  }
  function locOf(entry){
    const schoolName=txt(entry?.schoolName||entry?.school),siteDisplay=txt(entry?.siteDisplay||entry?.siteName);
    const label=txt(entry?.locationLabel)||(siteDisplay?`${schoolName}\n${siteDisplay}`:schoolName);
    const key=txt(entry?.locationKey)||`${fold(schoolName)}|${fold(siteDisplay)}`;
    return{key,schoolName,siteDisplay,label,legacySchool:txt(entry?.school||schoolName)};
  }
  function gaKey(day,session,location){return`${Number(day)}|${txt(session)}|${txt(location)}`}
  function classGaKey(day,session,location,classKey){return`${CLASS_PREFIX}|${Number(day)}|${txt(session)}|${txt(location)}|${txt(classKey)}`}
  function storageKey(version,sheet,code,prefix=GA_PREFIX){return`${prefix}:${txt(version)||'active'}:${txt(sheet)}:${txt(code)}`}
  function rawValue(values,key){
    if(!values||typeof values!=='object'||!key||!Object.prototype.hasOwnProperty.call(values,key))return undefined;
    const raw=values[key];return raw===undefined||raw===null||txt(raw)===''?undefined:raw;
  }
  function locationRaw(values,day,session,loc){
    const direct=rawValue(values,gaKey(day,session,loc?.key||loc?.label));if(direct!==undefined)return direct;
    return rawValue(values,gaKey(day,session,loc?.legacySchool||loc?.schoolName));
  }
  function classRaw(values,day,session,loc,classKey){return rawValue(values,classGaKey(day,session,loc?.key||loc?.label,classKey))}

  function buildProfiles(entries,values={},normalizer){
    const groups=new Map();
    for(const entry of Array.isArray(entries)?entries:[]){
      const day=Number(entry?.day),session=txt(entry?.session),loc=locOf(entry),classKey=entryClassKey(entry,normalizer);
      if(!Number.isFinite(day)||!session||!loc.key||!classKey)continue;
      const groupKey=`${day}|${session}|${loc.key}`;
      if(!groups.has(groupKey))groups.set(groupKey,{groupKey,day,session,loc,classes:new Map()});
      const group=groups.get(groupKey);
      if(!group.classes.has(classKey))group.classes.set(classKey,{classKey,entries:[],ga:null,annotate:false});
      group.classes.get(classKey).entries.push(entry);
    }
    const profiles=[];
    for(const group of groups.values()){
      const fallback=normalizedGa(locationRaw(values,group.day,group.session,group.loc));
      const counts=new Map();let known=0;
      for(const cls of group.classes.values()){
        const own=normalizedGa(classRaw(values,group.day,group.session,group.loc,cls.classKey));
        cls.ga=own===null?fallback:own;
        if(cls.ga!==null){known++;counts.set(cls.ga,(counts.get(cls.ga)||0)+1)}
      }
      const total=group.classes.size,allKnown=total>0&&known===total,ranked=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
      let header=fallback,tie=false;
      if(allKnown&&ranked.length){
        if(ranked.length===1||ranked[0][1]>ranked[1][1])header=ranked[0][0];
        else{header=null;tie=true}
      }
      for(const cls of group.classes.values())cls.annotate=cls.ga!==null&&(tie||header===null||cls.ga!==header);
      profiles.push({...group,total,known,allKnown,header,tie,mixed:counts.size>1,defaultKey:gaKey(group.day,group.session,group.loc.key),legacyKey:gaKey(group.day,group.session,group.loc.legacySchool)});
    }
    return profiles;
  }

  function targetForEntry(entry,ev,normalizer){
    const day=Number(entry?.day),session=txt(entry?.session),loc=locOf(entry);
    const classKey=txt(ev?.classId)||entryClassKey(entry,normalizer)||normalizeClassValue(ev?.classDisplay,normalizer);
    if(!Number.isFinite(day)||!session||!loc.key||!classKey)return null;
    return{
      key:classGaKey(day,session,loc.key,classKey),
      defaultKey:gaKey(day,session,loc.key),legacyKey:gaKey(day,session,loc.legacySchool),
      day,session,locationKey:loc.key,school:loc.schoolName,siteDisplay:loc.siteDisplay,classKey,classLabel:txt(ev?.classDisplay||entryBaseClass(entry))
    };
  }
  function resolveTarget(ev,entries=[],normalizer){
    const addresses=new Set((ev?.addresses||[]).map(txt).filter(Boolean));
    if(!addresses.size)return{ok:false,reason:'missing-address'};
    const targets=new Map();
    for(const entry of Array.isArray(entries)?entries:[]){
      if(!addresses.has(txt(entry?.address)))continue;
      const target=targetForEntry(entry,ev,normalizer);if(target&&!targets.has(target.key))targets.set(target.key,target);
    }
    if(targets.size!==1)return{ok:false,reason:targets.size?'ambiguous-target':'target-not-found',targets:[...targets.values()]};
    return{ok:true,target:[...targets.values()][0]};
  }
  function exactRaw(values,target){return rawValue(values,target?.key)}
  function inheritedRaw(values,target){
    const direct=rawValue(values,target?.defaultKey);return direct!==undefined?direct:rawValue(values,target?.legacyKey);
  }
  function planApplications(rows,entries=[],values={},normalizer){
    const groups=new Map(),skipped=[];
    (Array.isArray(rows)?rows:[]).forEach((ev,index)=>{
      const ga=normalizedGa(ev?.ga);
      if(ev?.gaSource==='conflict'||ga===null){skipped.push({index,ev,reason:ev?.gaSource==='conflict'?'suggestion-conflict':'missing-ga'});return}
      const resolved=resolveTarget(ev,entries,normalizer);
      if(!resolved.ok){skipped.push({index,ev,reason:resolved.reason});return}
      if(!groups.has(resolved.target.key))groups.set(resolved.target.key,{target:resolved.target,items:[]});
      groups.get(resolved.target.key).items.push({index,ev,ga});
    });
    const apply=[],same=[],conflicts=[];
    for(const group of groups.values()){
      const suggestions=[...new Set(group.items.map(x=>x.ga))];
      if(suggestions.length!==1){conflicts.push({target:group.target,items:group.items,reason:'different-suggestions'});continue}
      const ga=suggestions[0],exact=exactRaw(values,group.target);
      if(exact!==undefined){
        const current=normalizedGa(exact);
        if(current===ga)same.push({target:group.target,ga,items:group.items,source:'class'});
        else conflicts.push({target:group.target,ga,current:exact,items:group.items,reason:'existing-class-ga'});
        continue;
      }
      const inherited=inheritedRaw(values,group.target),current=normalizedGa(inherited);
      if(current===ga)same.push({target:group.target,ga,items:group.items,source:'location'});
      else apply.push({target:group.target,ga,items:group.items,inherited});
    }
    return{apply,same,conflicts,skipped};
  }
  function applyPlan(plan,values={}){
    const out={...(values&&typeof values==='object'?values:{})};let applied=0,protectedCount=0;
    for(const item of plan?.apply||[]){
      const key=txt(item?.target?.key),ga=normalizedGa(item?.ga);if(!key||ga===null)continue;
      if(rawValue(out,key)!==undefined){protectedCount++;continue}
      out[key]=String(ga);applied++;
    }
    return{values:out,applied,protectedCount};
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,GA_PREFIX,LEGACY_GA_PREFIX,CLASS_PREFIX,normalizedGa,normalizeClassValue,entryClassKey,locOf,gaKey,classGaKey,storageKey,buildProfiles,targetForEntry,resolveTarget,planApplications,applyPlan};
  }

  const q=id=>root.document?.getElementById(id);
  const cross=()=>root.LBGGaSuggestionCrossVersionV1||null;
  const v7=()=>root.LBGGaSuggestionV7||null;
  const parser=()=>root.LBGTkbParserV2||null;
  const engine=()=>root.LBGReportEngineV4||null;
  const bookNow=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const resultNow=()=>{try{return typeof result!=='undefined'?result:null}catch{return null}};
  const versionList=()=>{try{return typeof versions!=='undefined'&&Array.isArray(versions)?versions:[]}catch{return[]}};
  const activeVersion=()=>{try{return typeof activeId!=='undefined'&&activeId?txt(activeId):'active'}catch{return'active'}};
  const startDateFor=ws=>{try{return typeof startDate==='function'?startDate(ws.name):null}catch{return null}};
  const weekLikeFor=ws=>{try{return typeof weekLike==='function'?weekLike(ws):true}catch{return true}};
  const normalizer=()=>v7()?.normalizeClass;
  let baseAnalyze=null,wrappedAnalyze=null,previewObserver=null;

  function currentWorksheet(){const b=bookNow(),name=txt(q('week')?.value);return b&&name?b.getWorksheet?.(name):null}
  function isCurrentWorksheet(ws){return Boolean(ws&&currentWorksheet()===ws)}
  function loadStoredValues(a){
    if(a?.__lbgGaStoredValues&&typeof a.__lbgGaStoredValues==='object')return{...a.__lbgGaStoredValues};
    const code=txt(a?.code||a?.teacherName),sheet=txt(a?.sheet),version=activeVersion();
    try{
      const current=JSON.parse(root.localStorage.getItem(storageKey(version,sheet,code))||'null');
      if(current&&typeof current==='object')return{...current};
      const legacy=JSON.parse(root.localStorage.getItem(storageKey(version,sheet,code,LEGACY_GA_PREFIX))||'null');
      if(legacy&&typeof legacy==='object')return{...legacy};
    }catch{}
    return{};
  }
  function persistStoredValues(a,values){
    try{
      root.localStorage.setItem(storageKey(activeVersion(),a?.sheet,a?.code||a?.teacherName),JSON.stringify(values&&typeof values==='object'?values:{}));
      return true;
    }catch{return false}
  }
  function decorateReport(a,storedOverride){
    if(!a||!Array.isArray(a.entries))return a;
    const stored={...(storedOverride&&typeof storedOverride==='object'?storedOverride:loadStoredValues(a))};
    for(const entry of a.entries){
      if(!Object.prototype.hasOwnProperty.call(entry,'__lbgBaseClassName'))entry.__lbgBaseClassName=txt(entry.className||entry.classRaw);
      else entry.className=txt(entry.__lbgBaseClassName);
    }
    const profiles=buildProfiles(a.entries,stored,normalizer()),derived={...stored};
    for(const profile of profiles){
      if(profile.allKnown){
        if(profile.tie)derived[profile.defaultKey]='';
        else if(profile.header!==null)derived[profile.defaultKey]=String(profile.header);
      }
      for(const cls of profile.classes.values()){
        for(const entry of cls.entries){
          const base=txt(entry.__lbgBaseClassName||entry.className||entry.classRaw);
          entry.className=cls.annotate&&cls.ga!==null?`${base} (GA ${cls.ga})`:base;
        }
      }
    }
    a.__lbgGaStoredValues=stored;a.__lbgGaProfiles=profiles;a.gaValues=derived;return a;
  }
  function ensureAnalyzeWrapper(){
    let current=null;try{current=typeof analyzeNow==='function'?analyzeNow:null}catch{}
    if(!current)return false;
    if(current.__lbgGaPerClass===VERSION){wrappedAnalyze=current;return true}
    baseAnalyze=current;
    wrappedAnalyze=function(ws,...args){const a=baseAnalyze(ws,...args);return isCurrentWorksheet(ws)?decorateReport(a):a};
    wrappedAnalyze.__lbgGaPerClass=VERSION;wrappedAnalyze.__lbgGaBase=baseAnalyze;
    try{analyzeNow=wrappedAnalyze}catch{}
    try{root.analyzeNow=wrappedAnalyze}catch{}
    return true;
  }
  function refreshCurrentReport(a,stored){
    decorateReport(a,stored);
    try{if(typeof result!=='undefined'&&result===a)result=a}catch{}
    try{if(typeof render==='function')render(a);else root.renderPreview?.(a)}catch(error){console.error('GA per-class render:',error)}
    setTimeout(()=>{patchMixedHeaders(a);try{root.LBGAssistPPreviewSafe?.placeAssist?.()}catch{}},40);
  }
  function patchMixedHeaders(a){
    const profiles=a?.__lbgGaProfiles||[];if(!profiles.length)return;
    const ties=profiles.filter(x=>x.tie);if(!ties.length)return;
    const inputs=[...(q('preview')?.querySelectorAll?.('.lbg-r4-ga')||[])];
    for(const profile of ties){
      const input=inputs.find(x=>Number(x.dataset.day)===profile.day&&decodeURIComponent(x.dataset.session||'')===profile.session&&decodeURIComponent(x.dataset.location||'')===profile.loc.key);
      const label=input?.closest?.('label');if(label)label.innerHTML='<span class="lbg-ga-mixed-label">(Nhiều GA)</span>';
    }
  }
  function installPreviewObserver(){
    if(previewObserver||!q('preview'))return;
    previewObserver=new MutationObserver(()=>{const a=resultNow();if(a)setTimeout(()=>patchMixedHeaders(a),0)});
    previewObserver.observe(q('preview'),{childList:true,subtree:true});
  }

  function roleResolver(ws,code){
    const m=root.LBGTeacherIntelligenceV6?.summaryRoles?.(ws)?.get?.(txt(code).toUpperCase());
    return m?.role||'KNS';
  }
  function manualResolverFor(a){
    return(e,ws)=>{
      if(ws?.name!==a?.sheet||txt(e?.code).toUpperCase()!==txt(a?.code).toUpperCase())return null;
      const values=a?.__lbgGaStoredValues||loadStoredValues(a),classKey=entryClassKey(e,normalizer());
      const locations=[txt(e?.locationKey),txt(e?.locationLabel),txt(e?.school),txt(e?.schoolName)].filter(Boolean);
      for(const loc of locations){
        const own=rawValue(values,classGaKey(Number(e.day),txt(e.session),loc,classKey));
        if(own!==undefined){const n=normalizedGa(own);if(n!==null)return n}
        const common=rawValue(values,gaKey(Number(e.day),txt(e.session),loc));
        if(common!==undefined){const n=normalizedGa(common);if(n!==null)return n}
      }
      return null;
    };
  }
  async function loadSources(book){
    const list=versionList(),active=activeVersion(),out=[];
    for(const item of list){
      if(item?.id===active&&book){out.push({id:item.id,created:item.created,book,active:true});continue}
      if(!item?.buffer||!root.ExcelJS?.Workbook)continue;
      const key=`${txt(item.id)}|${txt(item.created)}|${txt(item.size)}`;let parsed=cache.get(key);
      if(!parsed){parsed=new root.ExcelJS.Workbook();await parsed.xlsx.load(item.buffer.slice(0));cache.set(key,parsed)}
      out.push({id:item.id,created:item.created,book:parsed,active:false});
    }
    if(book&&!out.some(x=>x.book===book))out.push({id:active,created:new Date().toISOString(),book,active:true});
    return out;
  }
  function rowsFor(history,a){
    const unique=new Map();
    for(const entry of a?.entries||[]){const ev=history?.byAddress?.get?.(`${a.sheet}!${entry.address}`);if(ev&&!unique.has(ev.id))unique.set(ev.id,ev)}
    return[...unique.values()].sort((x,y)=>x.date-y.date||dayRank(x.session)-dayRank(y.session)||x.period-y.period);
  }
  async function analyzeReport(a){
    const book=bookNow(),c=cross(),base=v7(),p=parser();
    if(!book||!a?.sheet||!a?.entries?.length)throw new Error('Báo giảng chưa có dữ liệu để phân tích GA.');
    if(!c?.buildHistoryAcrossSources||!base||!p)throw new Error('Bộ phân tích GA chưa sẵn sàng.');
    const sources=await loadSources(book);
    const history=c.buildHistoryAcrossSources(base,sources,book,a.sheet,{parser:p,roleResolver,startDateFor,weekLike:weekLikeFor,manualResolver:manualResolverFor(a)});
    return{history,rows:rowsFor(history,a)};
  }
  function titleFor(ev){
    const x=root.LBGTeachingPlanProgressV1?.titleFor?.(ev?.grade,ev?.track,ev?.ga);
    return x?.kind==='lesson'?x:{title:ev?.ga==null?'Chưa xác định GA':'Chưa có tên bài trong kế hoạch'};
  }
  function fmtDate(d){return d instanceof Date&&!Number.isNaN(d.getTime())?d.toLocaleDateString('vi-VN'):'—'}
  function trackText(ev){return ev?.track==='stem'?'STEM':'Kỹ năng sống'}
  function participantText(ev){return(ev?.participants||[]).map(p=>`${p.name||p.code} (${p.code})${p.role==='CTV'?' – CTV KNS':''}`).join(' + ')}
  function basisText(ev){return v7()?.basisText?.(ev)||'Dò theo lịch sử các phiên bản TKB đã lưu.'}
  function planFor(rows,a){return planApplications(rows,a?.entries||[],a?.__lbgGaStoredValues||loadStoredValues(a),normalizer())}
  function applyRows(rows,a){
    const plan=planFor(rows,a),stored=a?.__lbgGaStoredValues||loadStoredValues(a),write=applyPlan(plan,stored);
    if(write.applied)persistStoredValues(a,write.values);
    if(write.applied)refreshCurrentReport(a,write.values);
    return{...plan,applied:write.applied,protectedCount:write.protectedCount,blocked:(plan.conflicts?.length||0)+(plan.skipped?.length||0)+write.protectedCount};
  }
  function stateFor(ev,a){
    const plan=planFor([ev],a);
    if(plan.same.length)return{kind:'same',label:`✓ Đã có GA ${plan.same[0].ga}`,disabled:true};
    if(plan.conflicts.length)return{kind:'conflict',label:'⚠ Có GA lớp khác',disabled:true};
    if(plan.skipped.length)return{kind:'skip',label:'Không thể áp dụng',disabled:true};
    if(plan.apply.length)return{kind:'apply',label:`↘ Áp dụng GA ${plan.apply[0].ga}`,disabled:false};
    return{kind:'skip',label:'Không thể áp dụng',disabled:true};
  }
  function refreshSuggestionUi(panel,rows,a){
    panel.querySelectorAll('[data-ga-per-class-one]').forEach(button=>{
      const state=stateFor(rows[Number(button.dataset.gaPerClassOne)],a);button.textContent=state.label;button.disabled=state.disabled;button.dataset.state=state.kind;
    });
    const bulk=panel.querySelector('[data-ga-per-class-all]'),plan=planFor(rows,a);
    if(bulk){bulk.disabled=!plan.apply.length;bulk.textContent=plan.apply.length?`✓ Áp dụng tất cả GA theo lớp (${plan.apply.length} lớp)`:'✓ Không còn GA lớp trống để áp dụng'}
  }
  function toastApply(out){
    if(typeof toast!=='function')return;
    if(out.applied){toast(`Đã áp dụng ${out.applied} GA theo lớp vào Lịch Báo giảng${out.blocked?` • bỏ qua ${out.blocked} mục cần kiểm tra`:''}.`);return}
    if(out.conflicts.length){toast('Có GA riêng của lớp khác với gợi ý nên hệ thống không ghi đè.');return}
    if(out.same.length){toast('GA gợi ý đã có trong Lịch Báo giảng.');return}
    toast('Chưa có GA theo lớp hợp lệ để áp dụng.');
  }
  function renderSuggestionPanel(panel,history,a){
    const rows=rowsFor(history,a),meta=history.crossVersion||{};
    panel.innerHTML=`<div class="alert info"><b>GA gợi ý theo lớp:</b> đang dò <b>${meta.weekCount||1} tuần</b> từ <b>${meta.sourceCount||1} phiên bản TKB</b>. Nếu cùng một buổi có nhiều GA, hệ thống lưu GA riêng cho từng lớp; khi lập báo giảng, GA xuất hiện nhiều nhất được đặt ở đầu buổi và lớp khác GA được ghi rõ ngay sau tên lớp.</div>${rows.length?`<div class="lbg-ga-apply-toolbar"><button type="button" class="lbg-ga-apply-all" data-ga-per-class-all>✓ Áp dụng tất cả GA theo lớp</button><small>Không ghi đè GA riêng của lớp đã được nhập trước đó.</small></div><div class="wrap"><table><thead><tr><th>STT</th><th>Ngày – buổi – tiết</th><th>Trường</th><th>Lớp / nhóm lớp</th><th>Giáo viên / phối hợp</th><th>Luồng</th><th>GA gợi ý & tên bài</th><th>Căn cứ</th></tr></thead><tbody>${rows.map((ev,i)=>{const lesson=titleFor(ev),collab=(ev.participants||[]).length>1,src=(ev.addresses||[]).join(', ');return`<tr><td>${i+1}</td><td>${esc(fmtDate(ev.date))}<br>${esc(ev.session)} – <b>Tiết ${esc(ev.period)}</b></td><td>${esc(ev.school)}</td><td>${esc(ev.classDisplay)}<br><small>Ô nguồn: ${esc(src)}</small></td><td>${collab?'<b style="color:#0f766e">🤝 Phối hợp</b><br>':''}${esc(participantText(ev))}</td><td><b>${esc(trackText(ev))}</b></td><td><div class="lbg-ga-main">${ev.ga==null?'Chưa xác định':`GA ${esc(ev.ga)} – ${esc(trackText(ev))}`}</div><div style="margin-top:4px;font-weight:700;color:#4b342b">${esc(lesson.title)}</div><button type="button" class="lbg-ga-apply-one" data-ga-per-class-one="${i}">Áp dụng</button></td><td>${esc(basisText(ev))}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="alert warn">Không ghép được các ô nguồn hiện tại với lịch sử TKB.</div>'}`;
    panel.__lbgGaPerClassContext={rows,a};
    if(panel.dataset.gaPerClassBound!=='1'){
      panel.dataset.gaPerClassBound='1';panel.addEventListener('click',event=>{
        const button=event.target?.closest?.('[data-ga-per-class-one],[data-ga-per-class-all]');if(!button)return;
        const context=panel.__lbgGaPerClassContext;if(!context)return;
        const one=button.dataset.gaPerClassOne,selected=one!==undefined?[context.rows[Number(one)]].filter(Boolean):context.rows;
        const out=applyRows(selected,context.a);toastApply(out);refreshSuggestionUi(panel,context.rows,context.a);
      });
    }
    refreshSuggestionUi(panel,rows,a);
  }
  async function runSuggestionAnalysis(){
    const button=q('gaSuggestV6'),panel=q('gaSuggestionV6Panel'),a=resultNow(),book=bookNow();
    if(!button||!panel)return;if(!book||!a?.sheet||!a?.entries?.length){if(typeof toast==='function')toast('Hãy kiểm tra lịch của giáo viên trước.');return}
    const old=button.textContent;button.disabled=true;button.textContent='Đang dò GA theo từng lớp…';panel.hidden=false;panel.innerHTML='<div class="empty">Đang đối chiếu lịch sử GA của từng lớp/nhóm lớp…</div>';
    try{const{history}=await analyzeReport(a);renderSuggestionPanel(panel,history,a);if(typeof toast==='function')toast(`Đã phân tích GA theo lớp qua ${history.crossVersion?.weekCount||1} tuần.`)}
    catch(error){console.error('GA per-class:',error);panel.innerHTML=`<div class="alert warn"><b>Không phân tích được GA theo lớp:</b> ${esc(error?.message||String(error))}</div>`}
    finally{button.textContent=old;button.disabled=false}
  }
  function bindSuggestionButton(){const b=q('gaSuggestV6');if(!b||!cross()||!v7()||!parser())return false;if(b.onclick!==runSuggestionAnalysis)b.onclick=runSuggestionAnalysis;b.dataset.gaPerClass='1';return true}

  function selectedTeachers(){
    const ws=currentWorksheet();if(!ws)return[];let all=[];try{all=typeof root.teachers==='function'?(root.teachers(ws)||[]):[]}catch{}
    const byCode=new Map(all.map(x=>[txt(x.code).toUpperCase(),x])),checked=[...(root.document?.querySelectorAll?.('#multiTeacherList input[type="checkbox"]:checked')||[])].map(x=>txt(x.value)).filter(Boolean),out=[];
    for(const code of checked){const x=byCode.get(code.toUpperCase());if(x)out.push({code:txt(x.code),name:txt(x.name||x.teacherName||x.code)})}
    return out;
  }
  async function applyReport(a){
    const{history,rows}=await analyzeReport(a),plan=planFor(rows,a),stored=a.__lbgGaStoredValues||loadStoredValues(a),write=applyPlan(plan,stored);
    if(write.applied)persistStoredValues(a,write.values);
    return{history,rows,plan,values:write.values,applied:write.applied,protectedCount:write.protectedCount,same:plan.same.length,conflicts:plan.conflicts.length,skipped:plan.skipped.length};
  }
  async function runBatch(){
    const button=q('lbgGaMultiApplyButton'),status=q('lbgGaMultiApplyStatus'),teachers=selectedTeachers(),ws=currentWorksheet();
    if(!button||teachers.length<2){if(typeof toast==='function')toast('Hãy chọn từ 2 giáo viên trở lên.');return}
    if(!ws||!wrappedAnalyze){if(typeof toast==='function')toast('Hệ thống báo giảng chưa sẵn sàng.');return}
    button.dataset.busy='1';button.disabled=true;let applied=0,affected=0,conflicts=0,skipped=0,failed=0,currentUpdate=null;
    try{
      for(let i=0;i<teachers.length;i++){
        const t=teachers[i];button.textContent=`Đang xử lý GA theo lớp ${i+1}/${teachers.length}: ${t.name||t.code}`;
        try{
          const a=wrappedAnalyze(ws,t.code,t.name||t.code);if(!a?.entries?.length){skipped++;continue}
          const out=await applyReport(a);applied+=out.applied;conflicts+=out.conflicts;skipped+=out.skipped+out.protectedCount;if(out.applied)affected++;
          const now=resultNow();if(now&&txt(now.code).toUpperCase()===txt(a.code).toUpperCase()&&txt(now.sheet)===txt(a.sheet))currentUpdate={a,values:out.values};
        }catch(error){failed++;console.error('GA per-class batch:',t.code,error)}
      }
      if(currentUpdate)refreshCurrentReport(currentUpdate.a,currentUpdate.values);
      const details=[`${applied} GA theo lớp`,`${teachers.length} giáo viên`];if(affected)details.push(`${affected} GV có thay đổi`);if(conflicts)details.push(`${conflicts} xung đột`);if(skipped)details.push(`${skipped} mục bỏ qua`);if(failed)details.push(`${failed} GV lỗi`);
      if(status)status.innerHTML=`<b>Đã xử lý:</b> ${details.join(' • ')}. Khi xuất Excel, GA chiếm đa số sẽ ở đầu buổi; lớp khác GA có chú thích riêng.`;
      if(typeof toast==='function')toast(applied?`Đã áp dụng ${applied} GA theo lớp cho ${affected} giáo viên.`:`Không có GA theo lớp mới để áp dụng cho ${teachers.length} giáo viên.`);
    }finally{delete button.dataset.busy;button.disabled=false;button.textContent=`✓ Phân tích & áp dụng GA cho ${teachers.length} giáo viên`}
  }
  function bindMultiButton(){const b=q('lbgGaMultiApplyButton');if(!b)return false;if(b.onclick!==runBatch)b.onclick=runBatch;b.dataset.gaPerClass='1';return true}
  function ensureStyle(){
    if(q('lbgGaPerClassStyle'))return;const style=root.document.createElement('style');style.id='lbgGaPerClassStyle';style.textContent=`.lbg-ga-mixed-label{display:inline-block;padding:5px 8px;border:1px dashed #d97706;border-radius:8px;background:#fff7ed;color:#9a3412;font-weight:900}.lbg-ga-main{font-weight:900;color:#0f766e}`;root.document.head.appendChild(style)
  }

  function install(){
    let tries=0;const tick=()=>{
      tries++;ensureStyle();ensureAnalyzeWrapper();bindSuggestionButton();bindMultiButton();installPreviewObserver();
      if(tries<1200)setTimeout(tick,150);
    };tick();return true;
  }
  return{VERSION,GA_PREFIX,LEGACY_GA_PREFIX,CLASS_PREFIX,normalizedGa,normalizeClassValue,entryClassKey,locOf,gaKey,classGaKey,storageKey,buildProfiles,targetForEntry,resolveTarget,planApplications,applyPlan,decorateReport,install};
});
