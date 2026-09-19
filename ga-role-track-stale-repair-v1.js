'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaRoleTrackStaleRepairV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260919.1';
  const KNS_SEQUENCE=[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34];
  const STEM_SEQUENCE=[3,6,13,16,20,23,27,32,35];
  const txt=v=>String(v??'').trim();
  const normalizedGa=value=>{if(value===undefined||value===null||txt(value)==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?Math.round(n):null};
  const seqFor=track=>track==='stem'?STEM_SEQUENCE:KNS_SEQUENCE;
  const nextGa=(track,ga)=>{const seq=seqFor(track),i=seq.indexOf(Number(ga));return i<0?seq.find(x=>x>Number(ga))??seq[0]??null:seq[i+1]??null};
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
  function roleFor(ws,code,e,fallback){
    // Nguồn ưu tiên 1: chính ô mã GV trong TKB. Chữ đỏ = STEM.
    // Điều này giữ đúng cả các phiên bản TKB cũ khi bảng tổng/tên GV thay đổi cách ghi.
    try{
      const row=Number(e?.row),col=Number(e?.col);
      if(row>0&&col>0&&isRedCell(ws?.getCell?.(row,col)))return'STEM';
    }catch{}
    // Nguồn ưu tiên 2: bảng tổng bên phải (teacher-intelligence-v6).
    let role='';try{role=txt(fallback?.(ws,code,e)).toUpperCase()}catch{}
    if(role==='STEM'||role==='CTV'||role==='KNS')return role;
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
  function repairHistory(history){
    if(!history||!Array.isArray(history.events))return history;
    for(const ev of history.events){
      if(ev?.gaSource!=='manual')continue;
      const current=normalizedGa(ev.ga);if(current===null)continue;
      const prev=(ev.previousEvents||[]).filter(x=>x?.track===ev.track&&normalizedGa(x?.ga)!==null).sort((a,b)=>before(a,b)?1:-1);
      if(!prev.length)continue;
      const expectedSet=[...new Set(prev.map(x=>nextGa(ev.track,x.ga)).filter(x=>x!==null))];
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
      const safeOpts={...opts,roleResolver:(ws,code,e)=>roleFor(ws,code,e,fallback)};
      return repairHistory(original.call(this,book,selectedSheet,safeOpts));
    };
    wrapped.__lbgGaRoleTrackStaleRepair=VERSION;
    wrapped.__lbgOriginalBuildHistory=original;
    return wrapped;
  }
  function rawValue(values,key){
    if(!values||typeof values!=='object'||!key||!Object.prototype.hasOwnProperty.call(values,key))return undefined;
    const value=values[key];return value===undefined||value===null||txt(value)===''?undefined:value;
  }
  function commonRaw(values,target){
    const direct=rawValue(values,target?.defaultKey);
    return direct!==undefined?direct:rawValue(values,target?.legacyKey);
  }
  function promoteSafeRoleTrackConflicts(plan,values={}){
    const next={...plan,apply:[...(plan?.apply||[])],same:[...(plan?.same||[])],skipped:[...(plan?.skipped||[])],conflicts:[]};
    for(const conflict of plan?.conflicts||[]){
      if(conflict?.reason!=='existing-class-ga'){next.conflicts.push(conflict);continue}
      const exact=normalizedGa(rawValue(values,conflict?.target?.key));
      const common=normalizedGa(commonRaw(values,conflict?.target));
      const items=Array.isArray(conflict?.items)?conflict.items:[];
      const suggestions=[...new Set(items.map(x=>normalizedGa(x?.ga)).filter(x=>x!==null))];
      const stale=items.length>0&&items.every(x=>{
        const old=normalizedGa(x?.ev?.__lbgStaleRoleTrackManual);
        const expected=normalizedGa(x?.ev?.__lbgRoleTrackExpected);
        return old!==null&&old===exact&&expected!==null&&expected===normalizedGa(x?.ga);
      });
      // Chỉ tự sửa khi lịch sử đã chứng minh chính GA lớp hiện tại bị tăng đúng
      // số bước do các lần STEM/KNS của luồng đối diện chen giữa. Đây là bằng chứng
      // theo từng lớp, mạnh hơn GA chung của địa điểm (vì một buổi có thể có nhiều GA).
      // Các GA tay không khớp mẫu "trộn luồng" vẫn được bảo vệ.
      if(stale&&exact!==null&&suggestions.length===1&&suggestions[0]!==exact){
        next.apply.push({target:conflict.target,ga:suggestions[0],items,replaceExisting:true,reason:'stale-role-track-mix'});
      }else next.conflicts.push(conflict);
    }
    return next;
  }
  function wrapPlanApplications(original){
    if(typeof original!=='function')return null;
    const wrapped=function(rows,entries,values,normalizer){
      return promoteSafeRoleTrackConflicts(original.call(this,rows,entries,values,normalizer),values);
    };
    wrapped.__lbgGaRoleTrackStaleRepair=VERSION;
    wrapped.__lbgOriginalPlanApplications=original;
    return wrapped;
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,KNS_SEQUENCE,STEM_SEQUENCE,seqFor,nextGa,rgb,isRedCell,roleFor,contaminationCandidate,interveningOpposite,repairHistory,wrapBuildHistory,promoteSafeRoleTrackConflicts,wrapPlanApplications};
  }

  function installOnce(){
    const v7=root.LBGGaSuggestionV7,per=root.LBGGaPerClassV2;
    if(!v7?.buildHistory||!per?.planApplications)return false;
    if(v7.buildHistory.__lbgGaRoleTrackStaleRepair!==VERSION){
      const wrapped=wrapBuildHistory(v7.buildHistory);if(!wrapped)return false;v7.buildHistory=wrapped;
    }
    if(per.planApplications.__lbgGaRoleTrackStaleRepair!==VERSION){
      const wrapped=wrapPlanApplications(per.planApplications);if(!wrapped)return false;per.planApplications=wrapped;
    }
    try{root.document.dispatchEvent(new CustomEvent('lbg-ga-role-track-stale-repair-ready',{detail:{version:VERSION}}))}catch{}
    return true;
  }
  function install(){let tries=0;const tick=()=>{tries++;if(installOnce())return;if(tries<400)setTimeout(tick,50)};tick();return true}
  return{VERSION,KNS_SEQUENCE,STEM_SEQUENCE,seqFor,nextGa,rgb,isRedCell,roleFor,contaminationCandidate,interveningOpposite,repairHistory,wrapBuildHistory,promoteSafeRoleTrackConflicts,wrapPlanApplications,install};
});
