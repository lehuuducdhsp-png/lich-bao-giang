'use strict';
(function(){
  const VERSION='20260909.2';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();

  function periodOf(entry){
    const rules=window.LBGReportPayRulesV1;
    const byRule=typeof rules?.reportPeriod==='function'?Number(rules.reportPeriod(entry)):NaN;
    if(Number.isFinite(byRule)&&byRule>=1&&byRule<=5)return byRule;
    const direct=Number(entry?.teachingPeriod);
    if(Number.isFinite(direct)&&direct>=1&&direct<=5)return direct;
    const m=txt(entry?.groupNote||entry?.classRaw||entry?.className).match(/\bTI[ẾE]T\s*([1-5])\b/i);
    if(m)return Number(m[1]);
    const slot=Number(entry?.slotPeriod??entry?.period);
    return Number.isFinite(slot)&&slot>=1&&slot<=5?slot:null;
  }

  function atomicDisplayEntries(entries,day,session,period){
    return (entries||[]).filter(entry=>
      Number(entry?.day)===Number(day)&&
      txt(entry?.session)===txt(session)&&
      periodOf(entry)===Number(period)
    );
  }

  function install(){
    const rules=window.LBGReportPayRulesV1;
    if(!rules)return false;
    if(!rules.displayTeachingEvents&&typeof rules.displayEntries==='function')rules.displayTeachingEvents=rules.displayEntries.bind(rules);
    rules.displayEntries=atomicDisplayEntries;
    rules.atomicDisplayEntries=atomicDisplayEntries;
    rules.displayMode='atomic-joined-by-ampersand';
    return true;
  }

  function boot(){
    if(install())return;
    let tries=0;
    const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},100);
  }

  window.LBGReportAtomicDisplayV1={version:VERSION,periodOf,atomicDisplayEntries,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
