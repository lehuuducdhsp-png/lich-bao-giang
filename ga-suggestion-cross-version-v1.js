'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaSuggestionCrossVersionV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260912.2';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
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

  if(typeof module!=='undefined'&&module.exports){
    return{VERSION,dateKey,selectWeekSheets,isOperationalNoteSite,normalizeHistoryEntry,historyParser,buildHistoryAcrossSources};
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
  function renderPanel(panel,history,a){
    const unique=new Map();
    for(const entry of a.entries||[]){const ev=history.byAddress.get(`${a.sheet}!${entry.address}`);if(ev&&!unique.has(ev.id))unique.set(ev.id,ev)}
    const rows=[...unique.values()].sort((x,y)=>x.date-y.date||dayRank(x.session)-dayRank(y.session)||x.period-y.period),meta=history.crossVersion||{};
    panel.innerHTML=`<div class="alert info"><b>GA gợi ý — đã sửa lịch sử nhiều phiên bản:</b> đang dò <b>${meta.weekCount||1} tuần</b> từ <b>${meta.sourceCount||1} phiên bản TKB</b> đã lưu đến tuần hiện tại. Mỗi tuần chỉ dùng bản mới nhất; tuần đang chọn luôn dùng đúng bản hiện tại. Ghi chú giờ vào học/quản lý HS ở cột địa điểm được bỏ khỏi khóa đối chiếu để không tách nhầm cùng một trường thành hai điểm dạy.</div>${rows.length?`<div class="wrap"><table><thead><tr><th>STT</th><th>Ngày – buổi – tiết thực dạy</th><th>Trường</th><th>Lớp / nhóm lớp</th><th>Giáo viên / phối hợp</th><th>Luồng</th><th>GA gợi ý & tên bài</th><th>Căn cứ</th></tr></thead><tbody>${rows.map((ev,i)=>{const lesson=titleFor(ev),collab=(ev.participants||[]).length>1,src=(ev.addresses||[]).join(', ');return`<tr><td>${i+1}</td><td>${esc(fmtDate(ev.date))}<br>${esc(ev.session)} – <b>Tiết ${esc(ev.period)}</b></td><td>${esc(ev.school)}</td><td>${esc(ev.classDisplay)}<br><small>Ô nguồn: ${esc(src)}${ev.atoms?.length>1?` • ${ev.atoms.length} ô cùng sự kiện (không tăng GA)`:''}</small></td><td>${collab?'<b style="color:#0f766e">🤝 Phối hợp</b><br>':''}${esc(participantText(ev))}</td><td><b style="color:${ev.track==='stem'?'#b91c1c':'#1d4ed8'}">${esc(trackText(ev))}</b></td><td><div class="lbg-ga-main">${ev.ga==null?'Chưa xác định':`GA ${esc(ev.ga)} – ${esc(trackText(ev))}`}</div><div style="margin-top:4px;font-weight:700;color:#4b342b">${esc(lesson.title)}</div>${lesson.overridden?`<small>Quy ước vận hành: GA ${esc(ev.ga)} lấy tên bài gốc tiết ${esc(lesson.sourcePeriod)}.</small>`:''}</td><td>${esc(basisText(ev,meta))}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="alert warn">Không ghép được các ô nguồn hiện tại với lịch sử TKB.</div>'}`;
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
  return{version:VERSION,dateKey,selectWeekSheets,isOperationalNoteSite,normalizeHistoryEntry,historyParser,buildHistoryAcrossSources,install};
});