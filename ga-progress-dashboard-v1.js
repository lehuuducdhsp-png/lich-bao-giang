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
    const el=q('lbgGpdSchool');if(!el)return;const current=keep?el.value:'__all',schools=[...new Set(rows.map(x=>x.school))].sort((a,b)=>fold(a).localeCompare(fold(b),'vi'));
    el.innerHTML='<option value="__all">Tất cả trường</option>'+schools.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    if([...el.options].some(x=>x.value===current))el.value=current;
  }
  let allRows=[],lastAnalysis=null;
  function renderRows(){
    const filtered=filterRows(allRows,currentFilters()),host=q('lbgGpdResults');renderSummary(filtered);
    if(!host)return;
    if(!filtered.length){host.innerHTML='<div class="lbg-gpd-empty">Không có lớp phù hợp với bộ lọc hiện tại.</div>';return}
    const search=txt(q('lbgGpdSearch')?.value),schoolFilter=q('lbgGpdSchool')?.value||'__all',groups=schoolGroups(filtered);let counter=0;
    host.innerHTML=groups.map(([school,rows],groupIndex)=>{
      const stem=rows.filter(x=>x.stem.count>0).length,review=rows.filter(x=>x.status==='review').length,open=Boolean(search)||schoolFilter!=='__all'||groups.length===1||groupIndex===0;
      const body=rows.map(row=>rowHtml(row,counter++)).join('');
      return`<details class="lbg-gpd-school" ${open?'open':''}><summary><span><b>${esc(school)}</b><small>${rows.length} lớp • STEM ${stem}${review?` • ⚠ ${review} cần kiểm tra`:''}</small></span><span class="lbg-gpd-chevron">⌄</span></summary><div class="lbg-gpd-table-wrap"><table class="lbg-gpd-table"><thead><tr><th>Lớp</th><th>Cơ sở/điểm dạy</th><th>KNS</th><th>STEM</th><th>Nhịp gần đây</th><th>Phân STEM</th><th></th></tr></thead><tbody>${body}</tbody></table></div></details>`;
    }).join('');
    host.querySelectorAll('[data-detail]').forEach(btn=>btn.onclick=()=>{const row=host.querySelector(`[data-detail-row="${btn.dataset.detail}"]`);if(!row)return;row.hidden=!row.hidden;btn.textContent=row.hidden?'Chi tiết':'Thu gọn'});
  }
  function populateWeeks(book){
    const el=q('lbgGpdWeek');if(!el)return;const current=el.value,sheets=weekSheets(book);
    el.innerHTML=sheets.map(ws=>`<option value="${esc(ws.name)}">${esc(ws.name)}</option>`).join('');
    const preferred=current&&sheets.some(x=>x.name===current)?current:latestWeekName(book);if(preferred)el.value=preferred;
  }
  async function runAnalysis(){
    const book=bookNow(),button=q('lbgGpdScan'),status=q('lbgGpdStatus');
    if(!book){status.innerHTML='<span class="warn">Chưa có file TKB. Hãy tải/chọn TKB trước.</span>';return}
    populateWeeks(book);const sheet=q('lbgGpdWeek')?.value||latestWeekName(book);if(!sheet){status.innerHTML='<span class="warn">Không tìm thấy tuần TKB.</span>';return}
    const old=button?.textContent;if(button){button.disabled=true;button.textContent='Đang quét…'}status.textContent='Đang quét lịch sử KNS – STEM của tất cả trường/lớp…';
    try{
      const out=await analyzeProgress(book,sheet);lastAnalysis=out;allRows=out.rows;refreshSchoolOptions(allRows,false);refreshStemNextOptions(allRows,false);renderRows();
      const meta=out.history?.crossVersion||{};status.innerHTML=`Đã quét đến <b>${esc(sheet)}</b> • ${esc(meta.weekCount||1)} tuần • ${esc(meta.sourceCount||1)} phiên bản TKB • <b>${allRows.length} lớp/nhóm lớp</b>. Không áp quy tắc bắt buộc 3 KNS : 1 STEM.`;
    }catch(error){console.error('GA progress dashboard:',error);status.innerHTML=`<span class="warn"><b>Không quét được tiến độ:</b> ${esc(error?.message||String(error))}</span>`}
    finally{if(button){button.disabled=false;button.textContent=old||'Quét tiến độ'}}
  }
  function exportValue(track){return track.lastGa==null?(track.count?'Chưa xác định':'Chưa học'):`GA ${track.lastGa}`}
  function exportHistory(track){return(track.history||[]).map(x=>`${x.sheet}: ${x.ga==null?'?':`GA${x.ga}`}`).join(' → ')}
  async function exportExcel(){
    const filtered=filterRows(allRows,currentFilters());if(!filtered.length){if(typeof toast==='function')toast('Không có dữ liệu để xuất.');return}
    if(!root.ExcelJS?.Workbook){if(typeof toast==='function')toast('ExcelJS chưa sẵn sàng.');return}
    const workbook=new root.ExcelJS.Workbook(),ws=workbook.addWorksheet('Tiến độ KNS-STEM');
    ws.columns=[
      {header:'Trường',key:'school',width:24},{header:'Cơ sở/điểm dạy',key:'site',width:30},{header:'Khối',key:'grade',width:8},{header:'Lớp',key:'className',width:12},
      {header:'KNS đã học',key:'knsLast',width:14},{header:'KNS kế tiếp',key:'knsNext',width:14},{header:'STEM đã học',key:'stemLast',width:14},{header:'STEM kế tiếp',key:'stemNext',width:15},
      {header:'Tuần gần nhất',key:'lastSheet',width:14},{header:'Nhịp gần đây',key:'rhythm',width:34},{header:'Tình trạng',key:'status',width:22},{header:'Lịch sử KNS',key:'knsHistory',width:55},{header:'Lịch sử STEM',key:'stemHistory',width:45}
    ];
    filtered.forEach(row=>ws.addRow({school:row.school,site:row.site||'',grade:row.grade,className:row.className,knsLast:exportValue(row.kns),knsNext:fmtNext(row.kns),stemLast:exportValue(row.stem),stemNext:fmtNext(row.stem),lastSheet:row.lastSheet,rhythm:row.rhythm.map(x=>`${x.track==='stem'?'STEM':'KNS'} ${x.ga==null?'?':`GA${x.ga}`}`).join(' → '),status:row.status==='review'?row.warnings.join('; '):'Ổn',knsHistory:exportHistory(row.kns),stemHistory:exportHistory(row.stem)}));
    ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:'A1',to:'M1'};
    ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF28C45'}};ws.getRow(1).alignment={vertical:'middle',horizontal:'center'};ws.getRow(1).height=24;
    ws.eachRow((row,rowNumber)=>{if(rowNumber===1)return;row.alignment={vertical:'top',wrapText:true};if(rowNumber%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF9F4'}}});
    const review=workbook.addWorksheet('Cần kiểm tra');review.columns=ws.columns.map(c=>({header:c.header,key:c.key,width:c.width}));filtered.filter(x=>x.status==='review').forEach(row=>review.addRow({school:row.school,site:row.site||'',grade:row.grade,className:row.className,knsLast:exportValue(row.kns),knsNext:fmtNext(row.kns),stemLast:exportValue(row.stem),stemNext:fmtNext(row.stem),lastSheet:row.lastSheet,rhythm:row.rhythm.map(x=>`${x.track==='stem'?'STEM':'KNS'} ${x.ga==null?'?':`GA${x.ga}`}`).join(' → '),status:row.warnings.join('; '),knsHistory:exportHistory(row.kns),stemHistory:exportHistory(row.stem)}));
    review.views=[{state:'frozen',ySplit:1}];review.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};review.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFB45309'}};
    const buffer=await workbook.xlsx.writeBuffer(),blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=root.document.createElement('a');
    a.href=url;a.download=`TIEN_DO_GA_KNS_STEM_${txt(q('lbgGpdWeek')?.value||'TKB')}.xlsx`;root.document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);if(typeof toast==='function')toast(`Đã xuất ${filtered.length} lớp ra Excel.`);
  }
  function ensureStyle(){
    if(q('lbgGaProgressDashboardStyle'))return;const s=root.document.createElement('style');s.id='lbgGaProgressDashboardStyle';s.textContent=`
      #lbgGaProgressDashboard{border:1px solid #f0d6c5;background:linear-gradient(180deg,#fffdfa 0%,#fff 100%)}
      #lbgGaProgressDashboard .lbg-gpd-intro{padding:12px 14px;border:1px solid #fed7aa;border-radius:13px;background:#fff7ed;color:#7c2d12;line-height:1.55;margin-bottom:12px}
      #lbgGaProgressDashboard .lbg-gpd-intro b{color:#9a3412}
      .lbg-gpd-controls{display:grid;grid-template-columns:1.05fr 1.35fr .85fr 1fr 1.15fr;gap:10px;align-items:end;margin:12px 0}
      .lbg-gpd-controls label{display:grid;gap:5px;font-weight:800;color:#5c463a}.lbg-gpd-controls input,.lbg-gpd-controls select{width:100%;min-height:42px;border:1px solid #dfc9bb;border-radius:10px;background:#fff;padding:8px 10px}
      .lbg-gpd-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.lbg-gpd-actions button,.lbg-gpd-dist button,.lbg-gpd-detail-btn{border:1px solid #d49a72;border-radius:10px;background:#fff7ed;color:#8a4b2c;font-weight:850;cursor:pointer;padding:8px 11px}.lbg-gpd-actions .primary{background:#c76532;color:#fff;border-color:#c76532}
      #lbgGpdStatus{font-size:13px;color:#6b5a50;margin:8px 0 12px}.warn{color:#b45309}
      #lbgGpdSummary{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:9px;margin:10px 0}.lbg-gpd-stat{border:1px solid #ead7cb;border-radius:13px;background:#fff;padding:11px 12px}.lbg-gpd-stat b{display:block;font-size:22px;color:#7c3f22}.lbg-gpd-stat span{font-size:12px;color:#74645b}.lbg-gpd-stat.warn{border-color:#fdba74;background:#fff7ed}
      .lbg-gpd-dist{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:8px 0 13px}.lbg-gpd-dist-label{font-weight:850;color:#5c463a}.lbg-gpd-dist button{padding:6px 9px;background:#fff}.lbg-gpd-dist button b{display:inline-grid;place-items:center;margin-left:6px;min-width:22px;height:22px;border-radius:999px;background:#f4d8c5;color:#7c2d12;font-size:11px}
      .lbg-gpd-school{border:1px solid #ead9cf;border-radius:14px;background:#fff;margin:10px 0;overflow:hidden}.lbg-gpd-school>summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#fffaf6}.lbg-gpd-school>summary::-webkit-details-marker{display:none}.lbg-gpd-school>summary b{font-size:15px;color:#4c3328}.lbg-gpd-school>summary small{display:block;margin-top:3px;color:#7b6b62}.lbg-gpd-chevron{font-size:18px}.lbg-gpd-school[open] .lbg-gpd-chevron{transform:rotate(180deg)}
      .lbg-gpd-table-wrap{overflow:auto}.lbg-gpd-table{width:100%;border-collapse:collapse;min-width:1040px}.lbg-gpd-table th{position:sticky;top:0;background:#f8eee7;color:#5d4031;text-align:left;padding:9px 10px;border-bottom:1px solid #e6d3c7;font-size:12px}.lbg-gpd-table td{padding:10px;border-bottom:1px solid #f0e5de;vertical-align:top;font-size:13px}.lbg-gpd-table tr:last-child td{border-bottom:0}.lbg-gpd-row-review{background:#fffaf0}.lbg-gpd-table small{color:#7b6b62}
      .lbg-gpd-rhythm-wrap{display:flex;gap:4px;flex-wrap:wrap}.lbg-gpd-rhythm{display:inline-block;border-radius:999px;padding:4px 7px;font-size:11px;font-weight:850}.lbg-gpd-rhythm.kns{background:#eff6ff;color:#1d4ed8}.lbg-gpd-rhythm.stem{background:#fef2f2;color:#b91c1c}.lbg-gpd-badge{display:inline-block;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900}.lbg-gpd-badge.stem{background:#fef2f2;color:#b91c1c}.lbg-gpd-badge.review{background:#fff7ed;color:#b45309}.lbg-gpd-badge.done{background:#ecfdf5;color:#047857}.lbg-gpd-warning-text{margin-top:5px;font-size:11px;color:#b45309}.lbg-gpd-muted,.lbg-gpd-history-empty{color:#8a7a71}
      .lbg-gpd-detail-row td{background:#fffdfa!important}.lbg-gpd-detail-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:4px}.lbg-gpd-history-title{font-weight:900;color:#5d4031;margin-bottom:6px}.lbg-gpd-history-list{display:flex;flex-wrap:wrap;gap:5px}.lbg-gpd-history-list span{border:1px solid #ead7cb;border-radius:8px;padding:5px 7px;background:#fff;font-size:11px}.lbg-gpd-empty{padding:18px;border:1px dashed #decabc;border-radius:12px;color:#7b6b62;text-align:center}
      @media(max-width:1200px){.lbg-gpd-controls{grid-template-columns:repeat(3,1fr)}#lbgGpdSummary{grid-template-columns:repeat(3,1fr)}.lbg-gpd-detail-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:720px){.lbg-gpd-controls{grid-template-columns:1fr 1fr}#lbgGpdSummary{grid-template-columns:1fr 1fr}.lbg-gpd-detail-grid{grid-template-columns:1fr}.lbg-gpd-actions button{flex:1 1 auto}}
    `;root.document.head.appendChild(s);
  }
  function mount(){
    if(q('lbgGaProgressDashboard'))return true;const main=root.document.querySelector('main.shell');if(!main)return false;
    const card=root.document.createElement('article');card.className='card';card.id='lbgGaProgressDashboard';card.innerHTML=`
      <div class="head"><div><h3>📚 Theo dõi tiến độ KNS – STEM</h3><p>Quét toàn bộ lịch sử TKB theo từng trường, cơ sở và lớp để biết GA đã học, GA kế tiếp và hỗ trợ phân tiết STEM.</p></div><span class="badge">BẢN THỬ</span></div>
      <div class="lbg-gpd-intro"><b>Nguyên tắc:</b> KNS và STEM được theo dõi thành <b>hai tiến trình độc lập</b>. Hệ thống <b>không bắt buộc 3 KNS : 1 STEM</b>; STEM có thể dạy trước KNS hoặc KNS dạy trước STEM. Bảng chỉ cảnh báo khi dữ liệu GA mâu thuẫn/chưa xác định, không cảnh báo chỉ vì thứ tự KNS–STEM khác nhau.</div>
      <div class="lbg-gpd-controls">
        <label>Dữ liệu đến tuần<select id="lbgGpdWeek"></select></label>
        <label>Trường<select id="lbgGpdSchool"><option value="__all">Tất cả trường</option></select></label>
        <label>Khối<select id="lbgGpdGrade"><option value="__all">Tất cả khối</option><option value="1">Khối 1</option><option value="2">Khối 2</option><option value="3">Khối 3</option><option value="4">Khối 4</option><option value="5">Khối 5</option></select></label>
        <label>STEM<select id="lbgGpdState"><option value="__all">Tất cả lớp</option><option value="stem-none">Chưa học STEM</option><option value="stem-has">Đã học STEM</option><option value="stem-finished">Đã hết chuỗi STEM</option><option value="review">⚠ Cần kiểm tra</option></select></label>
        <label>STEM kế tiếp<select id="lbgGpdStemNext"><option value="__all">Tất cả GA STEM kế tiếp</option></select></label>
        <label style="grid-column:span 2">Tìm nhanh<input id="lbgGpdSearch" placeholder="Gõ trường, cơ sở, lớp, GA..."></label>
      </div>
      <div class="lbg-gpd-actions"><button type="button" class="primary" id="lbgGpdScan">🔎 Quét tiến độ</button><button type="button" id="lbgGpdExport">📥 Xuất Excel</button><button type="button" id="lbgGpdOpenAll">Mở tất cả trường</button><button type="button" id="lbgGpdCloseAll">Thu gọn</button></div>
      <div id="lbgGpdStatus">Đang chờ file TKB…</div><div id="lbgGpdSummary"></div><div id="lbgGpdStemDist" class="lbg-gpd-dist"></div><div id="lbgGpdResults"><div class="lbg-gpd-empty">Khi TKB sẵn sàng, bấm <b>Quét tiến độ</b> để tổng hợp.</div></div>`;
    const anchor=q('previewCard');if(anchor?.parentNode===main)main.insertBefore(card,anchor);else main.appendChild(card);ensureStyle();
    q('lbgGpdScan').onclick=runAnalysis;q('lbgGpdExport').onclick=exportExcel;
    ['lbgGpdSchool','lbgGpdGrade','lbgGpdState','lbgGpdStemNext'].forEach(id=>q(id).addEventListener('change',renderRows));q('lbgGpdSearch').addEventListener('input',renderRows);
    q('lbgGpdWeek').addEventListener('change',runAnalysis);
    q('lbgGpdOpenAll').onclick=()=>q('lbgGpdResults')?.querySelectorAll('details.lbg-gpd-school').forEach(x=>x.open=true);q('lbgGpdCloseAll').onclick=()=>q('lbgGpdResults')?.querySelectorAll('details.lbg-gpd-school').forEach(x=>x.open=false);
    q('lbgGpdStemDist').addEventListener('click',event=>{const b=event.target?.closest?.('[data-next-stem]');if(!b)return;const el=q('lbgGpdStemNext');if(el){el.value=b.dataset.nextStem;renderRows()}});
    return true;
  }
  function install(){
    let tries=0,bookSeen=null,autoDone=false;const timer=setInterval(()=>{tries++;if(mount()){
      const book=bookNow();if(book&&book!==bookSeen){bookSeen=book;populateWeeks(book);q('lbgGpdStatus').textContent='TKB đã sẵn sàng. Đang chuẩn bị tổng hợp…';if(!autoDone){autoDone=true;setTimeout(runAnalysis,120)}}
    }if(tries>600)clearInterval(timer)},100);
    root.addEventListener?.('beforeunload',()=>clearInterval(timer),{once:true});return true;
  }
  return{VERSION,KNS_SEQUENCE,STEM_SEQUENCE,seqFor,nextGa,classMember,isWholeGradeEvent,specificMembers,locationMeta,compactTrackEvents,summarizeTrack,buildKnownClasses,memberListForEvent,recentRhythm,buildClassProgress,filterRows,summarizeRows,nextStemDistribution,weekSheets,latestWeekName,loadVersionSources,analyzeProgress,install};
});
