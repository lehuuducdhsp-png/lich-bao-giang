'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaGroupSplitStaleRepairV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260920.1';
  const KNS_SEQUENCE=[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34];
  const STEM_SEQUENCE=[3,6,13,16,20,23,27,32,35];
  const txt=v=>String(v??'').trim();
  const normalizedGa=value=>{if(value===undefined||value===null||txt(value)==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?Math.round(n):null};
  const seqFor=track=>track==='stem'?STEM_SEQUENCE:KNS_SEQUENCE;
  const nextGa=(track,ga)=>{const seq=seqFor(track),i=seq.indexOf(Number(ga));return i<0?seq.find(x=>x>Number(ga))??seq[0]??null:seq[i+1]??null};
  const expectedFromPrevious=(track,previous,current)=>txt(previous?.sheet)===txt(current?.sheet)?normalizedGa(previous?.ga):nextGa(track,previous?.ga);

  function repairHistory(history){
    if(!history||!Array.isArray(history.events))return history;
    for(const ev of history.events){
      if(!ev?.__lbgInheritedFromWholeGrade||ev?.gaSource!=='manual')continue;
      const prev=(ev.previousEvents||[]).filter(x=>x?.__lbgWholeGradeHistory&&normalizedGa(x?.ga)!==null);
      const candidates=[...new Set(prev.map(x=>expectedFromPrevious(ev.track,x,ev)).filter(x=>x!==null))];
      const current=normalizedGa(ev.ga);
      if(candidates.length!==1||current===null||candidates[0]===current)continue;
      ev.__lbgStaleGroupSplitManual=current;
      ev.ga=candidates[0];
      ev.gaSource='previous';
      ev.historyMismatch=false;
    }
    history.__lbgGroupSplitStaleRepair=VERSION;
    return history;
  }

  function wrapBuildHistory(original){
    if(typeof original!=='function')return null;
    const wrapped=function(...args){return repairHistory(original.apply(this,args))};
    wrapped.__lbgGroupSplitStaleRepair=VERSION;
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

  function promoteSafeLegacyConflicts(plan,values={}){
    const next={...plan,apply:[...(plan?.apply||[])],same:[...(plan?.same||[])],skipped:[...(plan?.skipped||[])],conflicts:[]};
    for(const conflict of plan?.conflicts||[]){
      if(conflict?.reason!=='existing-class-ga'){next.conflicts.push(conflict);continue}
      const exact=normalizedGa(rawValue(values,conflict?.target?.key));
      const common=normalizedGa(commonRaw(values,conflict?.target));
      const items=Array.isArray(conflict?.items)?conflict.items:[];
      const suggestions=[...new Set(items.map(x=>normalizedGa(x?.ga)).filter(x=>x!==null))];
      const stale=items.length>0&&items.every(x=>{
        const old=normalizedGa(x?.ev?.__lbgStaleGroupSplitManual);
        return x?.ev?.__lbgInheritedFromWholeGrade&&old!==null&&old===exact;
      });
      // Chỉ tự thay GA lớp cũ khi nó trùng đúng GA chung của địa điểm.
      // Nếu GA lớp khác GA chung, đó có thể là chỉnh riêng có chủ ý nên vẫn bảo vệ.
      if(stale&&exact!==null&&common===exact&&suggestions.length===1&&suggestions[0]!==exact){
        next.apply.push({target:conflict.target,ga:suggestions[0],items,replaceExisting:true,reason:'stale-whole-grade-split'});
      }else next.conflicts.push(conflict);
    }
    return next;
  }

  function applyPlanWithSafeLegacy(per,plan,values={}){
    const base={...(values&&typeof values==='object'?values:{})};
    for(const item of plan?.apply||[]){if(item?.replaceExisting&&item?.target?.key)delete base[item.target.key]}
    return per?.applyPlan?.(plan,base)||{values:base,applied:0,protectedCount:0};
  }

  function installOnce(){
    const v7=root.LBGGaSuggestionV7,per=root.LBGGaPerClassV2;
    if(!v7?.buildHistory||!per?.applyReport||!per?.analyzeReport||!per?.planApplications||!per?.applyPlan||!per?.loadStoredValues||!per?.persistStoredValues||!per?.decorateReport||!v7?.normalizeClass)return false;
    if(v7.buildHistory.__lbgGroupSplitStaleRepair!==VERSION){
      const wrappedHistory=wrapBuildHistory(v7.buildHistory);if(!wrappedHistory)return false;v7.buildHistory=wrappedHistory;
    }
    if(per.applyReport.__lbgGroupSplitStaleRepair!==VERSION){
      const originalApply=per.applyReport;
      const wrappedApply=async function(a){
        const{history,rows}=await per.analyzeReport(a),stored=per.loadStoredValues(a);
        const basic=per.planApplications(rows,a?.entries||[],stored,v7.normalizeClass);
        const plan=promoteSafeLegacyConflicts(basic,stored);
        const write=applyPlanWithSafeLegacy(per,plan,stored);
        if(write.applied){
          if(plan.apply.some(x=>x?.replaceExisting)&&typeof per.backupBeforeRepair==='function')per.backupBeforeRepair(a,stored,plan);
          per.persistStoredValues(a,write.values);
        }
        per.decorateReport(a,write.values);
        return{history,rows,plan,values:a.gaValues,applied:write.applied,protectedCount:write.protectedCount,same:plan.same.length,conflicts:plan.conflicts.length,skipped:plan.skipped.length};
      };
      wrappedApply.__lbgGroupSplitStaleRepair=VERSION;
      wrappedApply.__lbgOriginalApplyReport=originalApply;
      per.applyReport=wrappedApply;
    }
    return true;
  }
  function install(){let tries=0;const tick=()=>{tries++;if(installOnce())return;if(tries<400)setTimeout(tick,50)};tick();return true}

  return{VERSION,normalizedGa,expectedFromPrevious,repairHistory,wrapBuildHistory,promoteSafeLegacyConflicts,applyPlanWithSafeLegacy,install};
});
