'use strict';
(function(){
  const VERSION='20260909.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  let installed=false,observer=null;

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

  function polishHelp(){
    const help=document.querySelector('#preview .lbg-r4-help');
    if(!help)return;
    const desired='<b>Trường và điểm dạy được tách riêng theo TKB.</b> Lớp/nhóm có nhãn “- TIẾT N” được đặt đúng vào hàng Tiết N. Nếu cùng tiết có nhiều ô mã nguồn, các nội dung được giữ đủ và nối bằng dấu “ & ” để nhìn là đếm được số tiết; số GA vẫn theo sự kiện dạy thực tế và có thể chỉnh trực tiếp.';
    if(help.innerHTML!==desired)help.innerHTML=desired;
  }

  function install(){
    const rules=window.LBGReportPayRulesV1;
    if(!rules)return false;
    if(!rules.displayTeachingEvents&&typeof rules.displayEntries==='function')rules.displayTeachingEvents=rules.displayEntries.bind(rules);
    rules.displayEntries=atomicDisplayEntries;
    rules.atomicDisplayEntries=atomicDisplayEntries;
    rules.displayMode='atomic-joined-by-ampersand';
    installed=true;
    polishHelp();
    if(!observer){observer=new MutationObserver(polishHelp);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true})}
    return true;
  }

  function boot(){
    if(install())return;
    let tries=0;
    const timer=setInterval(()=>{tries++;if(install()||tries>200)clearInterval(timer)},50);
  }

  window.LBGReportAtomicDisplayV1={version:VERSION,periodOf,atomicDisplayEntries,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
