'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaSuggestionCrossVersionV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260912.3';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]||c));
  const dateKey=d=>d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';
  const dayRank=s=>txt(s).toLowerCase().startsWith('sáng')?0:1;
  const createdMs=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:0};
  const cache=new Map();

  function sheetStart(ws,opts={}){
    try{
      const d=opts.startDateFor?.(ws);
      return d instanceof Date&&!Number.isNaN(d.getTime())?d:null;
    }catch{return null}
  }
  function isWeekSheet(ws,opts={}){
    try{return opts.weekLike?Boolean(opts.weekLike(ws)):true}catch{return false}
  }
  function selectedWorksheet(book,name){
    if(!book||!name)return null;
    try{return book.getWorksheet?.(name)||book.worksheets?.find?.(ws=>ws?.name===name)||null}catch{return null}
  }
  function selectWeekSheets(sources,currentBook,selectedSheet,opts={}){
    const selectedWs=selectedWorksheet(currentBook,selectedSheet),selectedStart=sheetStart(selectedWs,opts);
    if(!selectedWs||!selectedStart){
      const fallback=(currentBook?.worksheets||[]).filter(ws=>isWeekSheet(ws,opts));
      return{worksheets:fallback,selectedKey:'',weekCount:fallback.length,sourceCount:currentBook?1:0,usedFallback:true};
    }
    const selectedKey=dateKey(selectedStart),groups=new Map();
    const all=Array.isArray(sources)?sources:[];
    for(const source of all){
      const book=source?.book;if(!book)continue;
      const stamp=createdMs(source?.created),sid=txt(source?.id)||'unknown';
      (book.worksheets||[]).forEach((ws,index)=>{
        if(!isWeekSheet(ws,opts))return;
        const start=sheetStart(ws,opts);if(!start||start>selectedStart)return;
        const key=dateKey(start);if(!key)return;
        const forceSelected=book===currentBook&&ws?.name===selectedSheet;
        const cand={ws,start,key,index,stamp,sid,forceSelected};
        const prev=groups.get(key);
        if(!prev||forceSelected||(!prev.forceSelected&&(stamp>prev.stamp||(stamp===prev.stamp&&index>prev.index))))groups.set(key,cand);
      });
    }
    if(!groups.has(selectedKey))groups.set(selectedKey,{ws:selectedWs,start:selectedStart,key:selectedKey,index:0,stamp:Number.MAX_SAFE_INTEGER,sid:'active',forceSelected:true});
    else if(groups.get(selectedKey)?.ws!==selectedWs)groups.set(selectedKey,{ws:selectedWs,start:selectedStart,key:selectedKey,index:0,stamp:Number.MAX_SAFE_INTEGER,sid:'active',forceSelected:true});
    const chosen=[...groups.values()].sort((a,b)=>a.start-b.start||a.index-b.index);
    return{
      worksheets:chosen.map(x=>x.ws),
      selectedKey,
      weekCount:chosen.length,
      sourceCount:new Set(chosen.map(x=>x.sid)).size,
      sourceIds:[...new Set(chosen.map(x=>x.sid))],
      usedFallback:false
    };
  }

  function isOperationalNoteSite(e){
    const type=fold(e?.siteType),raw=fold(e?.siteRaw||e?.siteName||e?.siteDisplay);
    if(!raw)return false;
    const looksGeneric=!type||type==='DIA DIEM';
    const hasSession=/\bBUOI\s+(SANG|CHIEU)\b/.test(raw);
    const hasOperation=/(CO\s+MAT\s+O\s+TRUONG|VAO\s+TIET|QUAN\s+LY\s+HS|THE\s+DUC\s+DAU\s+GIO|7H\d*|13H\d*)/.test(raw);
    return looksGeneric&&hasSession&&hasOperation;
  }
  function normalizeHistoryEntry(e){
    if(!e||!isOperationalNoteSite(e))return e;
    const schoolName=txt(e.schoolName||e.school)||txt(e.locationLabel).split(/\n/)[0];
    const schoolKey=txt(e.schoolKey)||fold(schoolName);
    return{
      ...e,
      siteRaw:'',siteType:'',siteName:'',siteDisplay:'',siteKey:'',
      locationLabel:schoolName||txt(e.locationLabel),
      locationKey:`${schoolKey}|`,
      historyLocationNormalized:true
    };
  }
  function historyParser(baseParser){
    if(!baseParser?.scanAssignments)return baseParser;
    return new Proxy(baseParser,{
      get(target,prop,receiver){
        if(prop!=='scanAssignments')return Reflect.get(target,prop,receiver);
        return function(ws,...args){
          const rows=target.scanAssignments(ws,...args)||[];
          return rows.map(normalizeHistoryEntry);
        };
      }
    });
  }
  function buildHistoryAcrossSources(v7,sources,currentBook,selectedSheet,opts={}){
    if(!v7?.buildHistory)throw new Error('Bộ phân tích GA V7 chưa sẵn sàng.');
    const picked=selectWeekSheets(sources,currentBook,selectedSheet,opts);
    const safeOpts={...opts,parser:historyParser(opts.parser)};
    const history=v7.buildHistory({worksheets:picked.worksheets},selectedSheet,safeOpts);
    history.crossVersion={version:VERSION,...picked};
    return history;
  }

  function gaTargetKey(day,session,school){
    return `${Number(day)}|${txt(session)}|${txt(school)}`;
  }
  function normalizedGa(value){
    if(value===null||value===undefined||txt(value)==='')return null;
    const n=Number(value);
    if(!Number.isFinite(n)||n<0)return null;
    return Math.round(n);
  }
  function resolveApplyTarget(ev,entries=[]){
    const addresses=new Set((ev?.addresses||[]).map(txt).filter(Boolean));
    if(!addresses.size)return{ok:false,reason:'missing-address'};
    const targets=new Map();
    for(const entry of Array.isArray(entries)?entries:[]){
      if(!addresses.has(txt(entry?.address)))continue;
      const day=Number(entry?.day),session=txt(entry?.session),school=txt(entry?.school);
      if(!Number.isFinite(day)||!session||!school)continue;
      const key=gaTargetKey(day,session,school);
      if(!targets.has(key))targets.set(key,{key,day,session,school});
    }
    if(targets.size!==1)return{ok:false,reason:targets.size?'ambiguous-target':'target-not-found',targets:[...targets.values()]};
    return{ok:true,target:[...targets.values()][0]};
  }
  function planGaApplications(rows,entries=[],currentValues={}){
    const groups=new Map(),skipped=[];
    (Array.isArray(rows)?rows:[]).forEach((ev,index)=>{
      const ga=normalizedGa(ev?.ga);
      if(ev?.gaSource==='conflict'||ga===null){
        skipped.push({index,ev,reason:ev?.gaSource==='conflict'?'suggestion-conflict':'missing-ga'});
        return;
      }
      const resolved=resolveApplyTarget(ev,entries);
      if(!resolved.ok){
        skipped.push({index,ev,reason:resolved.reason});
        return;
      }
      const key=resolved.target.key;
      if(!groups.has(key))groups.set(key,{target:resolved.target,items:[]});
      groups.get(key).items.push({index,ev,ga});
    });
    const apply=[],same=[],conflicts=[];
    for(const group of groups.values()){
      const suggestions=[...new Set(group.items.map(x=>x.ga))];
      if(suggestions.length!==1){
        conflicts.push({target:group.target,items:group.items,reason:'different-suggestions'});
        continue;
      }
      const ga=suggestions[0],raw=currentValues?.[group.target.key];
      if(raw===undefined||raw===null||txt(raw)===''){
        apply.push({target:group.target,ga,items:group.items});
        continue;
      }
      const currentGa=normalizedGa(raw);
      if(currentGa===ga)same.push({target:group.target,ga,items:group.items});
      else conflicts.push({target:group.target,ga,current:raw,items:group.items,reason:'existing-manual-ga'});
    }
    return{apply,same,conflicts,skipped};
  }

  if(typeof module!=='undefined'&&module.exports){
    return{
      VERSION,dateKey,selectWeekSheets,isOperationalNoteSite,normalizeHistoryEntry,historyParser,buildHistoryAcrossSources,
      gaTargetKey,normalizedGa,resolveApplyTarget,planGaApplications
    };
  }

  const bookNow=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const resultNow=()=>{try{return typeof result!=='undefined'?result:null}catch{return null}};
  const versionList=()=>{try{return typeof versions!=='undefined'&&Array.isArray(versions)?versions:[]}catch{return[]}};
  const activeVersionId=()=>{try{return typeof activeId!=='undefined'?txt(activeId):''}catch{return''}};
  const startDateFor=ws=>{try{return typeof startDate==='function'?startDate(ws.name):null}catch{return null}};
  const weekLikeFor=ws=>{try{return typeof weekLike==='function'?weekLike(ws):true}catch{return true}};
  const v7=()=>root.LBGGaSuggestionV7||null;
  const parser=()=>root.LBGTkbParserV2||null;

  async function loadVersionSources(currentBook){
    const list=versionList(),active=activeVersionId(),out=[];
    for(const v of list){
      if(v?.id===active&&currentBook){out.push({id:v.id,created:v.created,book:currentBook,active:true});continue}
      if(!v?.buffer||!root.ExcelJS?.Workbook)continue;
      const key=`${txt(v.id)}|${txt(v.created)}|${txt(v.size)}`;
      let book=cache.get(key);
      if(!book){
        book=new root.ExcelJS.Workbook();
        await book.xlsx.load(v.buffer.slice(0));
        cache.set(key,book);
      }
      out.push({id:v.id,created:v.created,book,active:false});
    }
    if(currentBook&&!out.some(x=>x.book===currentBook))out.push({id:active||'active',created:new Date().toISOString(),book:currentBook,active:true});
    return out;
  }
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
  function fmtDate(d){return d instanceof Date&&!Number.isNaN(d.getTime())?d.toLocaleDateString('vi-VN'):'—'}
  function trackText(ev){return ev?.track==='stem'?'STEM':'Kỹ năng sống'}
  function participantText(ev){return(ev?.participants||[]).map(p=>`${p.name||p.code} (${p.code})${p.role==='CTV'?' – CTV KNS':''}`).join(' + ')}
  function titleFor(ev){
    const x=root.LBGTeachingPlanProgressV1?.titleFor?.(ev?.grade,ev?.track,ev?.ga);
    if(x?.kind==='lesson')return x;
    return{title:ev?.ga==null?'Chưa xác định GA':'Chưa có tên bài trong kế hoạch',kind:'unknown'};
  }
  function basisText(ev,meta){
    if(ev?.gaSource==='first')return`Không tìm thấy lần dạy ${trackText(ev)} trước đó của đúng lớp/nhóm lớp tại điểm dạy này trong ${meta?.weekCount||1} tuần TKB đã lưu đến tuần hiện tại; dùng GA đầu chuỗi.`;
    return v7()?.basisText?.(ev)||'Dò theo lịch sử các phiên bản TKB đã lưu.';
  }

  function decodeData(value){try{return decodeURIComponent(value||'')}catch{return value||''}}
  function matchingGaInputs(target){
    return[...(root.document?.querySelectorAll?.('#preview .ga-input')||[])].filter(input=>
      Number(input?.dataset?.day)===Number(target?.day)&&
      decodeData(input?.dataset?.session)===txt(target?.session)&&
      decodeData(input?.dataset?.school)===txt(target?.school)
    );
  }
  function applySuggestions(rows,a){
    const plan=planGaApplications(rows,a?.entries||[],a?.gaValues||{});
    let applied=0,inputConflicts=0;
    for(const item of plan.apply){
      const inputs=matchingGaInputs(item.target);
      if(inputs.length!==1){inputConflicts++;continue}
      const input=inputs[0];
      input.value=String(item.ga);
      input.dispatchEvent(new root.Event('input',{bubbles:true}));
      applied++;
    }
    return{
      ...plan,
      applied,
      inputConflicts,
      blocked:plan.conflicts.length+plan.skipped.length+inputConflicts
    };
  }
  function applyState(ev,a){
    const plan=planGaApplications([ev],a?.entries||[],a?.gaValues||{});
    if(plan.same.length)return{kind:'same',label:`✓ Đã có GA ${plan.same[0].ga}`,disabled:true};
    if(plan.conflicts.length)return{kind:'conflict',label:'⚠ Có GA khác',disabled:true};
    if(plan.skipped.length)return{kind:'skip',label:'Không thể áp dụng',disabled:true};
    if(plan.apply.length)return{kind:'apply',label:`↘ Áp dụng GA ${plan.apply[0].ga}`,disabled:false};
    return{kind:'skip',label:'Không thể áp dụng',disabled:true};
  }
  function ensureApplyStyle(){
    if(root.document?.getElementById('lbgGaSuggestionApplyStyle'))return;
    const style=root.document?.createElement('style');if(!style)return;
    style.id='lbgGaSuggestionApplyStyle';
    style.textContent=`
      .lbg-ga-apply-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0;padding:10px 12px;border:1px solid #bbf7d0;border-radius:12px;background:#f0fdf4}
      .lbg-ga-apply-toolbar small{color:#475569}
      .lbg-ga-apply-all,.lbg-ga-apply-one{border:1px solid #16a34a;border-radius:9px;background:#16a34a;color:#fff;font-weight:800;cursor:pointer}
      .lbg-ga-apply-all{padding:9px 13px}.lbg-ga-apply-one{display:block;margin-top:8px;padding:6px 9px;font-size:12px}
      .lbg-ga-apply-one:disabled,.lbg-ga-apply-all:disabled{cursor:not-allowed;opacity:.6}
      .lbg-ga-apply-one[data-state="same"]{border-color:#0f766e;background:#ecfdf5;color:#0f766e}
      .lbg-ga-apply-one[data-state="conflict"],.lbg-ga-apply-one[data-state="skip"]{border-color:#d97706;background:#fff7ed;color:#9a3412}
    `;
    root.document.head?.appendChild(style);
  }
  function refreshApplyUi(panel,rows,a){
    panel.querySelectorAll?.('[data-ga-apply-one]').forEach(button=>{
      const index=Number(button.dataset.gaApplyOne),state=applyState(rows[index],a);
      button.textContent=state.label;button.disabled=state.disabled;button.dataset.state=state.kind;
    });
    const bulk=panel.querySelector?.('[data-ga-apply-all]');
    if(bulk){
      const plan=planGaApplications(rows,a?.entries||[],a?.gaValues||{});
      bulk.disabled=!plan.apply.length;
      bulk.textContent=plan.apply.length?`✓ Áp dụng tất cả GA hợp lệ (${plan.apply.length} ô)`:'✓ Không còn GA trống để áp dụng';
    }
  }
  function toastApplyResult(out,single=false){
    if(typeof toast!=='function')return;
    if(out.applied){
      const extra=out.blocked?` Bỏ qua ${out.blocked} mục xung đột/không xác định.`:'';
      toast(`${single?'Đã áp dụng':'Đã áp dụng'} ${out.applied} ô GA vào Lịch Báo giảng.${extra}`);
      return;
    }
    if(out.same.length){toast('GA gợi ý này đã có trong Lịch Báo giảng.');return}
    if(out.conflicts.length){toast('Ô GA đã có giá trị khác nên hệ thống không ghi đè.');return}
    if(out.inputConflicts){toast('Không xác định được đúng một ô GA trong Lịch Báo giảng; chưa thay đổi dữ liệu.');return}
    toast('Chưa có GA gợi ý hợp lệ để áp dụng.');
  }
  function bindApplyActions(panel,rows,a){
    ensureApplyStyle();
    panel.__lbgGaApplyContext={rows,a};
    if(panel.dataset.gaApplyBound!=='1'){
      panel.dataset.gaApplyBound='1';
      panel.addEventListener('click',event=>{
        const button=event.target?.closest?.('[data-ga-apply-one],[data-ga-apply-all]');if(!button)return;
        const context=panel.__lbgGaApplyContext;if(!context)return;
        const one=button.dataset.gaApplyOne;
        const selected=one!==undefined?[context.rows[Number(one)]].filter(Boolean):context.rows;
        const out=applySuggestions(selected,context.a);
        toastApplyResult(out,one!==undefined);
        refreshApplyUi(panel,context.rows,context.a);
      });
    }
    refreshApplyUi(panel,rows,a);
  }

  function renderPanel(panel,history,a){
    const unique=new Map();
    for(const entry of a.entries||[]){const ev=history.byAddress.get(`${a.sheet}!${entry.address}`);if(ev&&!unique.has(ev.id))unique.set(ev.id,ev)}
    const rows=[...unique.values()].sort((x,y)=>x.date-y.date||dayRank(x.session)-dayRank(y.session)||x.period-y.period),meta=history.crossVersion||{};
    panel.innerHTML=`<div class="alert info"><b>GA gợi ý — đã sửa lịch sử nhiều phiên bản:</b> đang dò <b>${meta.weekCount||1} tuần</b> từ <b>${meta.sourceCount||1} phiên bản TKB</b> đã lưu đến tuần hiện tại. Mỗi tuần chỉ dùng bản mới nhất; tuần đang chọn luôn dùng đúng bản hiện tại. Ghi chú giờ vào học/quản lý HS ở cột địa điểm được bỏ khỏi khóa đối chiếu để không tách nhầm cùng một trường thành hai điểm dạy.</div>${rows.length?`<div class="lbg-ga-apply-toolbar"><button type="button" class="lbg-ga-apply-all" data-ga-apply-all>✓ Áp dụng tất cả GA hợp lệ</button><small>Chỉ điền các ô GA đang trống trong Lịch Báo giảng; không tự ghi đè GA bạn đã nhập tay. Nếu nhiều gợi ý cùng trỏ vào một ô nhưng khác số GA, hệ thống sẽ bỏ qua ô đó.</small></div><div class="wrap"><table><thead><tr><th>STT</th><th>Ngày – buổi – tiết thực dạy</th><th>Trường</th><th>Lớp / nhóm lớp</th><th>Giáo viên / phối hợp</th><th>Luồng</th><th>GA gợi ý & tên bài</th><th>Căn cứ</th></tr></thead><tbody>${rows.map((ev,i)=>{const lesson=titleFor(ev),collab=(ev.participants||[]).length>1,src=(ev.addresses||[]).join(', ');return`<tr><td>${i+1}</td><td>${esc(fmtDate(ev.date))}<br>${esc(ev.session)} – <b>Tiết ${esc(ev.period)}</b></td><td>${esc(ev.school)}</td><td>${esc(ev.classDisplay)}<br><small>Ô nguồn: ${esc(src)}${ev.atoms?.length>1?` • ${ev.atoms.length} ô cùng sự kiện (không tăng GA)`:''}</small></td><td>${collab?'<b style="color:#0f766e">🤝 Phối hợp</b><br>':''}${esc(participantText(ev))}</td><td><b style="color:${ev.track==='stem'?'#b91c1c':'#1d4ed8'}">${esc(trackText(ev))}</b></td><td><div class="lbg-ga-main">${ev.ga==null?'Chưa xác định':`GA ${esc(ev.ga)} – ${esc(trackText(ev))}`}</div><div style="margin-top:4px;font-weight:700;color:#4b342b">${esc(lesson.title)}</div>${lesson.overridden?`<small>Quy ước vận hành: GA ${esc(ev.ga)} lấy tên bài gốc tiết ${esc(lesson.sourcePeriod)}.</small>`:''}<button type="button" class="lbg-ga-apply-one" data-ga-apply-one="${i}">Áp dụng</button></td><td>${esc(basisText(ev,meta))}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="alert warn">Không ghép được các ô nguồn hiện tại với lịch sử TKB.</div>'}`;
    if(rows.length)bindApplyActions(panel,rows,a);
  }
  async function run(){
    const b=root.document?.getElementById('gaSuggestV6'),panel=root.document?.getElementById('gaSuggestionV6Panel'),a=resultNow(),currentBook=bookNow();
    if(!b||!panel)return;
    if(!currentBook||!a?.sheet||!a?.entries?.length){if(typeof toast==='function')toast('Hãy kiểm tra lịch của giáo viên trước.');return}
    const old=b.textContent;b.disabled=true;b.textContent='Đang dò tất cả phiên bản TKB…';panel.hidden=false;panel.innerHTML='<div class="empty">Đang đọc lịch sử các tuần TKB đã lưu và đối chiếu GA…</div>';
    try{
      const sources=await loadVersionSources(currentBook);
      const history=buildHistoryAcrossSources(v7(),sources,currentBook,a.sheet,{parser:parser(),roleResolver,startDateFor,weekLike:weekLikeFor,manualResolver:manualResolverFor(a)});
      renderPanel(panel,history,a);
      if(typeof toast==='function')toast(`Đã dò ${history.crossVersion?.weekCount||1} tuần TKB để gợi ý GA.`);
    }catch(error){
      console.error('GA cross-version:',error);
      panel.innerHTML=`<div class="alert warn"><b>Không phân tích được GA qua các phiên bản TKB:</b> ${esc(error?.message||String(error))}</div>`;
    }finally{b.textContent=old;b.disabled=false}
  }
  function bind(){
    const b=root.document?.getElementById('gaSuggestV6');
    if(!b||!v7()||!parser())return false;
    if(b.dataset.gaCrossVersion==='1')return true;
    b.dataset.gaCrossVersion='1';b.onclick=run;b.textContent='💡 Phân tích giáo án gợi ý';return true;
  }
  function install(){let tries=0;const timer=setInterval(()=>{tries++;if(bind()||tries>300)clearInterval(timer)},100);bind();return true}
  return{
    version:VERSION,dateKey,selectWeekSheets,isOperationalNoteSite,normalizeHistoryEntry,historyParser,buildHistoryAcrossSources,
    gaTargetKey,normalizedGa,resolveApplyTarget,planGaApplications,install
  };
});
