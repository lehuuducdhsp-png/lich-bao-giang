'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaRoleTrackStaleRepairV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260920.4';
  const KNS_SEQUENCE=[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34];
  const STEM_SEQUENCE=[3,6,13,16,20,23,27,32,35];
  const txt=v=>String(v??'').trim();
  const normalizedGa=value=>{if(value===undefined||value===null||txt(value)==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?Math.round(n):null};
  const seqFor=track=>track==='stem'?STEM_SEQUENCE:KNS_SEQUENCE;
  const nextGa=(track,ga)=>{const seq=seqFor(track),i=seq.indexOf(Number(ga));return i<0?seq.find(x=>x>Number(ga))??seq[0]??null:seq[i+1]??null};
  const expectedFromPrevious=(track,previous,current)=>txt(previous?.sheet)===txt(current?.sheet)?normalizedGa(previous?.ga):nextGa(track,previous?.ga);
  const overlap=(a,b)=>{const set=new Set(Array.isArray(a)?a:[]);return(Array.isArray(b)?b:[]).some(x=>set.has(x))};
  function rgb(cell){
    try{
      const c=cell?.font?.color||{};
      if(c.argb)return String(c.argb).slice(-6).toUpperCase();
      if(Number(c.indexed)===10)return'FF0000';
      return'';
    }catch{return''}
  }
  function isRedCell(cell){
    const value=rgb(cell);if(!/^[0-9A-F]{6}$/.test(value))return false;
    const r=parseInt(value.slice(0,2),16),g=parseInt(value.slice(2,4),16),b=parseInt(value.slice(4,6),16);
    return r>=150&&r>g*1.45&&r>b*1.35;
  }
  function summaryRole(intelligence,ws,code){
    try{return txt(intelligence?.summaryRoles?.(ws)?.get?.(txt(code).toUpperCase())?.role).toUpperCase()}catch{return''}
  }
  function workbookRole(intelligence,book,code){
    const target=txt(code).toUpperCase();if(!target||!book)return'';
    let sawCtv=false,sawKns=false;
    for(const ws of book.worksheets||[]){
      const role=summaryRole(intelligence,ws,target);
      if(role==='STEM')return'STEM';
      if(role==='CTV')sawCtv=true;
      else if(role==='KNS')sawKns=true;
    }
    return sawCtv?'CTV':sawKns?'KNS':'';
  }
  function roleFor(ws,code,e,fallback,referenceBook=null,intelligence=null){
    const intel=intelligence||root.LBGTeacherIntelligenceV6;
    const globalRole=workbookRole(intel,referenceBook,code);
    // Ban STEM là thuộc tính nghiệp vụ của GV trong file đang dùng: chỉ cần workbook hiện tại
    // xác nhận mã GV màu đỏ ở bất kỳ bảng tổng tuần nào thì lịch sử của mã đó phải đi luồng STEM.
    if(globalRole==='STEM')return'STEM';
    let refWs=null;try{refWs=referenceBook?.getWorksheet?.(ws?.name)||null}catch{}
    const refSummary=summaryRole(intel,refWs,code);
    if(refSummary==='STEM')return'STEM';
    try{
      const row=Number(e?.row),col=Number(e?.col);
      if(refWs&&row>0&&col>0&&isRedCell(refWs.getCell?.(row,col)))return'STEM';
    }catch{}
    const sourceSummary=summaryRole(intel,ws,code);
    if(sourceSummary==='STEM')return'STEM';
    try{
      const row=Number(e?.row),col=Number(e?.col);
      if(row>0&&col>0&&isRedCell(ws?.getCell?.(row,col)))return'STEM';
    }catch{}
    let role='';try{role=txt(fallback?.(ws,code,e)).toUpperCase()}catch{}
    if(role==='STEM'||role==='CTV'||role==='KNS')return role;
    if(globalRole==='CTV'||refSummary==='CTV'||sourceSummary==='CTV')return'CTV';
    return'KNS';
  }
  const eventTime=ev=>{
    const t=ev?.date instanceof Date&&!Number.isNaN(ev.date.getTime())?ev.date.getTime():0;
    const session=txt(ev?.session).toLowerCase().startsWith('sáng')?0:1;
    return[t,session,Number(ev?.period)||0];
  };
  const before=(a,b)=>{const x=eventTime(a),y=eventTime(b);return x[0]<y[0]||(x[0]===y[0]&&(x[1]<y[1]||(x[1]===y[1]&&x[2]<y[2])))};

  function contaminationCandidate(track,expected,count){
    let ga=normalizedGa(expected);if(ga===null)return null;
    for(let i=0;i<Math.max(0,Number(count)||0);i++){ga=nextGa(track,ga);if(ga===null)return null}
    return ga;
  }
  function interveningOpposite(history,ev,previous){
    if(!history?.events||!ev||!previous)return[];
    return history.events.filter(x=>
      x&&x!==ev&&x.track!==ev.track&&
      txt(x.locationKey)===txt(ev.locationKey)&&Number(x.grade)===Number(ev.grade)&&
      overlap(x.members,ev.members)&&before(previous,x)&&before(x,ev)
    );
  }
  function sameWeekLegacyCandidate(history,ev,expected){
    const base=normalizedGa(expected),members=Array.isArray(ev?.members)?ev.members:[];
    if(base===null||!history?.events||!ev||!txt(ev.sheet)||!members.length)return{candidate:null,count:0,counts:[],eventIds:[]};
    const counts=[],ids=new Set();
    for(const member of members){
      const prior=history.events.filter(x=>
        x&&x!==ev&&x.track===ev.track&&txt(x.sheet)===txt(ev.sheet)&&
        txt(x.locationKey)===txt(ev.locationKey)&&Number(x.grade)===Number(ev.grade)&&
        (Array.isArray(x.members)?x.members:[]).includes(member)&&before(x,ev)
      );
      counts.push(prior.length);for(const x of prior)ids.add(x.id||'');
    }
    const candidates=counts.map(count=>{
      let ga=base;for(let i=0;i<count;i++){ga=nextGa(ev.track,ga);if(ga===null)break}return ga
    }).filter(x=>x!==null);
    const uniq=[...new Set(candidates)];
    const count=counts.length&&new Set(counts).size===1?counts[0]:0;
    return{candidate:uniq.length===1&&count>0?uniq[0]:null,count,counts,eventIds:[...ids].filter(Boolean)};
  }
  function repairHistory(history){
    if(!history||!Array.isArray(history.events))return history;
    for(const ev of history.events){
      if(ev?.gaSource!=='manual')continue;
      const current=normalizedGa(ev.ga);if(current===null)continue;
      const prev=(ev.previousEvents||[]).filter(x=>x?.track===ev.track&&normalizedGa(x?.ga)!==null).sort((a,b)=>before(a,b)?1:-1);
      if(!prev.length)continue;
      const expectedSet=[...new Set(prev.map(x=>expectedFromPrevious(ev.track,x,ev)).filter(x=>x!==null))];
      if(expectedSet.length!==1)continue;
      const expected=expectedSet[0];if(expected===current)continue;
      const previous=prev[0],opposite=interveningOpposite(history,ev,previous);
      if(!opposite.length)continue;
      const contaminated=contaminationCandidate(ev.track,expected,opposite.length);
      if(contaminated!==current)continue;
      ev.__lbgStaleRoleTrackManual=current;
      ev.__lbgRoleTrackExpected=expected;
      ev.__lbgOppositeTrackEvents=opposite.map(x=>x.id||'').filter(Boolean);
      ev.ga=expected;
      ev.gaSource='previous';
      ev.historyMismatch=false;
    }
    history.__lbgGaRoleTrackStaleRepair=VERSION;
    return history;
  }
  function wrapBuildHistory(original){
    if(typeof original!=='function')return null;
    const wrapped=function(book,selectedSheet,opts={}){
      const fallback=opts?.roleResolver;
      let referenceBook=null;try{referenceBook=typeof wb!=='undefined'?wb:null}catch{}
      const safeOpts={...opts,roleResolver:(ws,code,e)=>roleFor(ws,code,e,fallback,referenceBook)};
      return repairHistory(original.call(this,book,selectedSheet,safeOpts));
    };
    wrapped.__lbgGaRoleTrackStaleRepair=VERSION;
    wrapped.__lbgOriginalBuildHistory=original;
    return wrapped;
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,KNS_SEQUENCE,STEM_SEQUENCE,seqFor,nextGa,expectedFromPrevious,rgb,isRedCell,summaryRole,workbookRole,roleFor,contaminationCandidate,interveningOpposite,sameWeekLegacyCandidate,repairHistory,wrapBuildHistory};
  }

  function installOnce(){
    const v7=root.LBGGaSuggestionV7;
    if(!v7?.buildHistory)return false;
    if(v7.buildHistory.__lbgGaRoleTrackStaleRepair!==VERSION){
      const wrapped=wrapBuildHistory(v7.buildHistory);if(!wrapped)return false;v7.buildHistory=wrapped;
    }
    try{root.document.dispatchEvent(new CustomEvent('lbg-ga-role-track-stale-repair-ready',{detail:{version:VERSION}}))}catch{}
    return true;
  }
  function install(){let tries=0;const tick=()=>{tries++;if(installOnce())return;if(tries<400)setTimeout(tick,50)};tick();return true}
  return{VERSION,KNS_SEQUENCE,STEM_SEQUENCE,seqFor,nextGa,expectedFromPrevious,rgb,isRedCell,summaryRole,workbookRole,roleFor,contaminationCandidate,interveningOpposite,sameWeekLegacyCandidate,repairHistory,wrapBuildHistory,install};
});
