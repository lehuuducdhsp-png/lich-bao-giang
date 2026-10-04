'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaProgressDashboardV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20261004.1';
  const KNS_SEQUENCE=[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34];
  const STEM_SEQUENCE=[3,6,13,16,20,23,27,32,35];
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sourceCache=new Map();

  function seqFor(track){return track==='stem'?STEM_SEQUENCE:KNS_SEQUENCE}
  function nextGa(track,ga){
    const seq=seqFor(track);
    if(ga===null||ga===undefined||txt(ga)==='')return seq[0]??null;
    const i=seq.indexOf(Number(ga));
    return i>=0?(seq[i+1]??null):(seq.find(x=>x>Number(ga))??seq[0]??null);
  }
  function dateValue(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.getTime();
    const n=Date.parse(v||'');return Number.isFinite(n)?n:0;
  }
  function classMember(value){
    const m=txt(value).match(/^([1-5])\s*\/\s*([A-ZÀ-Ỹ0-9]{1,5})$/i);
    return m?`${Number(m[1])}/${String(m[2]).toUpperCase()}`:'';
  }
  function classSortValue(value){
    const m=txt(value).match(/^([1-5])\/([0-9]+)$/);if(m)return[Number(m[1]),Number(m[2]),''];
    const n=txt(value).match(/^([1-5])\/(.+)$/);if(n)return[Number(n[1]),9999,n[2]];
    const g=txt(value).match(/KHỐI\s*([1-5])/i);return[g?Number(g[1]):99,9999,txt(value)];
  }
  function compareClass(a,b){
    const aa=classSortValue(a),bb=classSortValue(b);
    return aa[0]-bb[0]||aa[1]-bb[1]||String(aa[2]).localeCompare(String(bb[2]),'vi');
  }
  function isWholeGradeEvent(ev){
    const f=fold(ev?.classDisplay||ev?.classId);
    return new RegExp(`\\b(?:KHOI|LOP)\\s*${Number(ev?.grade)}\\s*\\(\\s*\\d+\\s*LOP\\s*\\)`).test(f)||new RegExp(`^G${Number(ev?.grade)}:KHOI\\s*${Number(ev?.grade)}\\b`).test(f);
  }
  function specificMembers(ev){
    const out=[];
    for(const raw of Array.isArray(ev?.members)?ev.members:[]){const key=classMember(raw);if(key&&!out.includes(key))out.push(key)}
    return out;
  }
  function locationMeta(ev){
    const atom=Array.isArray(ev?.atoms)&&ev.atoms.length?ev.atoms[0]:{};
    let school=txt(atom?.schoolName||atom?.school),site=txt(atom?.siteDisplay||atom?.siteName);
    if(!school){
      const label=txt(ev?.school),parts=label.split(/\n+/).map(txt).filter(Boolean);school=parts[0]||'Chưa xác định';if(!site&&parts.length>1)site=parts.slice(1).join(' • ');
    }
    return{school:school||'Chưa xác định',site,locationKey:txt(ev?.locationKey)};
  }
  function compactTrackEvents(events,track){
    const sorted=[...(events||[])].filter(e=>e?.track===track).sort((a,b)=>dateValue(a?.date)-dateValue(b?.date)||Number(a?.period||0)-Number(b?.period||0));
    const out=[],seen=new Set();
    for(const ev of sorted){const k=`${txt(ev?.sheet)}|${ev?.ga??'?'}`;if(seen.has(k))continue;seen.add(k);out.push(ev)}
    return out;
  }
  function summarizeTrack(events,track){
    const compact=compactTrackEvents(events,track),known=compact.filter(e=>Number.isFinite(Number(e?.ga))),lastEvent=compact[compact.length-1]||null,lastKnown=known[known.length-1]||null;
    const lastGa=lastKnown?Number(lastKnown.ga):null,next=nextGa(track,lastGa);
    return{
      track,count:compact.length,lastGa,nextGa:next,lastSheet:txt(lastEvent?.sheet),lastDate:txt(lastEvent?.dateKey),done:lastGa!==null&&next===null,
      history:compact.map(ev=>({sheet:txt(ev?.sheet),dateKey:txt(ev?.dateKey),ga:Number.isFinite(Number(ev?.ga))?Number(ev.ga):null,source:txt(ev?.gaSource),period:Number(ev?.period)||null}))
    };
  }
  function buildKnownClasses(events){
    const known=new Map();
    for(const ev of events||[]){
      const meta=locationMeta(ev),key=`${meta.locationKey}|${Number(ev?.grade)}`;
      if(!known.has(key))known.set(key,new Set());
      for(const member of specificMembers(ev))known.get(key).add(member);
    }
    return known;
  }
  function memberListForEvent(ev,known){
    const specific=specificMembers(ev);if(specific.length)return specific;
    const meta=locationMeta(ev),key=`${meta.locationKey}|${Number(ev?.grade)}`;
    if(isWholeGradeEvent(ev)){
      const members=[...(known.get(key)||[])].sort(compareClass);
      if(members.length)return members;
      return[`KHỐI ${Number(ev?.grade)}`];
    }
    const raw=txt(ev?.classDisplay),single=classMember(raw);if(single)return[single];
    return[raw||`KHỐI ${Number(ev?.grade)}`];
  }
  function recentRhythm(events,limit=6){
    const sorted=[...(events||[])].sort((a,b)=>dateValue(a?.date)-dateValue(b?.date)||Number(a?.period||0)-Number(b?.period||0)),seen=new Set(),out=[];
    for(const ev of sorted){
      const k=`${txt(ev?.sheet)}|${txt(ev?.track)}|${ev?.ga??'?'}`;if(seen.has(k))continue;seen.add(k);
      out.push({track:ev?.track==='stem'?'stem':'kns',ga:Number.isFinite(Number(ev?.ga))?Number(ev.ga):null,sheet:txt(ev?.sheet)});
    }
    return out.slice(-Math.max(1,Number(limit)||6));
  }
  function buildClassProgress(history){
    const events=[...(history?.events||[])].sort((a,b)=>dateValue(a?.date)-dateValue(b?.date)||Number(a?.period||0)-Number(b?.period||0)||txt(a?.id).localeCompare(txt(b?.id))),known=buildKnownClasses(events),rows=new Map();
    for(const ev of events){
      const meta=locationMeta(ev),members=memberListForEvent(ev,known);
      for(const member of members){
        const key=[meta.locationKey,Number(ev?.grade),member].join('|');
        if(!rows.has(key))rows.set(key,{key,locationKey:meta.locationKey,school:meta.school,site:meta.site,grade:Number(ev?.grade)||null,className:member,events:[],warnings:[],notes:[]});
        const row=rows.get(key);row.events.push(ev);if(!row.site&&meta.site)row.site=meta.site;if((ev?.gaSource==='conflict'||ev?.historyMismatch===true)&&!row.warnings.includes('Mâu thuẫn lịch sử GA'))row.warnings.push('Mâu thuẫn lịch sử GA');if(ev?.ga===null||ev?.ga===undefined){if(!row.warnings.includes('Có lần dạy chưa xác định GA'))row.warnings.push('Có lần dạy chưa xác định GA')}if(ev?.partialHistory===true&&!row.notes.includes('Có giai đoạn lớp gộp/tách được nối theo lịch sử'))row.notes.push('Có giai đoạn lớp gộp/tách được nối theo lịch sử');
      }
    }
    const out=[];
    for(const row of rows.values()){
      const kns=summarizeTrack(row.events,'kns'),stem=summarizeTrack(row.events,'stem'),rhythm=recentRhythm(row.events,6),last=[...row.events].sort((a,b)=>dateValue(b?.date)-dateValue(a?.date)||Number(b?.period||0)-Number(a?.period||0))[0]||null;
      const status=row.warnings.length?'review':'ok';
      out.push({...row,kns,stem,rhythm,status,lastSheet:txt(last?.sheet),lastDate:txt(last?.dateKey),stemState:stem.done?'finished':stem.count?'has':'none'});
    }
    out.sort((a,b)=>fold(a.school).localeCompare(fold(b.school),'vi')||fold(a.site).localeCompare(fold(b.site),'vi')||Number(a.grade)-Number(b.grade)||compareClass(a.className,b.className));
    return out;
  }
  function filterRows(rows,filters={}){
    const school=txt(filters.school),grade=txt(filters.grade),state=txt(filters.state),stemNext=txt(filters.stemNext),q=fold(filters.query);
    return(rows||[]).filter(row=>{
      if(school&&school!=='__all'&&row.school!==school)return false;
      if(grade&&grade!=='__all'&&Number(row.grade)!==Number(grade))return false;
      if(state==='review'&&row.status!=='review')return false;
      if(state==='stem-none'&&row.stem.count!==0)return false;
      if(state==='stem-has'&&row.stem.count===0)return false;
      if(state==='stem-finished'&&!row.stem.done)return false;
      if(stemNext&&stemNext!=='__all'&&String(row.stem.nextGa??'')!==stemNext)return false;
      if(q&&!fold([row.school,row.site,row.className,`GA${row.kns.lastGa??''}`,`GA${row.stem.lastGa??''}`].join(' ')).includes(q))return false;
      return true;
    });
  }
  function summarizeRows(rows){
    const schoolCount=new Set((rows||[]).map(x=>x.school)).size;
    return{schools:schoolCount,classes:(rows||[]).length,kns:(rows||[]).filter(x=>x.kns.count>0).length,stem:(rows||[]).filter(x=>x.stem.count>0).length,stemNone:(rows||[]).filter(x=>x.stem.count===0).length,review:(rows||[]).filter(x=>x.status==='review').length};
  }
  function nextStemDistribution(rows){
    const map=new Map();
    for(const row of rows||[]){const ga=row?.stem?.nextGa;if(ga===null||ga===undefined)continue;map.set(Number(ga),(map.get(Number(ga))||0)+1)}
    return[...map.entries()].sort((a,b)=>STEM_SEQUENCE.indexOf(a[0])-STEM_SEQUENCE.indexOf(b[0])).map(([ga,count])=>({ga,count}));
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,KNS_SEQUENCE,STEM_SEQUENCE,seqFor,nextGa,classMember,isWholeGradeEvent,specificMembers,locationMeta,compactTrackEvents,summarizeTrack,buildKnownClasses,memberListForEvent,recentRhythm,buildClassProgress,filterRows,summarizeRows,nextStemDistribution};
  }

  const q=id=>root.document.getElementById(id);
  const bookNow=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const versionsNow=()=>{try{return typeof versions!=='undefined'&&Array.isArray(versions)?versions:[]}catch{return[]}};
  const activeVersion=()=>{try{return typeof activeId!=='undefined'?txt(activeId):'active'}catch{return'active'}};
  const startDateFor=ws=>{try{const d=typeof startDate==='function'?startDate(ws?.name):null;return d instanceof Date&&!Number.isNaN(d.getTime())?d:null}catch{return null}};
  const weekLikeFor=ws=>{try{return typeof weekLike==='function'?Boolean(weekLike(ws)):true}catch{return true}};
  function roleResolver(ws,code){const m=root.LBGTeacherIntelligenceV6?.summaryRoles?.(ws)?.get?.(txt(code).toUpperCase());return m?.role||'KNS'}
  function weekDate(ws){
    const d=startDateFor(ws);if(d)return d;
    const m=txt(ws?.name).match(/^(\d{1,2})T(\d{1,2})$/i);if(!m)return null;const year=new Date().getFullYear(),x=new Date(year,Number(m[2])-1,Number(m[1]),12);return Number.isNaN(x.getTime())?null:x;
  }
  function weekSheets(book){
    return(book?.worksheets||[]).filter(ws=>weekLikeFor(ws)&&weekDate(ws)).sort((a,b)=>weekDate(a)-weekDate(b));
  }
  function latestWeekName(book){const sheets=weekSheets(book);return sheets[sheets.length-1]?.name||''}
  async function loadVersionSources(book){
    const list=versionsNow(),active=activeVersion(),out=[];
    for(const item of list){
      if(item?.id===active&&book){out.push({id:item.id,created:item.created,book,active:true});continue}
      if(!item?.buffer||!root.ExcelJS?.Workbook)continue;
      const key=`${txt(item.id)}|${txt(item.created)}|${txt(item.size)}`;let parsed=sourceCache.get(key);
      if(!parsed){parsed=new root.ExcelJS.Workbook();await parsed.xlsx.load(item.buffer.slice(0));sourceCache.set(key,parsed)}
      out.push({id:item.id,created:item.created,book:parsed,active:false});
    }
    if(book&&!out.some(x=>x.book===book))out.push({id:active||'active',created:new Date().toISOString(),book,active:true});
    return out;
  }
  async function analyzeProgress(book,selectedSheet){
    const base=root.LBGGaSuggestionV7,cross=root.LBGGaSuggestionCrossVersionV1,per=root.LBGGaPerClassV2,parser=root.LBGTkbParserV2;
    if(!book||!selectedSheet)throw new Error('Chưa có TKB hoặc tuần chốt dữ liệu.');
    if(!base?.buildHistory||!cross?.buildHistoryAcrossSources||!parser?.scanAssignments)throw new Error('Bộ phân tích GA chưa sẵn sàng.');
    const sources=await loadVersionSources(book),opts={parser,roleResolver,startDateFor,weekLike:weekLikeFor};
    const history=per?.buildCanonicalHistoryAcrossSources?per.buildCanonicalHistoryAcrossSources(cross,base,sources,book,selectedSheet,opts):cross.buildHistoryAcrossSources(base,sources,book,selectedSheet,opts);
    return{history,rows:buildClassProgress(history)};
  }
  function fmtGa(track){
    if(!track?.count)return'Chưa học';
    if(track.lastGa===null)return'Chưa xác định';
    return`GA ${track.lastGa}`;
  }
  function fmtNext(track){return track?.done?'Hoàn tất chuỗi':(track?.nextGa==null?'—':`GA ${track.nextGa}`)}
  function historyHtml(track,label){
    const rows=track?.history||[];
    if(!rows.length)return`<div class="lbg-gpd-history-empty">Chưa có lịch sử ${esc(label)}.</div>`;
    return`<div class="lbg-gpd-history-title">${esc(label)}</div><div class="lbg-gpd-history-list">${rows.map(x=>`<span><b>${esc(x.sheet||'—')}</b> · ${x.ga==null?'?':`GA ${esc(x.ga)}`}</span>`).join('')}</div>`;
  }
  function rhythmHtml(row){
    if(!row.rhythm?.length)return'<span class="lbg-gpd-muted">Chưa có</span>';
    return row.rhythm.map(x=>`<span class="lbg-gpd-rhythm ${x.track}">${x.track==='stem'?'STEM':'KNS'} ${x.ga==null?'?':`GA${esc(x.ga)}`}</span>`).join('');
  }
  function stemPlanHtml(row){
    if(row.status==='review')return'<span class="lbg-gpd-badge review">⚠ Cần kiểm tra dữ liệu</span>';
    if(row.stem.done)return'<span class="lbg-gpd-badge done">✓ Đã hết chuỗi STEM</span>';
    if(row.stem.count===0)return`<span class="lbg-gpd-badge stem">STEM đầu tiên: GA ${esc(row.stem.nextGa)}</span>`;
    return`<span class="lbg-gpd-badge stem">STEM kế tiếp: GA ${esc(row.stem.nextGa)}</span>`;
  }
  function renderSummary(rows){
    const s=summarizeRows(rows),dist=nextStemDistribution(rows);
    q('lbgGpdSummary').innerHTML=`<div class="lbg-gpd-stat"><b>${s.schools}</b><span>Trường</span></div><div class="lbg-gpd-stat"><b>${s.classes}</b><span>Lớp/nhóm lớp</span></div><div class="lbg-gpd-stat"><b>${s.kns}</b><span>Đã có KNS</span></div><div class="lbg-gpd-stat"><b>${s.stem}</b><span>Đã có STEM</span></div><div class="lbg-gpd-stat ${s.review?'warn':''}"><b>${s.review}</b><span>Cần kiểm tra</span></div>`;
    q('lbgGpdStemDist').innerHTML=dist.length?`<span class="lbg-gpd-dist-label">STEM kế tiếp:</span>${dist.map(x=>`<button type="button" data-next-stem="${x.ga}">GA ${x.ga}<b>${x.count}</b></button>`).join('')}`:'<span class="lbg-gpd-muted">Chưa có dữ liệu STEM kế tiếp.</span>';
  }
  function schoolGroups(rows){
    const map=new Map();for(const row of rows){if(!map.has(row.school))map.set(row.school,[]);map.get(row.school).push(row)}return[...map.entries()];
  }
  function rowHtml(row,index){
    const site=row.site||'—',review=row.status==='review',warn=review?row.warnings.join(' • '):'';
    return`<tr class="${review?'lbg-gpd-row-review':''}"><td><b>${esc(row.className)}</b><br><small>Khối ${esc(row.grade)}</small></td><td>${esc(site)}</td><td class="lbg-gpd-kns"><b>${esc(fmtGa(row.kns))}</b><br><small>Tiếp: ${esc(fmtNext(row.kns))}</small></td><td class="lbg-gpd-stem"><b>${esc(fmtGa(row.stem))}</b><br><small>Tiếp: ${esc(fmtNext(row.stem))}</small></td><td><div class="lbg-gpd-rhythm-wrap">${rhythmHtml(row)}</div></td><td>${stemPlanHtml(row)}${warn?`<div class="lbg-gpd-warning-text">${esc(warn)}</div>`:''}</td><td><button type="button" class="lbg-gpd-detail-btn" data-detail="${index}">Chi tiết</button></td></tr><tr class="lbg-gpd-detail-row" data-detail-row="${index}" hidden><td colspan="7"><div class="lbg-gpd-detail-grid"><div>${historyHtml(row.kns,'Lịch sử KNS')}</div><div>${historyHtml(row.stem,'Lịch sử STEM')}</div><div><div class="lbg-gpd-history-title">Ghi chú</div><div>${row.notes.length?esc(row.notes.join(' • ')):'Không có cảnh báo về nhịp 3:1. STEM có thể dạy trước hoặc sau KNS; hai luồng được theo dõi độc lập.'}</div><div style="margin-top:6px"><b>Lần dạy gần nhất:</b> ${esc(row.lastSheet||'—')}</div></div></div></td></tr>`;
  }
  function currentFilters(){return{school:q('lbgGpdSchool')?.value||'__all',grade:q('lbgGpdGrade')?.value||'__all',state:q('lbgGpdState')?.value||'__all',stemNext:q('lbgGpdStemNext')?.value||'__all',query:q('lbgGpdSearch')?.value||''}}
  function refreshStemNextOptions(rows,keep=true){
    const el=q('lbgGpdStemNext');if(!el)return;const current=keep?el.value:'__all',dist=nextStemDistribution(rows);
    el.innerHTML='<option value="__all">Tất cả GA STEM kế tiếp</option>'+dist.map(x=>`<option value="${x.ga}">STEM kế tiếp GA ${x.ga} (${x.count} lớp)</option>`).join('');
    if([...el.options].some(x=>x.value===current))el.value=current;
  }
  function refreshSchoolOptions(rows,keep=true){
